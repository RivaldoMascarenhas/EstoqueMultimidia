import { prisma } from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";
import { 
  MaintenanceCreateInput, 
  MaintenanceUpdateInput, 
  MaintenanceCompleteInput, 
  MaintenanceCancelInput 
} from "@/schemas/maintenance.schema";

export class MaintenanceService {
  /**
   * Gera o próximo número sequencial de OS: OS-YYYY-XXXX (ex: OS-2026-0001)
   */
  private static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.maintenance.count();
    const seq = String(count + 1).padStart(4, "0");
    const candidate = `OS-${year}-${seq}`;

    // Garantir unicidade
    const existing = await prisma.maintenance.findUnique({
      where: { orderNumber: candidate },
    });

    if (existing) {
      const timestamp = Date.now().toString().slice(-4);
      return `OS-${year}-${seq}-${timestamp}`;
    }

    return candidate;
  }

  /**
   * Lista ordens de serviço com filtros avançados e cálculos dinâmicos
   */
  static async getMaintenances(params?: {
    search?: string;
    status?: "ALL" | "ACTIVE" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXTERNAL";
    priority?: string;
    maintenanceType?: string;
    assetId?: string;
  }) {
    const { search, status, priority, maintenanceType, assetId } = params || {};
    const now = new Date();

    const whereClause: any = {};

    if (assetId) {
      whereClause.assetId = assetId;
    }

    if (priority && priority !== "ALL") {
      whereClause.priority = priority;
    }

    if (maintenanceType && maintenanceType !== "ALL") {
      if (maintenanceType === "INTERNAL") {
        whereClause.maintenanceType = { in: ["INTERNAL", "CORRECTIVE"] };
      } else {
        whereClause.maintenanceType = maintenanceType;
      }
    }

    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        whereClause.status = { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] };
      } else if (status === "EXTERNAL") {
        whereClause.maintenanceType = "EXTERNAL";
      } else if (status === "PENDING") {
        whereClause.status = MaintenanceStatus.PENDING;
      } else if (status === "IN_PROGRESS") {
        whereClause.status = MaintenanceStatus.IN_PROGRESS;
      } else if (status === "COMPLETED") {
        whereClause.status = MaintenanceStatus.COMPLETED;
      } else if (status === "CANCELLED") {
        whereClause.status = MaintenanceStatus.CANCELLED;
      }
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { issueDescription: { contains: search, mode: "insensitive" } },
        { serviceProvider: { contains: search, mode: "insensitive" } },
        { technicalNotes: { contains: search, mode: "insensitive" } },
        { diagnosis: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { asset: { assetTag: { contains: search, mode: "insensitive" } } },
        { asset: { item: { name: { contains: search, mode: "insensitive" } } } },
        { asset: { serialNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const rawList = await prisma.maintenance.findMany({
      where: whereClause,
      include: {
        asset: {
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
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        completedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return rawList.map((m) => {
      const entryTime = new Date(m.entryDate).getTime();
      const endTime = m.exitDate ? new Date(m.exitDate).getTime() : now.getTime();
      const diffMs = endTime - entryTime;
      const daysInMaintenance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const hoursInMaintenance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      const isActive = m.status === MaintenanceStatus.PENDING || m.status === MaintenanceStatus.IN_PROGRESS;

      return {
        ...m,
        daysInMaintenance,
        hoursInMaintenance,
        isActive,
      };
    });
  }

  /**
   * Busca detalhes completos de uma OS por ID
   */
  static async getMaintenanceById(id: string) {
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        asset: {
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
            history: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        completedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!maintenance) {
      throw new Error("Ordem de serviço não encontrada.");
    }

    const now = new Date();
    const entryTime = new Date(maintenance.entryDate).getTime();
    const endTime = maintenance.exitDate ? new Date(maintenance.exitDate).getTime() : now.getTime();
    const diffMs = endTime - entryTime;
    const daysInMaintenance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const hoursInMaintenance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    return {
      ...maintenance,
      daysInMaintenance,
      hoursInMaintenance,
      isActive: maintenance.status === MaintenanceStatus.PENDING || maintenance.status === MaintenanceStatus.IN_PROGRESS,
    };
  }

  /**
   * Abre uma nova Ordem de Serviço (Preventiva ou Corretiva)
   */
  static async createMaintenance(input: MaintenanceCreateInput, userId: string, userName?: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar ativo
      const asset = await tx.asset.findUnique({
        where: { id: input.assetId },
        include: {
          item: true,
          currentBox: {
            include: { door: true },
          },
        },
      });

      if (!asset) {
        throw new Error("Equipamento patrimonial não encontrado.");
      }

      if (asset.status === AssetStatus.LOANED) {
        throw new Error("Equipamento está emprestado no momento. Realize a devolução antes de enviar para manutenção.");
      }

      // 2. ATOMIC LOCK: Bloquear o ativo apenas se estiver AVAILABLE ou DAMAGED
      const assetUpdate = await tx.asset.updateMany({
        where: {
          id: input.assetId,
          status: { in: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED] },
        },
        data: {
          status: AssetStatus.IN_MAINTENANCE,
          currentBoxId: null,
        },
      });

      if (assetUpdate.count === 0) {
        throw new Error("Equipamento indisponível para manutenção (já em empréstimo ou em manutenção ativa).");
      }

      // 3. Gerar número de OS
      const orderNumber = await this.generateOrderNumber();

      // 4. Localização de origem para histórico
      const fromLocation = asset.currentBox
        ? `${asset.currentBox.door.name} / ${asset.currentBox.name} (${asset.currentBox.code})`
        : "Sem caixa definida";

      const destination = input.serviceProvider
        ? `Manutenção / ${input.serviceProvider}`
        : input.maintenanceType === "EXTERNAL"
        ? "Assistência Técnica Externa"
        : "Laboratório de Suporte TI UniFAP";

      // 5. Criar a Ordem de Serviço
      const maintenance = await tx.maintenance.create({
        data: {
          orderNumber,
          assetId: input.assetId,
          issueDescription: input.issueDescription,
          maintenanceType: input.maintenanceType || "CORRECTIVE",
          priority: input.priority || "MEDIUM",
          status: MaintenanceStatus.IN_PROGRESS,
          serviceProvider: input.serviceProvider || null,
          cost: input.cost !== undefined && input.cost !== null ? input.cost : null,
          diagnosis: input.diagnosis || null,
          contactName: input.contactName || null,
          contactPhone: input.contactPhone || null,
          technicalNotes: input.technicalNotes || null,
          createdByUserId: userId,
        },
        include: {
          asset: {
            include: {
              item: true,
            },
          },
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 6. Registrar na Linha do Tempo Inalterável (AssetHistory)
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: "ENVIO_MANUTENCAO",
          fromStatus: asset.status,
          toStatus: AssetStatus.IN_MAINTENANCE,
          fromLocation,
          toLocation: destination,
          userId,
          userName: userName || "Sistema UniFAP",
          observation: `[${orderNumber}] Motivo: ${input.issueDescription}${
            input.serviceProvider ? ` | Fornecedor: ${input.serviceProvider}` : ""
          }`,
        },
      });

      // 7. Registrar Auditoria do Sistema
      await tx.auditLog.create({
        data: {
          userId,
          action: "MAINTENANCE_CREATE",
          entity: "Maintenance",
          entityId: maintenance.id,
          details: {
            orderNumber,
            assetTag: asset.assetTag,
            itemName: asset.item.name,
            type: input.maintenanceType,
            priority: input.priority,
            issue: input.issueDescription,
          },
        },
      });

      return maintenance;
    });
  }

  /**
   * Atualiza dados intermediários, laudo preliminar, fornecedor ou custos de uma OS
   */
  static async updateMaintenance(id: string, input: MaintenanceUpdateInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenance.findUnique({
        where: { id },
        include: { asset: true },
      });

      if (!existing) {
        throw new Error("Ordem de serviço não encontrada.");
      }

      const updateData: any = {};
      if (input.issueDescription !== undefined) updateData.issueDescription = input.issueDescription;
      if (input.maintenanceType !== undefined) updateData.maintenanceType = input.maintenanceType;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.status !== undefined) updateData.status = input.status as MaintenanceStatus;
      if (input.serviceProvider !== undefined) updateData.serviceProvider = input.serviceProvider || null;
      if (input.cost !== undefined) updateData.cost = input.cost;
      if (input.diagnosis !== undefined) updateData.diagnosis = input.diagnosis || null;
      if (input.solution !== undefined) updateData.solution = input.solution || null;
      if (input.technicalNotes !== undefined) updateData.technicalNotes = input.technicalNotes || null;
      if (input.replacedParts !== undefined) updateData.replacedParts = input.replacedParts || null;
      if (input.lampHours !== undefined) updateData.lampHours = input.lampHours;
      if (input.contactName !== undefined) updateData.contactName = input.contactName || null;
      if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone || null;

      const updated = await tx.maintenance.update({
        where: { id },
        data: updateData,
        include: {
          asset: {
            include: { item: true },
          },
          createdByUser: { select: { id: true, name: true } },
          completedByUser: { select: { id: true, name: true } },
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "MAINTENANCE_UPDATE",
          entity: "Maintenance",
          entityId: id,
          details: {
            orderNumber: existing.orderNumber,
            updatedFields: Object.keys(updateData),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Conclui a Ordem de Serviço com laudo técnico e realoca fisicamente no armário ou dá baixa
   */
  static async completeMaintenance(
    id: string,
    input: MaintenanceCompleteInput,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenance.findUnique({
        where: { id },
        include: {
          asset: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!maintenance) {
        throw new Error("Ordem de serviço não encontrada.");
      }

      if (maintenance.status === MaintenanceStatus.COMPLETED) {
        throw new Error("Esta Ordem de Serviço já foi concluída anteriormente.");
      }

      const orderNumber = maintenance.orderNumber || `#OS-${id.slice(0, 8)}`;
      let targetBox = null;
      let targetLocationName = "Descarte / Baixa";

      if (input.outcome === "AVAILABLE") {
        if (!input.returnBoxId) {
          throw new Error("Selecione a caixa física do armário para armazenar o equipamento recuperado.");
        }

        targetBox = await tx.box.findUnique({
          where: { id: input.returnBoxId },
          include: { door: true },
        });

        if (!targetBox) {
          throw new Error("Caixa física de destino não encontrada.");
        }

        targetLocationName = `${targetBox.door.name} / ${targetBox.name} (${targetBox.code})`;
      }

      // 1. ATOMIC LOCK: Atualizar Ordem de Serviço apenas se ainda estiver pendente ou em progresso
      const maintUpdate = await tx.maintenance.updateMany({
        where: {
          id,
          status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
        },
        data: {
          status: MaintenanceStatus.COMPLETED,
          exitDate: new Date(),
          completedByUserId: userId,
          solution: input.solution,
          technicalNotes: input.technicalNotes || null,
          replacedParts: input.replacedParts || null,
          lampHours: input.lampHours !== undefined ? input.lampHours : null,
          cost: input.cost !== undefined && input.cost !== null ? input.cost : maintenance.cost,
        },
      });

      if (maintUpdate.count === 0) {
        throw new Error("Esta ordem de serviço já foi concluída ou cancelada anteriormente.");
      }

      // 2. Atualizar Status e Localização do Equipamento
      if (input.outcome === "AVAILABLE" && targetBox) {
        await tx.asset.update({
          where: { id: maintenance.assetId },
          data: {
            status: AssetStatus.AVAILABLE,
            currentBoxId: targetBox.id,
          },
        });

        // Histórico de retorno
        await tx.assetHistory.create({
          data: {
            assetId: maintenance.assetId,
            action: "RETORNO_MANUTENCAO",
            fromStatus: AssetStatus.IN_MAINTENANCE,
            toStatus: AssetStatus.AVAILABLE,
            fromLocation: maintenance.serviceProvider || "Manutenção",
            toLocation: targetLocationName,
            userId,
            userName: userName || "Técnico UniFAP",
            observation: `[${orderNumber}] Concluído com sucesso. Laudo: ${input.solution}${
              input.replacedParts ? ` | Peças: ${input.replacedParts}` : ""
            }${input.cost ? ` | Custo: R$ ${Number(input.cost).toFixed(2)}` : ""}`,
          },
        });
      } else {
        // Baixa Definitiva (WRITTEN_OFF)
        await tx.asset.update({
          where: { id: maintenance.assetId },
          data: {
            status: AssetStatus.WRITTEN_OFF,
            currentBoxId: null,
            notes: `${maintenance.asset.notes || ""}\n[BAIXA POR INVIABILIDADE TÉCNICA - ${orderNumber}]: ${input.writeOffReason}`.trim(),
          },
        });

        // Histórico de baixa
        await tx.assetHistory.create({
          data: {
            assetId: maintenance.assetId,
            action: "BAIXA_PATRIMONIO",
            fromStatus: AssetStatus.IN_MAINTENANCE,
            toStatus: AssetStatus.WRITTEN_OFF,
            fromLocation: maintenance.serviceProvider || "Manutenção",
            toLocation: "Descarte / Sucata",
            userId,
            userName: userName || "Técnico UniFAP",
            observation: `[${orderNumber}] Equipamento condenado/baixado. Motivo: ${input.writeOffReason}`,
          },
        });
      }

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "MAINTENANCE_COMPLETE",
          entity: "Maintenance",
          entityId: id,
          details: {
            orderNumber,
            assetTag: maintenance.asset.assetTag,
            outcome: input.outcome,
            solution: input.solution,
            cost: input.cost,
            returnBoxCode: targetBox?.code,
          },
        },
      });

      const updatedMaintenance = await tx.maintenance.findUniqueOrThrow({
        where: { id },
        include: {
          asset: {
            include: { item: true },
          },
          createdByUser: { select: { id: true, name: true, email: true } },
          completedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      return updatedMaintenance;
    });
  }

  /**
   * Cancela uma Ordem de Serviço e restaura o estado do ativo
   */
  static async cancelMaintenance(
    id: string,
    input: MaintenanceCancelInput,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenance.findUnique({
        where: { id },
        include: {
          asset: {
            include: { item: true },
          },
        },
      });

      if (!maintenance) {
        throw new Error("Ordem de serviço não encontrada.");
      }

      if (maintenance.status === MaintenanceStatus.COMPLETED) {
        throw new Error("Não é possível cancelar uma OS já concluída.");
      }

      const orderNumber = maintenance.orderNumber || `#OS-${id.slice(0, 8)}`;
      let returnBox = null;
      let targetLocation = "Sem caixa definida";

      if (input.returnBoxId) {
        returnBox = await tx.box.findUnique({
          where: { id: input.returnBoxId },
          include: { door: true },
        });
        if (returnBox) {
          targetLocation = `${returnBox.door.name} / ${returnBox.name} (${returnBox.code})`;
        }
      }

      // 1. ATOMIC LOCK: Atualizar Maintenance apenas se ainda estiver pendente ou em progresso
      const maintUpdate = await tx.maintenance.updateMany({
        where: {
          id,
          status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
        },
        data: {
          status: MaintenanceStatus.CANCELLED,
          exitDate: new Date(),
          completedByUserId: userId,
          technicalNotes: `[CANCELADA]: ${input.reason}`,
        },
      });

      if (maintUpdate.count === 0) {
        throw new Error("Esta ordem de serviço já foi cancelada ou concluída anteriormente.");
      }

      // 2. Restaurar Ativo para AVAILABLE
      await tx.asset.update({
        where: { id: maintenance.assetId },
        data: {
          status: AssetStatus.AVAILABLE,
          currentBoxId: returnBox ? returnBox.id : null,
        },
      });

      // 3. Histórico do Ativo
      await tx.assetHistory.create({
        data: {
          assetId: maintenance.assetId,
          action: "CANCELAMENTO_MANUTENCAO",
          fromStatus: AssetStatus.IN_MAINTENANCE,
          toStatus: AssetStatus.AVAILABLE,
          fromLocation: maintenance.serviceProvider || "Manutenção",
          toLocation: targetLocation,
          userId,
          userName: userName || "Técnico UniFAP",
          observation: `[${orderNumber}] Cancelamento de OS. Motivo: ${input.reason}`,
        },
      });

      // 4. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "MAINTENANCE_CANCEL",
          entity: "Maintenance",
          entityId: id,
          details: {
            orderNumber,
            assetTag: maintenance.asset.assetTag,
            reason: input.reason,
            returnBoxCode: returnBox?.code,
          },
        },
      });

      const cancelled = await tx.maintenance.findUniqueOrThrow({
        where: { id },
      });

      return cancelled;
    });
  }

  /**
   * Retorna métricas consolidadas de manutenção para o Dashboard e Cards
   */
  static async getMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allMaintenances, completedThisMonth, totalCosts] = await Promise.all([
      prisma.maintenance.findMany({
        select: {
          id: true,
          status: true,
          maintenanceType: true,
          priority: true,
          cost: true,
          asset: {
            select: {
              item: {
                select: {
                  name: true,
                  category: { select: { slug: true } },
                },
              },
            },
          },
        },
      }),
      prisma.maintenance.count({
        where: {
          status: MaintenanceStatus.COMPLETED,
          exitDate: { gte: startOfMonth },
        },
      }),
      prisma.maintenance.aggregate({
        _sum: { cost: true },
        where: {
          status: MaintenanceStatus.COMPLETED,
        },
      }),
    ]);

    let activeCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let externalCount = 0;
    let criticalCount = 0;
    let projectorCount = 0;

    allMaintenances.forEach((m) => {
      const isAct = m.status === MaintenanceStatus.PENDING || m.status === MaintenanceStatus.IN_PROGRESS;
      if (isAct) {
        activeCount++;
        if (m.status === MaintenanceStatus.PENDING) pendingCount++;
        if (m.status === MaintenanceStatus.IN_PROGRESS) inProgressCount++;
        if (m.maintenanceType === "EXTERNAL") externalCount++;
        if (m.priority === "CRITICAL" || m.priority === "HIGH") criticalCount++;
        if (m.asset?.item?.category?.slug === "projetores") projectorCount++;
      }
    });

    return {
      activeCount,
      pendingCount,
      inProgressCount,
      externalCount,
      criticalCount,
      projectorCount,
      completedThisMonth,
      totalCost: Number(totalCosts._sum.cost || 0),
    };
  }

  /**
   * Retorna equipamentos elegíveis para abertura de OS (Disponíveis ou com Avaria)
   */
  static async getEligibleAssets() {
    return await prisma.asset.findMany({
      where: {
        status: { in: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED] },
      },
      include: {
        item: {
          include: { category: true },
        },
        currentBox: {
          include: { door: true },
        },
      },
      orderBy: [{ item: { name: "asc" } }, { assetTag: "asc" }],
    });
  }
}
