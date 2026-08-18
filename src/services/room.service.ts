import { prisma } from "@/lib/prisma";
import { RoomCreateInput, RoomUpdateInput } from "@/schemas/room.schema";

export class RoomService {
  /**
   * Lista todas as salas com filtros e equipamentos fixos
   */
  static async getRooms(params?: {
    search?: string;
    floor?: string;
    activeOnly?: boolean;
  }) {
    const { search, floor, activeOnly = false } = params || {};
    const where: any = {};

    if (activeOnly) {
      where.active = true;
    }

    if (floor && floor !== "ALL") {
      where.floor = floor;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { floor: { contains: search, mode: "insensitive" } },
        { block: { contains: search, mode: "insensitive" } },
        { fixedProjectorModel: { contains: search, mode: "insensitive" } },
      ];
    }

    return await prisma.room.findMany({
      where,
      include: {
        fixedEquipment: {
          include: {
            item: {
              select: { id: true, name: true, sku: true },
            },
            asset: {
              select: { id: true, assetTag: true, model: true, status: true },
            },
          },
        },
        currentAssets: {
          select: { id: true, assetTag: true, model: true, status: true },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: [{ floor: "asc" }, { name: "asc" }],
    });
  }

  /**
   * Obtém detalhes de uma sala por ID
   */
  static async getRoomById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        fixedEquipment: {
          include: {
            item: true,
            asset: true,
          },
        },
        currentAssets: true,
        requests: {
          take: 10,
          orderBy: { date: "desc" },
          include: {
            items: true,
          },
        },
      },
    });

    if (!room) {
      throw new Error("Sala não encontrada.");
    }

    return room;
  }

  /**
   * Cria uma nova sala com projetor fixo e equipamentos adicionais (validando patrimônio no estoque)
   */
  static async createRoom(data: RoomCreateInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findUnique({
        where: { name: data.name.trim() },
      });

      if (existing) {
        throw new Error(`Já existe uma sala cadastrada com o nome "${data.name.trim()}".`);
      }

      // Se forneceu fixedEquipment na criação, valida estoque de patrimônio
      if (data.fixedEquipment && data.fixedEquipment.length > 0) {
        for (const eq of data.fixedEquipment) {
          if (!eq.assetId) {
            throw new Error(`Todo equipamento fixo da sala precisa ter um patrimônio vinculado (${eq.label}).`);
          }
          const asset = await tx.asset.findUnique({ where: { id: eq.assetId } });
          if (!asset) {
            throw new Error(`Patrimônio com ID ${eq.assetId} não encontrado.`);
          }
          if (asset.status !== "AVAILABLE") {
            throw new Error(
              `O patrimônio #${asset.assetTag} (${asset.model || "Equipamento"}) não está disponível no estoque (Status atual: ${asset.status}).`
            );
          }
        }
      }

      const room = await tx.room.create({
        data: {
          name: data.name.trim(),
          floor: data.floor?.trim() || null,
          block: data.block?.trim() || null,
          active: data.active ?? true,
          fixedProjectorModel: data.fixedProjectorModel?.trim() || null,
          vgaCableOk: data.vgaCableOk ?? null,
          hdmiCableOk: data.hdmiCableOk ?? null,
          lampHours: data.lampHours ?? null,
          lampStatus: data.lampStatus?.trim() || null,
          lastVisitAt: data.lastVisitAt ? new Date(data.lastVisitAt) : null,
          fixedEquipment: data.fixedEquipment && data.fixedEquipment.length > 0
            ? {
                create: data.fixedEquipment.map((eq) => ({
                  itemId: eq.itemId || null,
                  assetId: eq.assetId || null,
                  label: eq.label.trim(),
                  status: eq.status?.trim() || null,
                  notes: eq.notes?.trim() || null,
                })),
              }
            : undefined,
        },
        include: {
          fixedEquipment: true,
        },
      });

      // Atualiza status dos patrimônios vinculados para IN_USE
      if (data.fixedEquipment && data.fixedEquipment.length > 0) {
        for (const eq of data.fixedEquipment) {
          if (eq.assetId) {
            await tx.asset.update({
              where: { id: eq.assetId },
              data: {
                status: "IN_USE",
                currentRoomId: room.id,
                currentBoxId: null,
              },
            });
          }
        }
      }

      let validAuditUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (u) validAuditUserId = u.id;
      }

      await tx.auditLog.create({
        data: {
          userId: validAuditUserId,
          action: "CREATE_ROOM",
          entity: "Room",
          entityId: room.id,
          details: { name: room.name, floor: room.floor },
        },
      });

      return room;
    });
  }

  /**
   * Atualiza dados de uma sala, projetor e lista de equipamentos fixos com validação de patrimônio
   */
  static async updateRoom(id: string, data: RoomUpdateInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id },
        include: { fixedEquipment: true },
      });
      if (!room) {
        throw new Error("Sala não encontrada.");
      }

      if (data.name && data.name.trim() !== room.name) {
        const conflict = await tx.room.findUnique({
          where: { name: data.name.trim() },
        });
        if (conflict && conflict.id !== id) {
          throw new Error(`Já existe outra sala com o nome "${data.name.trim()}".`);
        }
      }

      // Se forneceu fixedEquipment, sincroniza e valida patrimônios no estoque
      if (data.fixedEquipment !== undefined) {
        const previousAssetIds = room.fixedEquipment
          .map((fe) => fe.assetId)
          .filter(Boolean) as string[];

        const newAssetIds = data.fixedEquipment
          .map((fe) => fe.assetId)
          .filter(Boolean) as string[];

        // Valida se os novos patrimônios estão disponíveis no estoque
        for (const eq of data.fixedEquipment) {
          if (!eq.assetId) {
            throw new Error(`Todo equipamento fixo da sala precisa ter um patrimônio vinculado (${eq.label}).`);
          }
          const asset = await tx.asset.findUnique({ where: { id: eq.assetId } });
          if (!asset) {
            throw new Error(`Patrimônio com ID ${eq.assetId} não encontrado.`);
          }
          if (asset.status !== "AVAILABLE" && asset.currentRoomId !== id) {
            throw new Error(
              `O patrimônio #${asset.assetTag} (${asset.model || "Equipamento"}) não está disponível no estoque para alocação nesta sala (Status: ${asset.status}).`
            );
          }
        }

        // Libera patrimônios que foram desvinculados da sala
        const removedAssetIds = previousAssetIds.filter((oldId) => !newAssetIds.includes(oldId));
        if (removedAssetIds.length > 0) {
          await tx.asset.updateMany({
            where: { id: { in: removedAssetIds } },
            data: {
              status: "AVAILABLE",
              currentRoomId: null,
            },
          });
        }

        // Aloca novos patrimônios na sala (IN_USE)
        if (newAssetIds.length > 0) {
          await tx.asset.updateMany({
            where: { id: { in: newAssetIds } },
            data: {
              status: "IN_USE",
              currentRoomId: id,
              currentBoxId: null,
            },
          });
        }

        await tx.roomFixedEquipment.deleteMany({ where: { roomId: id } });
        if (data.fixedEquipment.length > 0) {
          await tx.roomFixedEquipment.createMany({
            data: data.fixedEquipment.map((eq) => ({
              roomId: id,
              itemId: eq.itemId || null,
              assetId: eq.assetId || null,
              label: eq.label.trim(),
              status: eq.status?.trim() || null,
              notes: eq.notes?.trim() || null,
            })),
          });
        }
      }

      const updated = await tx.room.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          floor: data.floor !== undefined ? (data.floor ? data.floor.trim() : null) : undefined,
          block: data.block !== undefined ? (data.block ? data.block.trim() : null) : undefined,
          active: data.active !== undefined ? data.active : undefined,
          fixedProjectorModel:
            data.fixedProjectorModel !== undefined
              ? (data.fixedProjectorModel ? data.fixedProjectorModel.trim() : null)
              : undefined,
          vgaCableOk: data.vgaCableOk !== undefined ? data.vgaCableOk : undefined,
          hdmiCableOk: data.hdmiCableOk !== undefined ? data.hdmiCableOk : undefined,
          lampHours: data.lampHours !== undefined ? data.lampHours : undefined,
          lampStatus:
            data.lampStatus !== undefined
              ? (data.lampStatus ? data.lampStatus.trim() : null)
              : undefined,
          lastVisitAt:
            data.lastVisitAt !== undefined
              ? (data.lastVisitAt ? new Date(data.lastVisitAt) : null)
              : undefined,
        },
        include: {
          fixedEquipment: true,
        },
      });

      let validAuditUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (u) validAuditUserId = u.id;
      }

      await tx.auditLog.create({
        data: {
          userId: validAuditUserId,
          action: "UPDATE_ROOM",
          entity: "Room",
          entityId: id,
          details: { name: updated.name, changes: data },
        },
      });

      return updated;
    });
  }

  /**
   * Desativa uma sala (Soft delete via active: false)
   */
  static async deactivateRoom(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id } });
      if (!room) {
        throw new Error("Sala não encontrada.");
      }

      const updated = await tx.room.update({
        where: { id },
        data: { active: false },
      });

      let validAuditUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (u) validAuditUserId = u.id;
      }

      await tx.auditLog.create({
        data: {
          userId: validAuditUserId,
          action: "DEACTIVATE_ROOM",
          entity: "Room",
          entityId: id,
          details: { name: room.name },
        },
      });

      return updated;
    });
  }
}
