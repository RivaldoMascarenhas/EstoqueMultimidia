import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    if (!["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"].includes(session.user.role)) {
      return NextResponse.json({ success: true, data: [], unreadCount: 0 });
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
        assets: {
          where: { active: true },
          select: { id: true },
        },
      },
      take: 30,
    });

    for (const item of items) {
      let totalQty = 0;
      if (item.itemType === "MATERIAL") {
        totalQty = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      } else {
        totalQty = item.assets ? item.assets.length : 0;
      }

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

    // 4. Verificar Tarefas Atribuídas ao Usuário Logado (Quadro de Demandas)
    if (session.user?.id) {
      try {
        const myTasks = await prisma.boardTask.findMany({
          where: {
            assignedToId: session.user.id,
            status: { in: ["TODO", "IN_PROGRESS"] },
          },
          include: {
            createdBy: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        });

        for (const task of myTasks) {
          const isUrgent = task.priority === "URGENT";
          const isHigh = task.priority === "HIGH";
          const isOverdue = task.dueDate && new Date(task.dueDate) < now;

          const createdTime = new Date(task.createdAt);
          const isRecent = (now.getTime() - createdTime.getTime()) < 48 * 60 * 60 * 1000;

          notifications.push({
            id: `task-${task.id}`,
            type: "TASK_ASSIGNED" as any,
            title: isOverdue
              ? "Tarefa Atrasada no Quadro"
              : isUrgent
              ? "Demanda Urgente Atribuída"
              : isRecent
              ? "Nova Tarefa Atribuída"
              : "Tarefa em Andamento",
            description: `${task.title}${task.createdBy ? ` • por ${task.createdBy.name}` : ""}`,
            href: "/tarefas",
            severity: isUrgent || isOverdue ? "danger" : isHigh ? "warning" : "info",
            time: task.status === "TODO" ? "A fazer" : "Em andamento",
          });
        }
      } catch {
        // Fallback silencioso caso a tabela ainda não tenha sido inicializada
      }
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
