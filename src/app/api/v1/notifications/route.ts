import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const notifications: Array<{
      id: string;
      type: "CRITICAL_STOCK" | "LOAN_DUE" | "MAINTENANCE_OPEN";
      title: string;
      description: string;
      href: string;
      severity: "danger" | "warning" | "info";
      time: string;
    }> = [];

    // 1. Verificar Estoque Crítico (itens com estoque total somado <= minStock)
    const items = await prisma.item.findMany({
      where: { active: true },
      include: {
        inventories: {
          select: { quantity: true },
        },
      },
      take: 30,
    });

    for (const item of items) {
      const totalQty = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      if (item.minStock > 0 && totalQty <= item.minStock) {
        notifications.push({
          id: `stock-${item.id}`,
          type: "CRITICAL_STOCK",
          title: "Estoque Crítico",
          description: `${item.name}: restam ${totalQty} ${item.unit} (mín: ${item.minStock})`,
          href: "/estoque",
          severity: totalQty === 0 ? "danger" : "warning",
          time: totalQty === 0 ? "Esgotado" : "Reposição",
        });
      }
    }

    // 2. Verificar Empréstimos Ativos Atrasados ou com Devolução Próxima
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueLoans = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        expectedReturnDate: {
          lte: tomorrow,
        },
      },
      include: {
        asset: {
          include: {
            item: true,
          },
        },
      },
      take: 5,
      orderBy: { expectedReturnDate: "asc" },
    });

    for (const loan of dueLoans) {
      const isOverdue = new Date(loan.expectedReturnDate) < now;
      const equipName = loan.asset?.item?.name || loan.asset?.model || "Equipamento";
      notifications.push({
        id: `loan-${loan.id}`,
        type: "LOAN_DUE",
        title: isOverdue ? "Empréstimo Atrasado" : "Empréstimo Vencendo Hoje",
        description: `${equipName} • ${loan.borrowerName} (${loan.destination})`,
        href: "/emprestimos",
        severity: isOverdue ? "danger" : "warning",
        time: isOverdue ? "Atrasado" : "Vence hoje",
      });
    }

    // 3. Verificar Chamados de Manutenção Abertos
    const openMaintenances = await prisma.maintenance.findMany({
      where: {
        status: "IN_PROGRESS",
      },
      include: {
        asset: {
          include: {
            item: true,
          },
        },
      },
      take: 4,
      orderBy: { entryDate: "desc" },
    });

    for (const maint of openMaintenances) {
      const equipName = maint.asset?.item?.name || maint.asset?.assetTag || "Equipamento";
      notifications.push({
        id: `maint-${maint.id}`,
        type: "MAINTENANCE_OPEN",
        title: "OS em Andamento",
        description: `${maint.orderNumber || "OS"} • ${equipName}: ${maint.issueDescription}`,
        href: "/manutencao",
        severity: maint.priority === "CRITICAL" || maint.priority === "HIGH" ? "danger" : "info",
        time: "Em reparo",
      });
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao carregar notificações." },
      { status: 500 }
    );
  }
}
