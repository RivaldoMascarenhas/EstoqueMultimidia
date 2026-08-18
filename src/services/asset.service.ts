import { prisma } from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";
import { AssetCreateInput, AssetStatusUpdateInput } from "@/schemas/asset.schema";

export class AssetService {
  /**
   * Lista todos os ativos com filtros avançados
   */
  static async getAssets(params?: {
    search?: string;
    status?: AssetStatus | "ALL";
    categoryId?: string;
    boxId?: string;
  }) {
    const { search, status, categoryId, boxId } = params || {};

    const whereClause: any = {
      active: true,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (boxId && boxId !== "ALL") {
      whereClause.currentBoxId = boxId;
    }

    if (categoryId && categoryId !== "ALL") {
      whereClause.item = {
        categoryId,
      };
    }

    if (search) {
      whereClause.OR = [
        { assetTag: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { item: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        item: {
          include: {
            category: true,
          },
        },
        currentBox: {
          include: {
            door: true,
          },
        },
        currentRoom: true,
        loans: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          include: {
            createdByUser: { select: { name: true } },
          },
          orderBy: { expectedReturnDate: "asc" },
          take: 1,
        },
        reservations: {
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
          include: {
            request: {
              include: {
                room: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
          take: 1,
        },
        maintenances: {
          where: { status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] } },
          include: {
            createdByUser: { select: { name: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { assetTag: "asc" }],
    });

    return assets;
  }

  /**
   * Busca detalhes completos do ativo por ID ou Tag
   */
  static async getAssetByIdOrTag(identifier: string) {
    const isId = identifier.length > 20; // IDs Prisma têm ~25 chars

    const whereClause = isId
      ? { id: identifier }
      : { assetTag: identifier.toUpperCase().trim() };

    const asset = await prisma.asset.findFirst({
      where: {
        ...whereClause,
        active: true,
      },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        currentBox: {
          include: {
            door: true,
          },
        },
        currentRoom: true,
        loans: {
          include: {
            createdByUser: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        reservations: {
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
          include: {
            request: {
              include: {
                room: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
          take: 5,
        },
        maintenances: {
          include: {
            createdByUser: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return asset;
  }

  /**
   * Cadastra um novo equipamento patrimonial
   */
  static async createAsset(data: AssetCreateInput, userId: string, userName?: string) {
    const cleanTag = data.assetTag.toUpperCase().trim();

    // 1. Verificar unicidade de Patrimônio
    const existingTag = await prisma.asset.findUnique({
      where: { assetTag: cleanTag },
    });

    if (existingTag) {
      throw new Error(`Já existe um equipamento cadastrado com o número de patrimônio '${cleanTag}'.`);
    }

    // 2. Verificar número de série se informado
    if (data.serialNumber && data.serialNumber.trim()) {
      const cleanSerial = data.serialNumber.trim();
      const existingSerial = await prisma.asset.findFirst({
        where: { serialNumber: cleanSerial },
      });
      if (existingSerial) {
        throw new Error(`Já existe um equipamento cadastrado com o número de série '${cleanSerial}' (Patrimônio #${existingSerial.assetTag}).`);
      }
    }

    const rawDate = data.acquisitionDate || data.purchaseDate;
    const rawValue = data.acquisitionValue !== undefined ? data.acquisitionValue : data.purchaseValue;

    return await prisma.$transaction(async (tx) => {
      // Criar o ativo
      const asset = await tx.asset.create({
        data: {
          assetTag: cleanTag,
          itemId: data.itemId,
          serialNumber: data.serialNumber?.trim() || null,
          model: data.model?.trim() || null,
          currentBoxId: data.currentBoxId || null,
          status: AssetStatus.AVAILABLE,
          acquisitionDate: rawDate ? new Date(rawDate) : null,
          acquisitionValue: rawValue !== undefined && rawValue !== null ? rawValue : null,
          notes: data.notes?.trim() || null,
        },
        include: {
          item: true,
          currentBox: {
            include: { door: true },
          },
        },
      });

      const boxLocation = asset.currentBox
        ? `${asset.currentBox.name} (${asset.currentBox.door.name})`
        : "Sem caixa atribuída";

      // Criar primeiro registro na Linha do Tempo (AssetHistory)
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: "CADASTRADO",
          fromStatus: null,
          toStatus: AssetStatus.AVAILABLE,
          fromLocation: null,
          toLocation: boxLocation,
          userId,
          userName: userName || "Admin",
          observation: `Equipamento ${asset.item.name} (#${asset.assetTag}) cadastrado no acervo do Suporte de TI da UniFAP. Local inicial: ${boxLocation}.`,
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE_ASSET",
          entity: "Asset",
          entityId: asset.id,
          details: {
            assetTag: asset.assetTag,
            item: asset.item.name,
            serial: asset.serialNumber,
            box: asset.currentBox?.code,
          },
        },
      });

      return asset;
    });
  }

  /**
   * Atualiza o status do ativo com justificativa e histórico
   */
  static async updateAssetStatus(
    id: string,
    data: AssetStatusUpdateInput,
    userId: string,
    userName?: string
  ) {
    // Normalizar status
    let mappedStatus: AssetStatus = AssetStatus.AVAILABLE;
    if (data.status === "MAINTENANCE" || data.status === "IN_MAINTENANCE") {
      mappedStatus = AssetStatus.IN_MAINTENANCE;
    } else if (data.status === "RETIRED" || data.status === "WRITTEN_OFF") {
      mappedStatus = AssetStatus.WRITTEN_OFF;
    } else if (data.status === "LOANED") {
      mappedStatus = AssetStatus.LOANED;
    } else if (data.status === "DAMAGED") {
      mappedStatus = AssetStatus.DAMAGED;
    } else if (data.status === "LOST") {
      mappedStatus = AssetStatus.LOST;
    }

    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id },
        include: {
          item: true,
          currentBox: { include: { door: true } },
          loans: { where: { status: "ACTIVE" } },
        },
      });

      if (!asset) {
        throw new Error("Equipamento não encontrado.");
      }

      // Regra de validação: Se estiver com empréstimo ativo, não pode alterar para AVAILABLE diretamente
      if (asset.status === AssetStatus.LOANED && mappedStatus === AssetStatus.AVAILABLE && asset.loans.length > 0) {
        throw new Error(
          "Este equipamento possui um empréstimo ativo. Realize a devolução formal no módulo de Empréstimos para liberá-lo."
        );
      }

      const prevStatus = asset.status;

      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          status: mappedStatus,
          currentBoxId: data.currentBoxId !== undefined ? data.currentBoxId : asset.currentBoxId,
        },
        include: {
          item: true,
          currentBox: { include: { door: true } },
        },
      });

      const boxLocation = updatedAsset.currentBox
        ? `${updatedAsset.currentBox.name} (${updatedAsset.currentBox.door.name})`
        : "Sem caixa atribuída";

      // Registrar evento no histórico
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: `ALTERAÇÃO DE STATUS (${prevStatus} ➔ ${mappedStatus})`,
          fromStatus: prevStatus,
          toStatus: mappedStatus,
          fromLocation: asset.currentBox ? `${asset.currentBox.name} (${asset.currentBox.door.name})` : null,
          toLocation: boxLocation,
          userId,
          userName: userName || "Operador",
          observation: data.reason,
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE_ASSET_STATUS",
          entity: "Asset",
          entityId: id,
          details: {
            assetTag: asset.assetTag,
            oldStatus: prevStatus,
            newStatus: mappedStatus,
            reason: data.reason,
          },
        },
      });

      return updatedAsset;
    });
  }

  /**
   * Métricas gerais de patrimônio para KPIs
   */
  static async getAssetMetrics() {
    const [total, available, loaned, maintenance, damaged] = await Promise.all([
      prisma.asset.count({ where: { active: true } }),
      prisma.asset.count({ where: { active: true, status: AssetStatus.AVAILABLE } }),
      prisma.asset.count({ where: { active: true, status: AssetStatus.LOANED } }),
      prisma.asset.count({ where: { active: true, status: AssetStatus.IN_MAINTENANCE } }),
      prisma.asset.count({ where: { active: true, status: AssetStatus.DAMAGED } }),
    ]);

    return {
      total,
      available,
      loaned,
      maintenance,
      damaged,
    };
  }
}
