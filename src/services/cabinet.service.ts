import { prisma } from "@/lib/prisma";
import { BoxCreateInput, DoorCreateInput } from "@/schemas/cabinet.schema";

export class CabinetService {
  /**
   * Retorna todas as portas ativas e suas caixas com resumo de itens armazenados
   */
  static async getDoorsWithBoxes() {
    const doors = await prisma.door.findMany({
      where: { active: true },
      include: {
        boxes: {
          where: { active: true },
          include: {
            inventories: {
              where: { quantity: { gt: 0 } },
              include: {
                item: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            assets: {
              where: { active: true },
              include: {
                item: true,
              },
            },
          },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Mapear portas com métricas calculadas
    return doors.map((door) => {
      const totalBoxes = door.boxes.length;
      const totalStoredItems = door.boxes.reduce((acc, box) => {
        const materialCount = box.inventories.reduce((mAcc, inv) => mAcc + inv.quantity, 0);
        const assetCount = box.assets.length;
        return acc + materialCount + assetCount;
      }, 0);

      const boxesWithMetrics = door.boxes.map((box) => {
        const totalItemsInBox =
          box.inventories.reduce((acc, inv) => acc + inv.quantity, 0) +
          box.assets.length;

        return {
          ...box,
          totalItemsInBox,
          isEmpty: totalItemsInBox === 0,
        };
      });

      return {
        ...door,
        totalBoxes,
        totalStoredItems,
        boxes: boxesWithMetrics,
      };
    });
  }

  /**
   * Busca os detalhes completos de uma caixa pelo seu código único (ex: 'C017')
   */
  static async getBoxByCode(code: string) {
    const cleanCode = code.toUpperCase().trim();

    const box = await prisma.box.findUnique({
      where: { code: cleanCode },
      include: {
        door: true,
        inventories: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { quantity: "desc" },
        },
        assets: {
          where: { active: true },
          include: {
            item: {
              include: {
                category: true,
              },
            },
            loans: {
              where: { status: "ACTIVE" },
              take: 1,
            },
          },
          orderBy: { assetTag: "asc" },
        },
        destMovements: {
          include: {
            item: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        sourceMovements: {
          include: {
            item: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!box || !box.active) return null;

    const totalQuantity =
      box.inventories.reduce((acc, inv) => acc + inv.quantity, 0) +
      box.assets.length;

    return {
      ...box,
      totalQuantity,
      isEmpty: totalQuantity === 0,
    };
  }

  /**
   * Retorna uma lista simples de todas as caixas para preenchimento de Dropdowns/Selects
   */
  static async getAllBoxes() {
    return await prisma.box.findMany({
      where: { active: true },
      include: {
        door: {
          select: { name: true, code: true },
        },
      },
      orderBy: [{ door: { orderIndex: "asc" } }, { code: "asc" }],
    });
  }

  /**
   * Retorna todas as portas ativas simples para selects
   */
  static async getAllDoors() {
    return await prisma.door.findMany({
      where: { active: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  /**
   * Cria uma nova porta no armário
   */
  static async createDoor(data: DoorCreateInput, userId: string) {
    const cleanCode = data.code.toUpperCase().trim();

    const existing = await prisma.door.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw new Error(`Já existe uma porta com o código '${cleanCode}'.`);
    }

    const door = await prisma.door.create({
      data: {
        code: cleanCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        orderIndex: data.orderIndex || 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE_DOOR",
        entity: "Door",
        entityId: door.id,
        details: { code: door.code, name: door.name },
      },
    });

    return door;
  }

  /**
   * Cria uma nova caixa no armário (ou reativa caso tenha sido desativada anteriormente)
   */
  static async createBox(data: BoxCreateInput, userId: string) {
    const cleanCode = data.code.toUpperCase().trim();

    const existing = await prisma.box.findUnique({
      where: { code: cleanCode },
      include: { door: true },
    });

    if (existing) {
      if (!existing.active) {
        // Reativação de caixa arquivada
        const reactivated = await prisma.box.update({
          where: { id: existing.id },
          data: {
            name: data.name.trim(),
            doorId: data.doorId,
            description: data.description?.trim() || null,
            active: true,
          },
          include: { door: true },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            action: "RESTORE_BOX",
            entity: "Box",
            entityId: reactivated.id,
            details: { code: reactivated.code, name: reactivated.name, door: reactivated.door.name },
          },
        });

        return reactivated;
      }

      throw new Error(`Já existe uma caixa cadastrada com o código '${cleanCode}'.`);
    }

    const box = await prisma.box.create({
      data: {
        code: cleanCode,
        name: data.name.trim(),
        doorId: data.doorId,
        description: data.description?.trim() || null,
      },
      include: {
        door: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE_BOX",
        entity: "Box",
        entityId: box.id,
        details: { code: box.code, name: box.name, door: box.door.name },
      },
    });

    return box;
  }

  /**
   * Exclui uma caixa do armário.
   * Regra de negócio estrita:
   * - A caixa NÃO pode conter itens com saldo > 0.
   * - A caixa NÃO pode conter patrimônios/ativos ativos alocados.
   * - Caso não haja histórico de movimentações ou empréstimos, efetua hard delete.
   * - Caso haja registros históricos associados, efetua soft delete (active: false) para manter integridade relacional.
   */
  static async deleteBox(codeOrId: string, userId: string) {
    const clean = codeOrId.toUpperCase().trim();

    return await prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: {
          OR: [{ code: clean }, { id: codeOrId }],
          active: true,
        },
        include: {
          door: true,
          inventories: {
            where: { quantity: { gt: 0 } },
          },
          assets: {
            where: { active: true },
          },
        },
      });

      if (!box) {
        throw new Error(`Caixa '${codeOrId}' não encontrada ou já desativada.`);
      }

      const totalItems = box.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      if (totalItems > 0) {
        throw new Error(
          `Não é possível excluir a caixa '${box.code}' pois ela ainda contém ${totalItems} item(ns) em estoque. Transfira ou retire os itens antes de excluir.`
        );
      }

      if (box.assets.length > 0) {
        throw new Error(
          `Não é possível excluir a caixa '${box.code}' pois ela ainda possui ${box.assets.length} equipamento(s)/patrimônio(s) alocado(s). Remova ou realoque os equipamentos antes de excluir.`
        );
      }

      // Checa vínculos históricos
      const [movementsCount, loansCount] = await Promise.all([
        tx.stockMovement.count({
          where: { OR: [{ sourceBoxId: box.id }, { destBoxId: box.id }] },
        }),
        tx.loan.count({
          where: { returnBoxId: box.id },
        }),
      ]);

      let hardDeleted = false;
      if (movementsCount === 0 && loansCount === 0) {
        // Sem movimentações nem empréstimos históricos: limpeza de inventários zerados e hard delete
        await tx.inventory.deleteMany({ where: { boxId: box.id } });
        await tx.box.delete({ where: { id: box.id } });
        hardDeleted = true;
      } else {
        // Com histórico prévio: soft delete para manter integridade referencial
        await tx.box.update({
          where: { id: box.id },
          data: { active: false },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE_BOX",
          entity: "Box",
          entityId: box.id,
          details: {
            code: box.code,
            name: box.name,
            doorId: box.doorId,
            doorName: box.door?.name,
            hardDeleted,
          },
        },
      });

      return {
        id: box.id,
        code: box.code,
        name: box.name,
        hardDeleted,
      };
    });
  }
}
