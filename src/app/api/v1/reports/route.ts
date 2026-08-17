import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssetStatus, LoanStatus, MaintenanceStatus, MovementType } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "INVENTORY";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const doorId = searchParams.get("doorId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    // ----------------------------------------------------
    // RELATÓRIO 1: INVENTÁRIO FÍSICO DO ARMÁRIO
    // ----------------------------------------------------
    if (reportType === "INVENTORY") {
      const doors = await prisma.door.findMany({
        where: doorId && doorId !== "ALL" ? { id: doorId } : undefined,
        include: {
          boxes: {
            where: { active: true },
            include: {
              inventories: {
                include: {
                  item: {
                    include: { category: true },
                  },
                },
              },
              assets: {
                where: { active: true },
                include: {
                  item: {
                    include: { category: true },
                  },
                },
              },
            },
            orderBy: { code: "asc" },
          },
        },
        orderBy: { code: "asc" },
      });

      let totalBoxes = 0;
      let totalMaterialsUnits = 0;
      let totalAssetsCount = 0;

      doors.forEach((door) => {
        totalBoxes += door.boxes.length;
        door.boxes.forEach((box) => {
          totalAssetsCount += box.assets.length;
          box.inventories.forEach((inv) => {
            totalMaterialsUnits += inv.quantity;
          });
        });
      });

      return NextResponse.json({
        success: true,
        reportType: "INVENTORY",
        title: "Inventário Físico Consolidado do Armário Central de TI",
        generatedAt: new Date(),
        summary: {
          totalDoors: doors.length,
          totalBoxes,
          totalMaterialsUnits,
          totalAssetsCount,
        },
        data: doors,
      });
    }

    // ----------------------------------------------------
    // RELATÓRIO 2: ESTOQUE CRÍTICO & SUGESTÃO DE COMPRA
    // ----------------------------------------------------
    if (reportType === "CRITICAL_STOCK") {
      const items = await prisma.item.findMany({
        where: {
          active: true,
          categoryId: categoryId && categoryId !== "ALL" ? categoryId : undefined,
        },
        include: {
          category: true,
          inventories: {
            include: {
              box: { include: { door: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const criticalItems: any[] = [];
      const lowItems: any[] = [];
      const normalItems: any[] = [];

      let totalUnitsNeeded = 0;

      items.forEach((item) => {
        const currentQty = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
        const diffToIdeal = Math.max(0, item.idealStock - currentQty);

        const itemData = {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          category: item.category?.name || "Geral",
          minStock: item.minStock,
          idealStock: item.idealStock,
          currentStock: currentQty,
          suggestedPurchase: diffToIdeal,
          boxes: item.inventories.map((inv) => `${inv.box.door?.name || "Porta"}/${inv.box.name} (${inv.quantity} ${item.unit})`).join("; "),
        };

        if (currentQty <= 0 || currentQty <= Math.floor(item.minStock / 2)) {
          criticalItems.push({ ...itemData, status: "CRITICAL" });
          totalUnitsNeeded += diffToIdeal;
        } else if (currentQty <= item.minStock) {
          lowItems.push({ ...itemData, status: "LOW" });
          totalUnitsNeeded += diffToIdeal;
        } else {
          normalItems.push({ ...itemData, status: "NORMAL" });
        }
      });

      return NextResponse.json({
        success: true,
        reportType: "CRITICAL_STOCK",
        title: "Relatório de Estoque Crítico e Sugestão de Compra",
        generatedAt: new Date(),
        summary: {
          totalCatalogItems: items.length,
          criticalCount: criticalItems.length,
          lowCount: lowItems.length,
          normalCount: normalItems.length,
          totalUnitsNeeded,
        },
        data: {
          criticalItems,
          lowItems,
          normalItems,
          allItems: [...criticalItems, ...lowItems, ...normalItems],
        },
      });
    }

    // ----------------------------------------------------
    // RELATÓRIO 3: HISTÓRICO DE EMPRÉSTIMOS & PONTUALIDADE
    // ----------------------------------------------------
    if (reportType === "LOANS") {
      const loans = await prisma.loan.findMany({
        where: {
          loanDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          asset: {
            include: {
              item: { include: { category: true } },
            },
          },
          createdByUser: {
            select: { name: true, email: true },
          },
          receivedByUser: {
            select: { name: true },
          },
        },
        orderBy: { loanDate: "desc" },
      });

      let returnedOnTime = 0;
      let returnedOverdue = 0;
      let returnedDamaged = 0;
      let activeCount = 0;

      const now = new Date();

      loans.forEach((l) => {
        if (l.status === "RETURNED") {
          if (l.actualReturnDate && new Date(l.actualReturnDate) <= new Date(l.expectedReturnDate)) {
            returnedOnTime++;
          } else {
            returnedOverdue++;
          }
        } else if (l.status === "RETURNED_DAMAGED") {
          returnedDamaged++;
        } else if (l.status === "ACTIVE" || l.status === "OVERDUE") {
          activeCount++;
        }
      });

      const totalConcluded = returnedOnTime + returnedOverdue + returnedDamaged;
      const punctualityRate = totalConcluded > 0
        ? Math.round((returnedOnTime / totalConcluded) * 100)
        : 100;

      return NextResponse.json({
        success: true,
        reportType: "LOANS",
        title: "Relatório de Empréstimos, Devoluções e Pontualidade",
        generatedAt: new Date(),
        summary: {
          totalLoans: loans.length,
          activeCount,
          returnedOnTime,
          returnedOverdue,
          returnedDamaged,
          punctualityRate,
        },
        data: loans,
      });
    }

    // ----------------------------------------------------
    // RELATÓRIO 4: MANUTENÇÃO, CUSTOS & LÂMPADAS
    // ----------------------------------------------------
    if (reportType === "MAINTENANCE") {
      const maintenances = await prisma.maintenance.findMany({
        where: {
          entryDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          asset: {
            include: {
              item: { include: { category: true } },
            },
          },
          createdByUser: { select: { name: true } },
          completedByUser: { select: { name: true } },
        },
        orderBy: { entryDate: "desc" },
      });

      let totalCost = 0;
      let completedCount = 0;
      let pendingCount = 0;
      let totalLampsReplaced = 0;

      maintenances.forEach((m) => {
        if (m.cost) totalCost += Number(m.cost);
        if (m.status === "COMPLETED") completedCount++;
        if (m.status === "IN_PROGRESS" || m.status === "PENDING") pendingCount++;
        if (m.replacedParts && m.replacedParts.toLowerCase().includes("lâmpada")) {
          totalLampsReplaced++;
        }
      });

      return NextResponse.json({
        success: true,
        reportType: "MAINTENANCE",
        title: "Relatório de Ordens de Serviço, Reparos e Custos Técnicos",
        generatedAt: new Date(),
        summary: {
          totalOrders: maintenances.length,
          completedCount,
          pendingCount,
          totalCost,
          totalLampsReplaced,
        },
        data: maintenances,
      });
    }

    // ----------------------------------------------------
    // RELATÓRIO 5: EXTRATO DE MOVIMENTAÇÕES DE ESTOQUE
    // ----------------------------------------------------
    if (reportType === "MOVEMENTS") {
      const movements = await prisma.stockMovement.findMany({
        where: {
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          item: { include: { category: true } },
          sourceBox: { include: { door: true } },
          destBox: { include: { door: true } },
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      let entriesCount = 0;
      let exitsCount = 0;
      let transfersCount = 0;

      movements.forEach((mov) => {
        if (mov.type === "ENTRY" || mov.type === "RETURN") entriesCount += mov.quantity;
        if (mov.type === "EXIT" || mov.type === "WRITE_OFF") exitsCount += mov.quantity;
        if (mov.type === "TRANSFER") transfersCount += mov.quantity;
      });

      return NextResponse.json({
        success: true,
        reportType: "MOVEMENTS",
        title: "Extrato Cronológico de Movimentações de Estoque",
        generatedAt: new Date(),
        summary: {
          totalMovements: movements.length,
          totalEntriesQty: entriesCount,
          totalExitsQty: exitsCount,
          totalTransfersQty: transfersCount,
        },
        data: movements,
      });
    }

    return NextResponse.json(
      { success: false, error: "Tipo de relatório inválido." },
      { status: 400 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar relatório." },
      { status: 500 }
    );
  }
}
