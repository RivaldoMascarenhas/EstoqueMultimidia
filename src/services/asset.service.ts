import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
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
        loans: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        maintenances: {
          where: { status: "OPEN" },
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
        loans: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        maintenances: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        histories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return asset;
  }

  /**
   * Cadastra um novo equipamento patrimonial
   */
  static async createAsset(data: AssetCreateInput, userId: string) {
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
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchaseValue: data.purchaseValue || null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          notes: data.notes?.trim() || null,
        },
        include: {
          item: true,
          currentBox: {
            include: { door: true },
          },
        },
      });

      // Criar primeiro registro na Linha do Tempo (AssetHistory)
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          event: "AQUISIÇÃO / CADASTRO",
          description: `Equipamento ${asset.item.name} (#${asset.assetTag}) cadastrado no acervo do Suporte de TI da UniFAP. Local inicial: ${asset.currentBox ? `${asset.currentBox.name} (${asset.currentBox.door.name})` : "Sem caixa atribuída"}.`,
          userId,
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
    userId: string
  ) {
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
      if (asset.status === AssetStatus.LOANED && data.status === AssetStatus.AVAILABLE && asset.loans.length > 0) {
        throw new Error(
          "Este equipamento possui um empréstimo ativo. Realize a devolução formal no módulo de Empréstimos para liberá-lo."
        );
      }

      const prevStatus = asset.status;

      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          status: data.status,
          currentBoxId: data.currentBoxId !== undefined ? data.currentBoxId : asset.currentBoxId,
        },
        include: {
          item: true,
          currentBox: { include: { door: true } },
        },
      });

      // Registrar evento no histórico
      await tx.assetHistory.create({
        data: {
          assetId: id,
          event: `ALTERAÇÃO DE STATUS (${prevStatus} ➔ ${data.status})`,
          description: data.reason,
          userId,
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
            newStatus: data.status,
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
      prisma.asset.count({ where: { active: true, status: AssetStatus.MAINTENANCE } }),
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
