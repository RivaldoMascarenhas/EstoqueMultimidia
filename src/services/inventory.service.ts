import { prisma } from "@/lib/prisma";
import { MovementType, ItemType, AssetStatus } from "@prisma/client";
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
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, boxId, itemType, statusFilter, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

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
      whereClause.OR = [
        {
          inventories: {
            some: {
              boxId: boxId,
              quantity: { gt: 0 },
            },
          },
        },
        {
          assets: {
            some: {
              currentBoxId: boxId,
              active: true,
            },
          },
        },
      ];
    }

    if (itemType) {
      whereClause.itemType = itemType;
    }

    // Note: statusFilter cannot be fully applied at DB level since it's computed,
    // so if statusFilter is active, we might need to fetch all matching the other clauses.
    // However, to prevent OOM, we will apply pagination anyway.
    const [totalCount, items] = await Promise.all([
      prisma.item.count({ where: whereClause }),
      prisma.item.findMany({
        where: whereClause,
        include: {
          category: true,
          inventories: {
            include: {
              box: { include: { door: true } },
            },
          },
          assets: {
            where: { active: true },
            include: {
              currentBox: { include: { door: true } },
            },
          },
        },
        orderBy: { name: "asc" },
        skip: statusFilter && statusFilter !== "ALL" ? undefined : skip,
        take: statusFilter && statusFilter !== "ALL" ? undefined : limit,
      }),
    ]);

    // Mapear itens com cálculos de quantidade total, caixas físicas efetivas e status
    const mappedItems = items.map((item) => {
      let totalQuantity = 0;
      let effectiveInventories: any[] = [...(item.inventories || [])];

      if (item.itemType === ItemType.MATERIAL) {
        totalQuantity = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      } else {
        // Para equipamentos patrimoniais, total de ativos ativos
        totalQuantity = item.assets.length;

        // Se não possui registro direto em Inventory, agrupar ativos por caixa física atual
        if (effectiveInventories.length === 0 && item.assets.length > 0) {
          const boxMap = new Map<string, { id: string; box: any; quantity: number }>();
          item.assets.forEach((ast) => {
            if (ast.currentBox) {
              const bId = ast.currentBox.id;
              const existing = boxMap.get(bId);
              if (existing) {
                existing.quantity += 1;
              } else {
                boxMap.set(bId, {
                  id: `asset-box-${ast.id}`,
                  box: ast.currentBox,
                  quantity: 1,
                });
              }
            }
          });
          effectiveInventories = Array.from(boxMap.values());
        }
      }

      let statusLevel: "NORMAL" | "LOW" | "CRITICAL" = "NORMAL";
      if (totalQuantity <= 0 || totalQuantity <= Math.floor(item.minStock / 2)) {
        statusLevel = "CRITICAL";
      } else if (totalQuantity <= item.minStock) {
        statusLevel = "LOW";
      }

      return {
        ...item,
        inventories: effectiveInventories,
        totalQuantity,
        statusLevel,
        isCritical: statusLevel === "CRITICAL",
        isLow: statusLevel === "LOW",
      };
    });

    if (statusFilter && statusFilter !== "ALL") {
      const filtered = mappedItems.filter((item) => item.statusLevel === statusFilter);
      return {
        items: filtered.slice(skip, skip + limit),
        totalCount: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      };
    }

    return {
      items: mappedItems,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
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

    let effectiveInventories: any[] = [...(item.inventories || [])];
    if (effectiveInventories.length === 0 && item.assets && item.assets.length > 0) {
      const boxMap = new Map<string, { id: string; box: any; quantity: number }>();
      item.assets.forEach((ast) => {
        if (ast.currentBox) {
          const bId = ast.currentBox.id;
          const existing = boxMap.get(bId);
          if (existing) {
            existing.quantity += 1;
          } else {
            boxMap.set(bId, {
              id: `asset-box-${ast.id}`,
              box: ast.currentBox,
              quantity: 1,
            });
          }
        }
      });
      effectiveInventories = Array.from(boxMap.values());
    }

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
      inventories: effectiveInventories,
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
   * Registra uma Saída / Baixa de Estoque com validação estrita anti-negativo e lock atômico
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

      // 2. ATOMIC LOCK: Decrementar saldo somente se quantity >= data.quantity
      const updateResult = await tx.inventory.updateMany({
        where: {
          id: inventory.id,
          quantity: { gte: data.quantity },
        },
        data: {
          quantity: { decrement: data.quantity },
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          `Saldo insuficiente na Caixa ${inventory.box.code}. O estoque disponível atual não suporta a retirada de ${data.quantity} ${inventory.item.unit}.`
        );
      }

      const balanceBefore = inventory.quantity;
      const balanceAfter = balanceBefore - data.quantity;

      // 3. Registrar movimentação inalterável
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

      // 4. Trilha de auditoria
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

      if (!sourceInv) {
        throw new Error("Saldo não encontrado na caixa de origem.");
      }

      // 2. ATOMIC LOCK: Decrementar da origem somente se quantity >= data.quantity
      const sourceUpdate = await tx.inventory.updateMany({
        where: {
          id: sourceInv.id,
          quantity: { gte: data.quantity },
        },
        data: {
          quantity: { decrement: data.quantity },
        },
      });

      if (sourceUpdate.count === 0) {
        throw new Error(
          `Saldo insuficiente para transferência na Caixa de origem. Solicitado: ${data.quantity} ${sourceInv.item.unit}.`
        );
      }

      const sourceBalanceAfter = sourceInv.quantity - data.quantity;

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
      let finalSku = data.sku ? data.sku.trim().toUpperCase() : "";
      if (!finalSku) {
        const prefix = data.itemType === ItemType.ASSET_EQUIPMENT ? "EQP" : "MAT";
        finalSku = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      // Verificar unicidade de SKU
      const existingSku = await tx.item.findUnique({
        where: { sku: finalSku },
      });

      if (existingSku) {
        throw new Error(`Já existe um item cadastrado com o SKU/Código '${finalSku}'.`);
      }

      const item = await tx.item.create({
        data: {
          name: data.name,
          sku: finalSku,
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

      // Se for um Equipamento Patrimonial e foi solicitada criação de lote ou tombamento individual
      if (item.itemType === ItemType.ASSET_EQUIPMENT) {
        const batchCount = data.batchQuantity || (data.initialQuantity && data.initialQuantity > 1 ? data.initialQuantity : 0);

        if (batchCount > 1) {
          // Geração em Lote
          const prefix = (data.tagPrefix || "PAT-").toUpperCase().trim();
          let tagsToCreate: string[] = [];

          if (data.startNumber !== undefined) {
            for (let i = 0; i < batchCount; i++) {
              const numStr = String(data.startNumber + i).padStart(6, "0");
              tagsToCreate.push(`${prefix}${numStr}`);
            }
          } else {
            const set = new Set<string>();
            while (set.size < batchCount) {
              const rand = Math.floor(100000 + Math.random() * 900000);
              set.add(`${prefix}${rand}`);
            }
            tagsToCreate = Array.from(set);
          }

          // Verificar duplicidades no banco
          const existing = await tx.asset.findMany({
            where: { assetTag: { in: tagsToCreate } },
            select: { assetTag: true },
          });

          if (existing.length > 0) {
            const dups = existing.map((e) => e.assetTag).join(", ");
            throw new Error(`As seguintes etiquetas de patrimônio já estão cadastradas: ${dups}`);
          }

          let boxInfo: any = null;
          if (data.initialBoxId) {
            boxInfo = await tx.box.findUnique({
              where: { id: data.initialBoxId },
              include: { door: true },
            });
          }
          const boxLocation = boxInfo
            ? `${boxInfo.name} (${boxInfo.door?.name || "Porta"})`
            : "Sem caixa atribuída";

          for (let i = 0; i < tagsToCreate.length; i++) {
            const tag = tagsToCreate[i];
            const asset = await tx.asset.create({
              data: {
                assetTag: tag,
                itemId: item.id,
                model: data.model?.trim() || item.model || null,
                currentBoxId: data.initialBoxId || null,
                status: AssetStatus.AVAILABLE,
                acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
                acquisitionValue: data.acquisitionValue !== undefined ? data.acquisitionValue : null,
                notes: data.notes?.trim() || `Cadastro inicial em lote (${i + 1}/${tagsToCreate.length})`,
              },
            });

            await tx.assetHistory.create({
              data: {
                assetId: asset.id,
                action: "CADASTRADO",
                fromStatus: null,
                toStatus: AssetStatus.AVAILABLE,
                fromLocation: null,
                toLocation: boxLocation,
                userId,
                userName: "Sistema",
                observation: `Equipamento ${item.name} (#${asset.assetTag}) cadastrado em lote inicial (${i + 1} de ${tagsToCreate.length}). Local: ${boxLocation}.`,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId,
              action: "CREATE_ASSET_BATCH",
              entity: "Asset",
              entityId: item.id,
              details: {
                count: tagsToCreate.length,
                itemName: item.name,
                prefix,
                firstTag: tagsToCreate[0],
                lastTag: tagsToCreate[tagsToCreate.length - 1],
              },
            },
          });
        } else if (data.assetTag && data.assetTag.trim()) {
          // Cadastro Individual
          const cleanTag = data.assetTag.toUpperCase().trim();

          const existingTag = await tx.asset.findUnique({
            where: { assetTag: cleanTag },
          });

          if (existingTag) {
            throw new Error(`Já existe um equipamento cadastrado com o número de patrimônio/tombamento '${cleanTag}'.`);
          }

          if (data.serialNumber && data.serialNumber.trim()) {
            const cleanSerial = data.serialNumber.trim();
            const existingSerial = await tx.asset.findFirst({
              where: { serialNumber: cleanSerial },
            });
            if (existingSerial) {
              throw new Error(`Já existe um equipamento cadastrado com o número de série '${cleanSerial}' (Patrimônio #${existingSerial.assetTag}).`);
            }
          }

          const asset = await tx.asset.create({
            data: {
              assetTag: cleanTag,
              itemId: item.id,
              serialNumber: data.serialNumber?.trim() || null,
              model: data.model?.trim() || item.model || null,
              currentBoxId: data.initialBoxId || null,
              status: AssetStatus.AVAILABLE,
              acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
              acquisitionValue: data.acquisitionValue !== undefined ? data.acquisitionValue : null,
              notes: data.notes?.trim() || null,
            },
            include: {
              currentBox: {
                include: { door: true },
              },
            },
          });

          const boxLocation = asset.currentBox
            ? `${asset.currentBox.name} (${asset.currentBox.door.name})`
            : "Sem caixa atribuída";

          await tx.assetHistory.create({
            data: {
              assetId: asset.id,
              action: "CADASTRADO",
              fromStatus: null,
              toStatus: AssetStatus.AVAILABLE,
              fromLocation: null,
              toLocation: boxLocation,
              userId,
              userName: "Sistema",
              observation: `Equipamento ${item.name} (#${asset.assetTag}) cadastrado e tombado no acervo do Suporte de TI da UniFAP. Local inicial: ${boxLocation}.`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId,
              action: "CREATE_ASSET",
              entity: "Asset",
              entityId: asset.id,
              details: {
                assetTag: asset.assetTag,
                item: item.name,
                serial: asset.serialNumber,
                box: asset.currentBox?.code,
              },
            },
          });
        }
      } else if (data.initialBoxId && data.initialQuantity && data.initialQuantity > 0) {
        // Se for Material em quantidade
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
