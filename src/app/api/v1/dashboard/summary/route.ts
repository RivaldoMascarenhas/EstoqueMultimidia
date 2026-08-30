import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssetStatus, LoanStatus, MaintenanceStatus } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";
import { RequestService } from "@/services/request.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Consultas paralelas em alta performance
    const [
      items,
      assets,
      activeLoans,
      monthLoansCount,
      maintenances,
      recentMovements,
      recentLoans,
      recentMaintenances,
    ] = await Promise.all([
      // 1. Itens e inventário
      prisma.item.findMany({
        where: { active: true },
        include: {
          inventories: true,
          category: true,
          assets: { where: { active: true } },
        },
      }),

      // 2. Patrimônios
      prisma.asset.findMany({
        where: { active: true },
        include: {
          item: true,
          currentBox: { include: { door: true } },
        },
      }),

      // 3. Empréstimos Ativos
      prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        include: {
          asset: { include: { item: true } },
          createdByUser: { select: { name: true } },
        },
        orderBy: { expectedReturnDate: "asc" },
      }),

      // 4. Total de empréstimos do mês
      prisma.loan.count({
        where: {
          loanDate: { gte: startOfMonth },
        },
      }),

      // 5. Ordens de Serviço
      prisma.maintenance.findMany({
        where: {
          status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
        },
        include: {
          asset: { include: { item: true } },
          createdByUser: { select: { name: true } },
        },
        orderBy: { entryDate: "asc" },
      }),

      // 6. Últimas movimentações de estoque
      prisma.stockMovement.findMany({
        include: {
          item: true,
          user: { select: { name: true } },
          sourceBox: { include: { door: true } },
          destBox: { include: { door: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // 7. Últimos empréstimos realizados
      prisma.loan.findMany({
        include: {
          asset: { include: { item: true } },
          createdByUser: { select: { name: true } },
        },
        orderBy: { loanDate: "desc" },
        take: 5,
      }),

      // 8. Últimas OS abertas/fechadas
      prisma.maintenance.findMany({
        include: {
          asset: { include: { item: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    // ----------------------------------------------------
    // CÁLCULO DE MÉTRICAS DE ESTOQUE
    // ----------------------------------------------------
    let totalStockUnits = 0;
    let criticalItemsCount = 0;
    let lowItemsCount = 0;
    let normalItemsCount = 0;
    const criticalStockAlerts: any[] = [];

    items.forEach((item) => {
      let currentQty = 0;
      if (item.itemType === "MATERIAL") {
        currentQty = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      } else {
        currentQty = item.assets ? item.assets.length : 0;
      }
      totalStockUnits += currentQty;

      if (currentQty <= 0 || currentQty <= Math.floor(item.minStock / 2)) {
        criticalItemsCount++;
        criticalStockAlerts.push({
          id: item.id,
          name: item.name,
          sku: item.sku,
          current: currentQty,
          min: item.minStock,
          ideal: item.idealStock,
          category: item.category?.name || "Geral",
        });
      } else if (currentQty <= item.minStock) {
        lowItemsCount++;
      } else {
        normalItemsCount++;
      }
    });

    // ----------------------------------------------------
    // CÁLCULO DE MÉTRICAS DE PATRIMÔNIO
    // ----------------------------------------------------
    const assetStats = {
      total: assets.length,
      available: assets.filter((a) => a.status === AssetStatus.AVAILABLE).length,
      loaned: assets.filter((a) => a.status === AssetStatus.LOANED).length,
      maintenance: assets.filter((a) => a.status === AssetStatus.IN_MAINTENANCE).length,
      damaged: assets.filter((a) => a.status === AssetStatus.DAMAGED).length,
      writtenOff: assets.filter((a) => a.status === AssetStatus.WRITTEN_OFF).length,
    };

    const availabilityRate = assetStats.total > 0
      ? Math.round((assetStats.available / assetStats.total) * 100)
      : 100;

    // ----------------------------------------------------
    // CÁLCULO DE EMPRÉSTIMOS E ATRASOS
    // ----------------------------------------------------
    const overdueLoansList: any[] = [];
    let overdueCount = 0;

    activeLoans.forEach((loan) => {
      const isOverdue = new Date(loan.expectedReturnDate) < now;
      if (isOverdue) {
        overdueCount++;
        const diffHours = Math.ceil((now.getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60));
        overdueLoansList.push({
          id: loan.id,
          protocol: `LOAN-${loan.id.slice(-8).toUpperCase()}`,
          borrowerName: loan.borrowerName,
          borrowerEmail: loan.borrowerEmail,
          borrowerPhone: loan.borrowerPhone,
          borrowerDepartment: loan.borrowerDepartment,
          destination: loan.destination,
          assetTag: loan.asset?.assetTag,
          itemName: loan.asset?.item?.name,
          expectedReturnDate: loan.expectedReturnDate,
          loanDate: loan.loanDate,
          status: loan.status,
          asset: loan.asset,
          diffHours,
        });
      }
    });

    // ----------------------------------------------------
    // CÁLCULO DE MANUTENÇÕES E DIAS NA BANCADA
    // ----------------------------------------------------
    let totalDaysInMaintenance = 0;
    let criticalOsCount = 0;
    const criticalOsList: any[] = [];

    maintenances.forEach((m) => {
      const days = Math.max(0, Math.floor((now.getTime() - new Date(m.entryDate).getTime()) / (1000 * 60 * 60 * 24)));
      totalDaysInMaintenance += days;

      if (m.priority === "CRITICAL" || days > 7) {
        criticalOsCount++;
        criticalOsList.push({
          id: m.id,
          orderNumber: m.orderNumber || `#OS-${m.id.slice(0, 8)}`,
          assetTag: m.asset?.assetTag,
          itemName: m.asset?.item?.name,
          issueDescription: m.issueDescription,
          daysInMaintenance: days,
          priority: m.priority,
          serviceProvider: m.serviceProvider,
        });
      }
    });

    const avgDaysInMaintenance = maintenances.length > 0
      ? (totalDaysInMaintenance / maintenances.length).toFixed(1)
      : "0";

    // ----------------------------------------------------
    // TIMELINE CONSOLIDADA (ÚLTIMAS ATIVIDADES)
    // ----------------------------------------------------
    const timelineEvents: any[] = [];

    recentMovements.forEach((mov) => {
      timelineEvents.push({
        id: `mov-${mov.id}`,
        type: "STOCK_MOVEMENT",
        title: `Movimentação de Estoque (${mov.type})`,
        description: `${mov.quantity}x ${mov.item?.name}`,
        actor: mov.user?.name || "Sistema",
        date: mov.createdAt,
        badge: mov.type === "ENTRY" ? "Entrada" : mov.type === "TRANSFER" ? "Transferência" : "Saída",
        badgeVariant: mov.type === "ENTRY" ? "available" : mov.type === "TRANSFER" ? "default" : "destructive",
        link: "/movimentacoes",
      });
    });

    recentLoans.forEach((loan) => {
      timelineEvents.push({
        id: `loan-${loan.id}`,
        type: "LOAN",
        title: `Empréstimo Registrado`,
        description: `${loan.asset?.item?.name} (#${loan.asset?.assetTag}) para ${loan.borrowerName}`,
        actor: loan.createdByUser?.name || "Operador",
        date: loan.loanDate,
        badge: loan.status === "RETURNED" ? "Devolvido" : "Em Aberto",
        badgeVariant: loan.status === "RETURNED" ? "available" : "loaned",
        link: "/emprestimos",
      });
    });

    recentMaintenances.forEach((m) => {
      timelineEvents.push({
        id: `maint-${m.id}`,
        type: "MAINTENANCE",
        title: `Ordem de Serviço (${m.orderNumber || "OS"})`,
        description: `${m.asset?.item?.name} (#${m.asset?.assetTag}) - ${m.issueDescription}`,
        actor: "Laboratório TI",
        date: m.updatedAt,
        badge: m.status === "COMPLETED" ? "Concluído" : "Em Reparo",
        badgeVariant: m.status === "COMPLETED" ? "available" : "maintenance",
        link: "/manutencao",
      });
    });

    // Ordenar timeline desc por data
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const topTimeline = timelineEvents.slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        stock: {
          totalCatalogItems: items.length,
          totalUnits: totalStockUnits,
          criticalCount: criticalItemsCount,
          lowCount: lowItemsCount,
          normalCount: normalItemsCount,
        },
        assets: {
          ...assetStats,
          availabilityRate,
        },
        loans: {
          activeCount: activeLoans.length,
          overdueCount,
          monthLoansCount,
        },
        maintenance: {
          openCount: maintenances.length,
          avgDays: avgDaysInMaintenance,
          criticalCount: criticalOsCount,
        },
        alerts: {
          overdueLoans: overdueLoansList.slice(0, 5),
          criticalStock: criticalStockAlerts.slice(0, 5),
          criticalMaintenance: criticalOsList.slice(0, 5),
          totalAlerts: overdueLoansList.length + criticalStockAlerts.length + criticalOsList.length,
        },
        todayOperations: await RequestService.getRequestsByShift(now),
        timeline: topTimeline,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao compilar resumo do dashboard." },
      { status: 500 }
    );
  }
}
