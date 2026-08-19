import { prisma } from "@/lib/prisma";
import { AssetStatus, LoanStatus, MaintenanceStatus } from "@prisma/client";
import { LoanCreateInput, LoanReturnInput, LoanRenewInput } from "@/schemas/loan.schema";

export class LoanService {
  /**
   * Lista empréstimos com filtros e identificação dinâmica de atrasos
   */
  static async getLoans(params?: {
    search?: string;
    status?: "ALL" | "ACTIVE" | "ON_TIME" | "OVERDUE" | "RETURNED" | "RETURNED_DAMAGED";
    assetId?: string;
    borrowerName?: string;
  }) {
    const { search, status, assetId, borrowerName } = params || {};
    const now = new Date();

    const whereClause: any = {};

    if (assetId) {
      whereClause.assetId = assetId;
    }

    if (borrowerName) {
      whereClause.borrowerName = { contains: borrowerName, mode: "insensitive" };
    }

    if (status && status !== "ALL") {
      if (status === "OVERDUE") {
        whereClause.status = LoanStatus.ACTIVE;
        whereClause.expectedReturnDate = { lt: now };
      } else if (status === "ACTIVE") {
        whereClause.status = LoanStatus.ACTIVE;
      } else if (status === "ON_TIME") {
        whereClause.status = LoanStatus.ACTIVE;
        whereClause.expectedReturnDate = { gte: now };
      } else if (status === "RETURNED") {
        whereClause.status = LoanStatus.RETURNED;
      } else if (status === "RETURNED_DAMAGED") {
        whereClause.status = LoanStatus.RETURNED_DAMAGED;
      }
    }

    if (search) {
      whereClause.OR = [
        { borrowerName: { contains: search, mode: "insensitive" } },
        { borrowerDepartment: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { asset: { assetTag: { contains: search, mode: "insensitive" } } },
        { asset: { item: { name: { contains: search, mode: "insensitive" } } } },
        { asset: { serialNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const rawLoans = await prisma.loan.findMany({
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
        receivedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // Anotação com cálculo de atraso em tempo real
    return rawLoans.map((loan) => {
      const isOverdue =
        loan.status === LoanStatus.ACTIVE && new Date(loan.expectedReturnDate) < now;
      const displayStatus = isOverdue ? "OVERDUE" : loan.status;

      // Calcular tempo de atraso ou restante
      const diffMs = new Date(loan.expectedReturnDate).getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return {
        ...loan,
        computedStatus: displayStatus,
        isOverdue,
        diffHours,
        diffDays,
      };
    });
  }

  /**
   * Busca detalhes completos de um empréstimo por ID
   */
  static async getLoanById(id: string) {
    const loan = await prisma.loan.findUnique({
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
        receivedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!loan) {
      throw new Error("Empréstimo não encontrado.");
    }

    const now = new Date();
    const isOverdue =
      loan.status === LoanStatus.ACTIVE && new Date(loan.expectedReturnDate) < now;

    return {
      ...loan,
      computedStatus: isOverdue ? "OVERDUE" : loan.status,
      isOverdue,
    };
  }

  /**
   * Lista equipamentos do patrimônio disponíveis para empréstimo imediato
   */
  static async getAvailableAssets() {
    return await prisma.asset.findMany({
      where: {
        active: true,
        status: AssetStatus.AVAILABLE,
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
      },
      orderBy: [{ item: { name: "asc" } }, { assetTag: "asc" }],
    });
  }

  /**
   * Registra um novo empréstimo (Checkout)
   */
  static async createLoan(data: LoanCreateInput, userId: string, userName?: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validar existência do equipamento
      const asset = await tx.asset.findUnique({
        where: { id: data.assetId },
        include: {
          item: true,
          currentBox: {
            include: { door: true },
          },
        },
      });

      if (!asset) {
        throw new Error("Equipamento não encontrado.");
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
        if (asset.status === AssetStatus.LOANED) {
          throw new Error(`O equipamento #${asset.assetTag} (${asset.item.name}) já está emprestado no momento.`);
        }
        if (asset.status === AssetStatus.IN_MAINTENANCE) {
          throw new Error(`O equipamento #${asset.assetTag} está em manutenção técnica e não pode ser emprestado.`);
        }
        if (asset.status === AssetStatus.DAMAGED) {
          throw new Error(`O equipamento #${asset.assetTag} está marcado como danificado e necessita reparos.`);
        }
        throw new Error(`O equipamento #${asset.assetTag} não está disponível para empréstimo (Status: ${asset.status}).`);
      }

      const expectedDate = new Date(data.expectedReturnDate);
      if (isNaN(expectedDate.getTime())) {
        throw new Error("Data prevista de devolução inválida.");
      }

      // 1.1 Validar se o equipamento está agendado/em atendimento na Agenda
      const now = new Date();
      const overlappingReservation = await tx.reservation.findFirst({
        where: {
          assetId: data.assetId,
          status: "ACTIVE",
          OR: [
            {
              startTime: { lte: expectedDate },
              endTime: { gte: now },
            },
          ],
        },
        include: {
          request: {
            include: { room: true },
          },
        },
      });

      if (overlappingReservation) {
        const req = overlappingReservation.request;
        const startStr = req.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const endStr = req.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        throw new Error(
          `O equipamento #${asset.assetTag} está agendado para a Sala ${req.room?.name || ""} (${req.professorName || "Atendimento"}) das ${startStr} às ${endStr} e não pode ser emprestado neste período.`
        );
      }

      const originLocation = asset.currentBox
        ? `${asset.currentBox.name} (${asset.currentBox.door.name})`
        : "Localização não atribuída";

      // 2. ATOMIC LOCK: Atualizar status do Ativo apenas se ainda estiver AVAILABLE (impede double-booking concorrente)
      const assetUpdate = await tx.asset.updateMany({
        where: {
          id: data.assetId,
          status: AssetStatus.AVAILABLE,
        },
        data: {
          status: AssetStatus.LOANED,
          currentBoxId: null,
        },
      });

      if (assetUpdate.count === 0) {
        throw new Error(`O equipamento #${asset.assetTag} foi alocado concorrentemente por outra requisição e não está mais disponível.`);
      }

      // 3. Criar registro de Empréstimo
      const loan = await tx.loan.create({
        data: {
          assetId: data.assetId,
          borrowerName: data.borrowerName.trim(),
          borrowerEmail: data.borrowerEmail?.trim() || null,
          borrowerPhone: data.borrowerPhone?.trim() || null,
          borrowerDepartment: data.borrowerDepartment?.trim() || null,
          destination: data.destination.trim(),
          expectedReturnDate: expectedDate,
          notes: data.notes?.trim() || null,
          status: LoanStatus.ACTIVE,
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

      // 4. Inserir registro na Linha do Tempo Inalterável (AssetHistory)
      await tx.assetHistory.create({
        data: {
          assetId: data.assetId,
          action: "EMPRESTADO",
          fromStatus: AssetStatus.AVAILABLE,
          toStatus: AssetStatus.LOANED,
          fromLocation: originLocation,
          toLocation: `${data.destination.trim()} (${data.borrowerName.trim()})`,
          userId,
          userName: userName || "Operador",
          observation: `Empréstimo concedido a ${data.borrowerName.trim()}${
            data.borrowerDepartment ? ` (${data.borrowerDepartment.trim()})` : ""
          } para uso em ${data.destination.trim()}. Retorno previsto: ${expectedDate.toLocaleString("pt-BR")}.${
            data.notes ? ` Obs: ${data.notes.trim()}` : ""
          }`,
        },
      });

      // 5. Auditoria Geral do Sistema
      await tx.auditLog.create({
        data: {
          userId,
          action: "LOAN_CREATE",
          entity: "Loan",
          entityId: loan.id,
          details: {
            loanId: loan.id,
            assetTag: asset.assetTag,
            itemName: asset.item.name,
            borrower: data.borrowerName.trim(),
            destination: data.destination.trim(),
            expectedReturn: expectedDate.toISOString(),
          },
        },
      });

      return loan;
    });
  }

  /**
   * Processa a devolução de um empréstimo (Check-in) com triagem física
   */
  static async returnLoan(
    loanId: string,
    data: LoanReturnInput,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          asset: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!loan) {
        throw new Error("Empréstimo não encontrado.");
      }

      if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.RETURNED_DAMAGED) {
        throw new Error("Este empréstimo já foi devolvido anteriormente.");
      }

      // Validar caixa de destino
      const targetBox = await tx.box.findUnique({
        where: { id: data.returnBoxId },
        include: { door: true },
      });

      if (!targetBox) {
        throw new Error("Caixa física de destino não encontrada.");
      }

      const isDamaged = data.condition === "DAMAGED";
      const targetAssetStatus = isDamaged ? AssetStatus.IN_MAINTENANCE : AssetStatus.AVAILABLE;
      const targetLoanStatus = isDamaged ? LoanStatus.RETURNED_DAMAGED : LoanStatus.RETURNED;

      const now = new Date();

      // 1. ATOMIC LOCK: Atualizar empréstimo apenas se ainda estiver ACTIVE ou OVERDUE
      const loanUpdate = await tx.loan.updateMany({
        where: {
          id: loanId,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        data: {
          status: targetLoanStatus,
          actualReturnDate: now,
          receivedByUserId: userId,
          returnBoxId: data.returnBoxId,
          returnedCondition: isDamaged
            ? data.returnedCondition?.trim() || "Equipamento devolvido com avaria física/defeito"
            : "Devolvido em perfeito estado de funcionamento",
          returnNotes: data.returnNotes?.trim() || null,
        },
      });

      if (loanUpdate.count === 0) {
        throw new Error("Este empréstimo já foi devolvido ou não se encontra ativo.");
      }

      // 2. Atualizar status e localização física do Ativo
      await tx.asset.update({
        where: { id: loan.assetId },
        data: {
          status: targetAssetStatus,
          currentBoxId: isDamaged ? null : data.returnBoxId,
        },
      });

      let autoMaintenanceOrderNumber: string | null = null;

      // 2.1 Se houver avaria, abrir OS corretiva automática
      if (isDamaged) {
        const year = now.getFullYear();
        const count = await tx.maintenance.count();
        const candidateOS = `OS-${year}-${String(count + 1).padStart(4, "0")}`;
        const existingOS = await tx.maintenance.findUnique({
          where: { orderNumber: candidateOS },
        });
        autoMaintenanceOrderNumber = existingOS
          ? `OS-${year}-${String(count + 1).padStart(4, "0")}-${Date.now().toString().slice(-4)}`
          : candidateOS;

        await tx.maintenance.create({
          data: {
            assetId: loan.assetId,
            orderNumber: autoMaintenanceOrderNumber,
            issueDescription: `[Avaria na Devolução]: ${data.returnedCondition?.trim() || "Equipamento devolvido com defeito pelo solicitante " + loan.borrowerName}`,
            serviceProvider: "Laboratório / Suporte Multimídia UniFAP",
            status: MaintenanceStatus.PENDING,
            createdByUserId: userId,
          },
        });
      }

      // 3. Registrar na Linha do Tempo (AssetHistory)
      const actionName = isDamaged ? "DEVOLVIDO_COM_AVARIA" : "DEVOLVIDO";
      const conditionObs = isDamaged
        ? `AVARIA IDENTIFICADA: ${data.returnedCondition || "Sem detalhes"}. OS gerada: ${autoMaintenanceOrderNumber}.`
        : "Equipamento conferido em perfeito estado.";

      await tx.assetHistory.create({
        data: {
          assetId: loan.assetId,
          action: actionName,
          fromStatus: AssetStatus.LOANED,
          toStatus: targetAssetStatus,
          fromLocation: `${loan.destination} (${loan.borrowerName})`,
          toLocation: isDamaged ? "Setor de Manutenção / Triagem" : `${targetBox.name} (${targetBox.door.name})`,
          userId,
          userName: userName || "Operador",
          observation: `Devolução recebida por ${userName || "Operador"}. ${isDamaged ? "Encaminhado para manutenção." : "Guardado na " + targetBox.name + "."} ${conditionObs}${
            data.returnNotes ? ` Obs: ${data.returnNotes.trim()}` : ""
          }`,
        },
      });

      // 4. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "LOAN_RETURN",
          entity: "Loan",
          entityId: loan.id,
          details: {
            loanId: loan.id,
            assetTag: loan.asset.assetTag,
            itemName: loan.asset.item.name,
            condition: data.condition,
            returnBox: targetBox.code,
            isDamaged,
          },
        },
      });

      const updatedLoan = await tx.loan.findUniqueOrThrow({
        where: { id: loanId },
        include: {
          asset: {
            include: { item: true },
          },
          receivedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return updatedLoan;
    });
  }

  /**
   * Renova / Prorroga a data prevista de devolução
   */
  static async renewLoan(
    loanId: string,
    data: LoanRenewInput,
    userId: string,
    userName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          asset: {
            include: { item: true },
          },
        },
      });

      if (!loan) {
        throw new Error("Empréstimo não encontrado.");
      }

      if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
        throw new Error("Apenas empréstimos ativos podem ser renovados.");
      }

      const newDate = new Date(data.newExpectedReturnDate);
      if (isNaN(newDate.getTime())) {
        throw new Error("Nova data de devolução inválida.");
      }

      const previousDate = loan.expectedReturnDate;

      // 1. ATOMIC LOCK: Atualizar empréstimo apenas se ainda estiver ativo
      const loanUpdate = await tx.loan.updateMany({
        where: {
          id: loanId,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        data: {
          expectedReturnDate: newDate,
          notes: loan.notes
            ? `${loan.notes} | [Renovação em ${new Date().toLocaleDateString("pt-BR")}: ${data.reason.trim()}]`
            : `[Renovação em ${new Date().toLocaleDateString("pt-BR")}: ${data.reason.trim()}]`,
        },
      });

      if (loanUpdate.count === 0) {
        throw new Error("Apenas empréstimos ativos podem ser renovados.");
      }

      // 2. Histórico do Ativo
      await tx.assetHistory.create({
        data: {
          assetId: loan.assetId,
          action: "RENOVAÇÃO_PRAZO",
          fromStatus: AssetStatus.LOANED,
          toStatus: AssetStatus.LOANED,
          fromLocation: `${loan.destination} (${loan.borrowerName})`,
          toLocation: `${loan.destination} (${loan.borrowerName})`,
          userId,
          userName: userName || "Operador",
          observation: `Prazo de devolução prorrogado de ${previousDate.toLocaleString("pt-BR")} para ${newDate.toLocaleString("pt-BR")}. Motivo: ${data.reason.trim()}`,
        },
      });

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "LOAN_RENEW",
          entity: "Loan",
          entityId: loan.id,
          details: {
            loanId: loan.id,
            assetTag: loan.asset.assetTag,
            previousExpectedReturn: previousDate.toISOString(),
            newExpectedReturn: newDate.toISOString(),
            reason: data.reason.trim(),
          },
        },
      });

      const updatedLoan = await tx.loan.findUniqueOrThrow({
        where: { id: loanId },
        include: {
          asset: { include: { item: true } },
          createdByUser: { select: { name: true } },
        },
      });

      return updatedLoan;
    });
  }

  /**
   * Métricas e KPIs de empréstimo em tempo real
   */
  static async getLoanMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLoans,
      activeLoansCount,
      allActiveLoans,
      returnedNormalCount,
      returnedDamagedCount,
      monthLoansCount,
    ] = await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      prisma.loan.findMany({
        where: { status: LoanStatus.ACTIVE },
        select: { expectedReturnDate: true },
      }),
      prisma.loan.count({ where: { status: LoanStatus.RETURNED } }),
      prisma.loan.count({ where: { status: LoanStatus.RETURNED_DAMAGED } }),
      prisma.loan.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    const overdueCount = allActiveLoans.filter(
      (l) => new Date(l.expectedReturnDate) < now
    ).length;

    const onTimeActiveCount = activeLoansCount - overdueCount;

    return {
      totalLoans,
      activeLoans: activeLoansCount,
      onTimeActiveLoans: onTimeActiveCount,
      overdueLoans: overdueCount,
      returnedLoans: returnedNormalCount,
      returnedDamagedLoans: returnedDamagedCount,
      monthLoans: monthLoansCount,
    };
  }
}
