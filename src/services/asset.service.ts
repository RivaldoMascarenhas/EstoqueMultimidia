import { prisma } from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";
import {
  AssetCreateInput,
  AssetBatchCreateInput,
  AssetStatusUpdateInput,
  AssetUpdateInput,
  AssetDeleteInput,
} from "@/schemas/asset.schema";

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
   * Cadastra múltiplos equipamentos patrimoniais em lote (ex: 50 computadores Dell)
   */
  static async createBatchAssets(data: AssetBatchCreateInput, userId: string, userName?: string) {
    const quantity = data.quantity || 1;
    const prefix = (data.tagPrefix || "PAT-").toUpperCase().trim();

    // 1. Gerar ou validar as tags patrimoniais
    let tagsToCreate: string[] = [];

    if (data.tags && data.tags.length > 0) {
      tagsToCreate = data.tags.map((t) => t.toUpperCase().trim());
    } else if (data.startNumber !== undefined) {
      for (let i = 0; i < quantity; i++) {
        const numStr = String(data.startNumber + i).padStart(6, "0");
        tagsToCreate.push(`${prefix}${numStr}`);
      }
    } else {
      // Gerar aleatórios únicos
      const set = new Set<string>();
      while (set.size < quantity) {
        const rand = Math.floor(100000 + Math.random() * 900000);
        set.add(`${prefix}${rand}`);
      }
      tagsToCreate = Array.from(set);
    }

    // 2. Verificar duplicidades no banco
    const existing = await prisma.asset.findMany({
      where: {
        assetTag: { in: tagsToCreate },
      },
      select: { assetTag: true },
    });

    if (existing.length > 0) {
      const dups = existing.map((e) => e.assetTag).join(", ");
      throw new Error(`As seguintes etiquetas de patrimônio já estão cadastradas no sistema: ${dups}`);
    }

    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
      include: { category: true },
    });

    if (!item) {
      throw new Error("Item de catálogo selecionado não foi encontrado.");
    }

    let boxInfo: any = null;
    if (data.currentBoxId) {
      boxInfo = await prisma.box.findUnique({
        where: { id: data.currentBoxId },
        include: { door: true },
      });
    }

    const boxLocation = boxInfo
      ? `${boxInfo.name} (${boxInfo.door?.name || "Porta"})`
      : "Sem caixa atribuída";

    const rawDate = data.acquisitionDate || data.purchaseDate;
    const rawValue = data.acquisitionValue !== undefined ? data.acquisitionValue : data.purchaseValue;

    // 3. Executar transação de inserção em massa
    return await prisma.$transaction(async (tx) => {
      const createdAssets = [];

      for (let i = 0; i < tagsToCreate.length; i++) {
        const tag = tagsToCreate[i];
        const asset = await tx.asset.create({
          data: {
            assetTag: tag,
            itemId: data.itemId,
            model: data.model?.trim() || null,
            currentBoxId: data.currentBoxId || null,
            status: AssetStatus.AVAILABLE,
            acquisitionDate: rawDate ? new Date(rawDate) : null,
            acquisitionValue: rawValue !== undefined && rawValue !== null ? rawValue : null,
            notes: data.notes?.trim() || `Cadastro em lote (${i + 1}/${tagsToCreate.length})`,
          },
        });

        // Histórico
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
            observation: `Equipamento ${item.name} (#${asset.assetTag}) cadastrado em lote no acervo de TI (${i + 1} de ${tagsToCreate.length}). Local: ${boxLocation}.`,
          },
        });

        createdAssets.push(asset);
      }

      // Registro de Auditoria do Lote
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE_ASSET_BATCH",
          entity: "Asset",
          entityId: createdAssets[0]?.id || "batch",
          details: {
            count: createdAssets.length,
            itemName: item.name,
            prefix,
            firstTag: tagsToCreate[0],
            lastTag: tagsToCreate[tagsToCreate.length - 1],
            box: boxInfo?.code,
          },
        },
      });

      return {
        count: createdAssets.length,
        firstTag: tagsToCreate[0],
        lastTag: tagsToCreate[tagsToCreate.length - 1],
        assets: createdAssets,
      };
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
   * Atualiza dados de um patrimônio com auditoria detalhada de alterações
   */
  static async updateAsset(
    id: string,
    data: AssetUpdateInput,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id },
        include: {
          item: true,
          currentBox: { include: { door: true } },
        },
      });

      if (!asset) {
        throw new Error("Equipamento patrimonial não encontrado.");
      }

      // 1. Validar unicidade da tag se for alterada
      if (data.assetTag && data.assetTag.toUpperCase().trim() !== asset.assetTag) {
        const cleanTag = data.assetTag.toUpperCase().trim();
        const conflict = await tx.asset.findUnique({
          where: { assetTag: cleanTag },
        });
        if (conflict && conflict.id !== id) {
          throw new Error(`Já existe outro equipamento cadastrado com o patrimônio '${cleanTag}'.`);
        }
      }

      // 2. Validar unicidade do serial se for alterado
      if (data.serialNumber && data.serialNumber.trim() !== (asset.serialNumber || "")) {
        const cleanSerial = data.serialNumber.trim();
        const conflict = await tx.asset.findFirst({
          where: { serialNumber: cleanSerial },
        });
        if (conflict && conflict.id !== id) {
          throw new Error(`Já existe outro equipamento com o número de série '${cleanSerial}' (Patrimônio #${conflict.assetTag}).`);
        }
      }

      // 3. Obter novo item se alterado
      let newItem: any = asset.item;
      if (data.itemId && data.itemId !== asset.itemId) {
        newItem = await tx.item.findUnique({ where: { id: data.itemId } });
        if (!newItem) {
          throw new Error("Item de catálogo selecionado não foi encontrado.");
        }
      }

      // 4. Obter nova caixa se alterada
      let newBox: any = asset.currentBox;
      if (data.currentBoxId !== undefined) {
        if (data.currentBoxId) {
          newBox = await tx.box.findUnique({
            where: { id: data.currentBoxId },
            include: { door: true },
          });
        } else {
          newBox = null;
        }
      }

      // 5. Mapear alterações para histórico e auditoria (Diff)
      const changes: string[] = [];
      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};

      if (data.assetTag && data.assetTag.toUpperCase().trim() !== asset.assetTag) {
        changes.push(`Patrimônio: "${asset.assetTag}" ➔ "${data.assetTag.toUpperCase().trim()}"`);
        oldValues.assetTag = asset.assetTag;
        newValues.assetTag = data.assetTag.toUpperCase().trim();
      }

      if (data.itemId && data.itemId !== asset.itemId) {
        changes.push(`Item do Catálogo: "${asset.item.name}" ➔ "${newItem.name}"`);
        oldValues.item = asset.item.name;
        newValues.item = newItem.name;
      }

      if (data.model !== undefined && (data.model?.trim() || "") !== (asset.model || "")) {
        changes.push(`Modelo: "${asset.model || "(vazio)"}" ➔ "${data.model?.trim() || "(vazio)"}"`);
        oldValues.model = asset.model;
        newValues.model = data.model?.trim() || null;
      }

      if (data.serialNumber !== undefined && (data.serialNumber?.trim() || "") !== (asset.serialNumber || "")) {
        changes.push(`Nº de Série: "${asset.serialNumber || "(vazio)"}" ➔ "${data.serialNumber?.trim() || "(vazio)"}"`);
        oldValues.serialNumber = asset.serialNumber;
        newValues.serialNumber = data.serialNumber?.trim() || null;
      }

      if (data.currentBoxId !== undefined && data.currentBoxId !== asset.currentBoxId) {
        const oldBoxName = asset.currentBox ? `${asset.currentBox.name} (${asset.currentBox.door?.name})` : "Sem caixa";
        const newBoxName = newBox ? `${newBox.name} (${newBox.door?.name})` : "Sem caixa";
        changes.push(`Localização: "${oldBoxName}" ➔ "${newBoxName}"`);
        oldValues.currentBox = oldBoxName;
        newValues.currentBox = newBoxName;
      }

      const rawDate = data.acquisitionDate || data.purchaseDate;
      if (rawDate !== undefined) {
        const parsedDate = rawDate ? new Date(rawDate) : null;
        const oldDateStr = asset.acquisitionDate ? asset.acquisitionDate.toISOString().split("T")[0] : null;
        const newDateStr = parsedDate ? parsedDate.toISOString().split("T")[0] : null;
        if (oldDateStr !== newDateStr) {
          changes.push(`Data de Aquisição: "${oldDateStr || "(vazio)"}" ➔ "${newDateStr || "(vazio)"}"`);
          oldValues.acquisitionDate = oldDateStr;
          newValues.acquisitionDate = newDateStr;
        }
      }

      const rawValue = data.acquisitionValue !== undefined ? data.acquisitionValue : data.purchaseValue;
      if (rawValue !== undefined) {
        const numVal = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
        const oldVal = asset.acquisitionValue !== null ? Number(asset.acquisitionValue) : null;
        if (numVal !== oldVal) {
          changes.push(`Valor: R$ ${oldVal?.toFixed(2) || "0,00"} ➔ R$ ${numVal?.toFixed(2) || "0,00"}`);
          oldValues.acquisitionValue = oldVal;
          newValues.acquisitionValue = numVal;
        }
      }

      if (data.notes !== undefined && (data.notes?.trim() || "") !== (asset.notes || "")) {
        changes.push(`Observações atualizadas`);
        oldValues.notes = asset.notes;
        newValues.notes = data.notes?.trim() || null;
      }

      const rawAcqDate = data.acquisitionDate || data.purchaseDate;
      const rawAcqValue = data.acquisitionValue !== undefined ? data.acquisitionValue : data.purchaseValue;

      // 6. Atualizar o patrimônio
      const updated = await tx.asset.update({
        where: { id },
        data: {
          assetTag: data.assetTag ? data.assetTag.toUpperCase().trim() : undefined,
          itemId: data.itemId || undefined,
          model: data.model !== undefined ? (data.model?.trim() || null) : undefined,
          serialNumber: data.serialNumber !== undefined ? (data.serialNumber?.trim() || null) : undefined,
          currentBoxId: data.currentBoxId !== undefined ? (data.currentBoxId || null) : undefined,
          acquisitionDate: rawAcqDate !== undefined ? (rawAcqDate ? new Date(rawAcqDate) : null) : undefined,
          acquisitionValue: rawAcqValue !== undefined ? (rawAcqValue !== null ? rawAcqValue : null) : undefined,
          notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
        },
        include: {
          item: { include: { category: true } },
          currentBox: { include: { door: true } },
        },
      });

      const boxLocation = updated.currentBox
        ? `${updated.currentBox.name} (${updated.currentBox.door?.name || "Porta"})`
        : "Sem caixa atribuída";

      const observationSummary = changes.length > 0
        ? `Edição de cadastro: ${changes.join("; ")}`
        : "Dados do equipamento atualizados.";

      // 7. Gravar na Linha do Tempo (AssetHistory)
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: "EDITADO",
          fromStatus: asset.status,
          toStatus: updated.status,
          fromLocation: asset.currentBox ? `${asset.currentBox.name} (${asset.currentBox.door?.name})` : null,
          toLocation: boxLocation,
          userId,
          userName: userName || "Operador",
          observation: observationSummary,
        },
      });

      // 8. Gravar no AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE_ASSET",
          entity: "Asset",
          entityId: id,
          details: {
            assetTag: updated.assetTag,
            changes,
            old: oldValues,
            new: newValues,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Descarte / Baixa definitiva / Exclusão de patrimônio
   */
  static async deleteAsset(
    id: string,
    reason: string,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id },
        include: {
          item: true,
          loans: { where: { status: { in: ["ACTIVE", "OVERDUE"] } } },
          reservations: {
            where: {
              status: "ACTIVE",
              endTime: { gte: new Date() },
            },
          },
        },
      });

      if (!asset) {
        throw new Error("Equipamento patrimonial não encontrado.");
      }

      if (asset.loans.length > 0) {
        throw new Error("Não é possível descartar ou excluir um patrimônio com empréstimo ativo em andamento.");
      }

      if (asset.reservations.length > 0) {
        throw new Error("Não é possível descartar um patrimônio com reserva ativa agendada.");
      }

      // Baixa lógica (WRITTEN_OFF + active: false)
      const deactivated = await tx.asset.update({
        where: { id },
        data: {
          active: false,
          status: AssetStatus.WRITTEN_OFF,
          notes: asset.notes
            ? `${asset.notes} [BAIXADO: ${reason}]`
            : `[BAIXADO: ${reason}]`,
        },
        include: {
          item: true,
        },
      });

      // Histórico
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: "BAIXADO_DESCARTADO",
          fromStatus: asset.status,
          toStatus: AssetStatus.WRITTEN_OFF,
          fromLocation: asset.currentBoxId || null,
          toLocation: null,
          userId,
          userName: userName || "Operador",
          observation: `Patrimônio descartado/baixado do acervo. Motivo: ${reason}`,
        },
      });

      // AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE_ASSET",
          entity: "Asset",
          entityId: id,
          details: {
            assetTag: asset.assetTag,
            item: asset.item.name,
            reason,
          },
        },
      });

      return deactivated;
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
