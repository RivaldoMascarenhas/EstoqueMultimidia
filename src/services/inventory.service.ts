import { prisma } from "@/lib/prisma";
import { MovementType, ItemType } from "@prisma/client";
import { StockEntryInput, StockExitInput, StockTransferInput, ItemCreateInput } from "@/schemas/inventory.schema";

export class InventoryService {
  /**
   * Lista todos os itens do catálogo com total calculado e status de estoque
   */
  static async getItems(params?: {
    search?: string;
    categoryId?: string;
    boxId?: string;
    itemType?: ItemType;
    statusFilter?: "ALL" | "CRITICAL" | "LOW" | "NORMAL";
  }) {
    const { search, categoryId, boxId, itemType, statusFilter } = params || {};

    const whereClause: any = {
      active: true,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId && categoryId !== "ALL") {
      whereClause.categoryId = categoryId;
    }

    if (boxId && boxId !== "ALL") {
      whereClause.inventories = {
        some: {
          boxId: boxId,
          quantity: { gt: 0 },
        },
      };
    }

    if (itemType) {
      whereClause.itemType = itemType;
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        category: true,
        inventories: {
          include: {
            box: {
              include: {
                door: true,
              },
            },
          },
        },
        assets: {
          where: { active: true },
          include: {
            currentBox: {
              include: {
                door: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Mapear itens com cálculos de quantidade total e status
    const mappedItems = items.map((item) => {
      let totalQuantity = 0;

      if (item.itemType === ItemType.MATERIAL) {
        totalQuantity = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      } else {
        // Para equipamentos patrimoniais, total de ativos ativos
        totalQuantity = item.assets.length;
      }

      let statusLevel: "NORMAL" | "LOW" | "CRITICAL" = "NORMAL";
      if (totalQuantity <= 0 || totalQuantity <= Math.floor(item.minStock / 2)) {
        statusLevel = "CRITICAL";
      } else if (totalQuantity <= item.minStock) {
        statusLevel = "LOW";
      }

      return {
        ...item,
        totalQuantity,
        statusLevel,
        isCritical: statusLevel === "CRITICAL",
        isLow: statusLevel === "LOW",
      };
    });

    if (statusFilter && statusFilter !== "ALL") {
      return mappedItems.filter((item) => item.statusLevel === statusFilter);
    }

    return mappedItems;
  }

  /**
   * Busca detalhes completos de um item por ID
   */
  static async getItemById(id: string) {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        inventories: {
          include: {
            box: {
              include: {
                door: true,
              },
            },
          },
          orderBy: { quantity: "desc" },
        },
        assets: {
          include: {
            currentBox: {
              include: {
                door: true,
              },
            },
            loans: {
              orderBy: { createdAt: "desc" },
              take: 3,
            },
            maintenances: {
              orderBy: { createdAt: "desc" },
              take: 3,
            },
          },
          orderBy: { assetTag: "asc" },
        },
        movements: {
          include: {
            user: { select: { name: true, email: true } },
            sourceBox: { select: { code: true, name: true } },
            destBox: { select: { code: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!item) return null;

    const totalQuantity =
      item.itemType === ItemType.MATERIAL
        ? item.inventories.reduce((acc, inv) => acc + inv.quantity, 0)
        : item.assets.length;

    let statusLevel: "NORMAL" | "LOW" | "CRITICAL" = "NORMAL";
    if (totalQuantity <= 0 || totalQuantity <= Math.floor(item.minStock / 2)) {
      statusLevel = "CRITICAL";
    } else if (totalQuantity <= item.minStock) {
      statusLevel = "LOW";
    }

    return {
      ...item,
      totalQuantity,
      statusLevel,
    };
  }

  /**
   * Registra uma Entrada de Estoque com transação atômica
   */
  static async registerEntry(data: StockEntryInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar se o item existe
      const item = await tx.item.findUnique({
        where: { id: data.itemId },
      });

      if (!item) {
        throw new Error("Item não encontrado.");
      }

      // 2. Buscar ou criar o registro de inventário para a caixa especificada
      const inventory = await tx.inventory.findUnique({
        where: {
          itemId_boxId: {
            itemId: data.itemId,
            boxId: data.boxId,
          },
        },
      });

      const balanceBefore = inventory ? inventory.quantity : 0;
      const balanceAfter = balanceBefore + data.quantity;

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: balanceAfter },
        });
      } else {
        await tx.inventory.create({
          data: {
            itemId: data.itemId,
            boxId: data.boxId,
            quantity: data.quantity,
          },
        });
      }

      // 3. Registrar movimentação inalterável
      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.ENTRY,
          itemId: data.itemId,
          destBoxId: data.boxId,
          quantity: data.quantity,
          balanceBefore,
          balanceAfter,
          observation: data.observation || "Entrada de estoque realizada no setor",
          userId,
        },
        include: {
          item: true,
          destBox: true,
          user: { select: { name: true, email: true } },
        },
      });

      // 4. Trilha de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_ENTRY",
          entity: "Inventory",
          entityId: data.itemId,
          details: {
            item: item.name,
            boxId: data.boxId,
            quantityAdded: data.quantity,
            newBalance: balanceAfter,
          },
        },
      });

      return movement;
    });
  }

  /**
   * Registra uma Saída / Baixa de Estoque com validação estrita anti-negativo
   */
  static async registerExit(data: StockExitInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar inventário na caixa de origem
      const inventory = await tx.inventory.findUnique({
        where: {
          itemId_boxId: {
            itemId: data.itemId,
            boxId: data.boxId,
          },
        },
        include: {
          item: true,
          box: true,
        },
      });

      if (!inventory) {
        throw new Error("Este item não possui estoque registrado na caixa informada.");
      }

      // 2. REGRA CRÍTICA: Impedir estoque negativo
      if (inventory.quantity < data.quantity) {
        throw new Error(
          `Saldo insuficiente na Caixa ${inventory.box.code}. Disponível: ${inventory.quantity} ${inventory.item.unit}, Solicitado: ${data.quantity} ${inventory.item.unit}.`
        );
      }

      const balanceBefore = inventory.quantity;
      const balanceAfter = balanceBefore - data.quantity;

      // 3. Atualizar quantidade na caixa
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: balanceAfter },
      });

      // 4. Registrar movimentação inalterável
      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.EXIT,
          itemId: data.itemId,
          sourceBoxId: data.boxId,
          quantity: data.quantity,
          balanceBefore,
          balanceAfter,
          observation: data.observation,
          userId,
        },
        include: {
          item: true,
          sourceBox: true,
          user: { select: { name: true, email: true } },
        },
      });

      // 5. Trilha de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_EXIT",
          entity: "Inventory",
          entityId: data.itemId,
          details: {
            item: inventory.item.name,
            box: inventory.box.code,
            quantityRemoved: data.quantity,
            newBalance: balanceAfter,
            reason: data.observation,
          },
        },
      });

      return movement;
    });
  }

  /**
   * Registra uma Transferência entre Caixas com atomicidade
   */
  static async registerTransfer(data: StockTransferInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar estoque na caixa de origem
      const sourceInv = await tx.inventory.findUnique({
        where: {
          itemId_boxId: {
            itemId: data.itemId,
            boxId: data.sourceBoxId,
          },
        },
        include: {
          item: true,
          box: true,
        },
      });

      if (!sourceInv || sourceInv.quantity < data.quantity) {
        const available = sourceInv ? sourceInv.quantity : 0;
        throw new Error(
          `Saldo insuficiente para transferência na Caixa de origem. Disponível: ${available}, Solicitado: ${data.quantity}.`
        );
      }

      // 2. Decrementar da origem
      const sourceBalanceAfter = sourceInv.quantity - data.quantity;
      await tx.inventory.update({
        where: { id: sourceInv.id },
        data: { quantity: sourceBalanceAfter },
      });

      // 3. Incrementar ou criar no destino
      const destInv = await tx.inventory.findUnique({
        where: {
          itemId_boxId: {
            itemId: data.itemId,
            boxId: data.destinationBoxId,
          },
        },
      });

      const destBalanceBefore = destInv ? destInv.quantity : 0;
      const destBalanceAfter = destBalanceBefore + data.quantity;

      if (destInv) {
        await tx.inventory.update({
          where: { id: destInv.id },
          data: { quantity: destBalanceAfter },
        });
      } else {
        await tx.inventory.create({
          data: {
            itemId: data.itemId,
            boxId: data.destinationBoxId,
            quantity: data.quantity,
          },
        });
      }

      // 4. Registrar movimentação de transferência
      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.TRANSFER,
          itemId: data.itemId,
          sourceBoxId: data.sourceBoxId,
          destBoxId: data.destinationBoxId,
          quantity: data.quantity,
          balanceBefore: sourceInv.quantity,
          balanceAfter: sourceBalanceAfter,
          observation: data.observation || "Transferência física entre caixas do armário",
          userId,
        },
        include: {
          item: true,
          sourceBox: true,
          destBox: true,
          user: { select: { name: true, email: true } },
        },
      });

      // 5. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_TRANSFER",
          entity: "Inventory",
          entityId: data.itemId,
          details: {
            item: sourceInv.item.name,
            fromBoxId: data.sourceBoxId,
            toBoxId: data.destinationBoxId,
            quantity: data.quantity,
          },
        },
      });

      return movement;
    });
  }

  /**
   * Cadastra um novo Item no catálogo
   */
  static async createItem(data: ItemCreateInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Verificar unicidade de SKU
      const existingSku = await tx.item.findUnique({
        where: { sku: data.sku },
      });

      if (existingSku) {
        throw new Error(`Já existe um item cadastrado com o SKU/Código '${data.sku}'.`);
      }

      const item = await tx.item.create({
        data: {
          name: data.name,
          sku: data.sku,
          categoryId: data.categoryId,
          itemType: data.itemType,
          unit: data.unit,
          description: data.description,
          minStock: data.minStock,
          idealStock: data.idealStock,
          manufacturer: data.manufacturer,
          model: data.model,
          notes: data.notes,
        },
        include: {
          category: true,
        },
      });

      // Se foi informada uma caixa inicial e quantidade > 0
      if (data.initialBoxId && data.initialQuantity && data.initialQuantity > 0) {
        await tx.inventory.create({
          data: {
            itemId: item.id,
            boxId: data.initialBoxId,
            quantity: data.initialQuantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: MovementType.ENTRY,
            itemId: item.id,
            destBoxId: data.initialBoxId,
            quantity: data.initialQuantity,
            balanceBefore: 0,
            balanceAfter: data.initialQuantity,
            observation: "Estoque inicial no cadastro do item",
            userId,
          },
        });
      }

      // Trilha de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE_ITEM",
          entity: "Item",
          entityId: item.id,
          details: {
            name: item.name,
            sku: item.sku,
            category: item.category.name,
          },
        },
      });

      return item;
    });
  }

  /**
   * Retorna todas as categorias ativas
   */
  static async getCategories() {
    return await prisma.category.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Cria uma nova categoria
   */
  static async createCategory(name: string, description?: string) {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    return await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slug || `cat-${Date.now()}`,
        description: description?.trim() || null,
        active: true,
      },
    });
  }
}
