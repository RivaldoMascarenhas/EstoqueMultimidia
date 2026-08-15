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

    if (!box) return null;

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
   * Cria uma nova caixa no armário
   */
  static async createBox(data: BoxCreateInput, userId: string) {
    const cleanCode = data.code.toUpperCase().trim();

    const existing = await prisma.box.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
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
}
