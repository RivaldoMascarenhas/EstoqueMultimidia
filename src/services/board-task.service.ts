import { prisma } from "@/lib/prisma";
import { BoardTaskStatus, BoardTaskPriority, Role } from "@prisma/client";
import { BoardTaskCreateInput, BoardTaskUpdateInput } from "@/schemas/board-task.schema";
import { safeAuditLog } from "@/lib/audit";

export interface BoardTaskListFilters {
  status?: BoardTaskStatus;
  assignedToId?: string;
  priority?: BoardTaskPriority;
  search?: string;
}

export class BoardTaskService {
  /**
   * Lista tarefas com filtros opcionais, ordenadas por coluna e índice
   */
  static async list(filters?: BoardTaskListFilters) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    return prisma.boardTask.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { orderIndex: "asc" },
        { createdAt: "desc" },
      ],
    });
  }

  /**
   * Busca uma tarefa específica pelo ID com histórico recente
   */
  static async getById(id: string) {
    const task = await prisma.boardTask.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        history: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!task) {
      throw new Error("Tarefa não encontrada");
    }

    return task;
  }

  /**
   * Histórico detalhado da tarefa
   */
  static async getHistory(taskId: string) {
    return prisma.boardTaskHistory.findMany({
      where: { taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Criação de nova tarefa (ADMIN e GESTOR)
   */
  static async create(data: BoardTaskCreateInput, actingUserId: string, ipAddress?: string | null) {
    const targetStatus = data.status || BoardTaskStatus.TODO;

    // Obter próximo orderIndex da coluna
    const lastTask = await prisma.boardTask.findFirst({
      where: { status: targetStatus },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const orderIndex = (lastTask?.orderIndex ?? -1) + 1;

    // Se assignedToId não foi especificado, atribui ao criador
    const assignedToId = data.assignedToId || actingUserId;

    return prisma.$transaction(async (tx) => {
      const task = await tx.boardTask.create({
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || null,
          status: targetStatus,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          orderIndex,
          createdById: actingUserId,
          assignedToId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.boardTaskHistory.create({
        data: {
          taskId: task.id,
          userId: actingUserId,
          action: "CREATED",
          toStatus: targetStatus,
          details: `Tarefa criada no quadro (${targetStatus})`,
        },
      });

      await safeAuditLog(
        {
          userId: actingUserId,
          action: "BOARD_TASK_CREATE",
          entity: "BoardTask",
          entityId: task.id,
          details: {
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignedToId: task.assignedToId,
          },
          ipAddress,
        },
        tx
      );

      return task;
    });
  }

  /**
   * Atualização de tarefa e movimentação entre colunas com auto-reatribuição
   */
  static async moveOrUpdate(
    id: string,
    data: BoardTaskUpdateInput,
    actingUserId: string,
    ipAddress?: string | null
  ) {
    const existing = await prisma.boardTask.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new Error("Tarefa não encontrada");
    }

    const isStatusChange = Boolean(data.status && data.status !== existing.status);
    const newStatus = data.status || existing.status;

    // Regra central: qualquer edição ou movimentação reatribui a tarefa para o usuário logado
    // exceto se explicitamente desabilitado (autoReassign === false) e informado outro assignedToId
    let newAssignedToId: string | null | undefined = existing.assignedToId;
    if (data.autoReassign !== false) {
      newAssignedToId = actingUserId;
    } else if (data.assignedToId !== undefined) {
      newAssignedToId = data.assignedToId;
    }

    const isReassigned = newAssignedToId !== existing.assignedToId;

    // Tratar orderIndex
    let targetOrderIndex = data.orderIndex;
    if (targetOrderIndex === undefined && isStatusChange) {
      const lastInColumn = await prisma.boardTask.findFirst({
        where: { status: newStatus },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      targetOrderIndex = (lastInColumn?.orderIndex ?? -1) + 1;
    }

    return prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }
      if (newAssignedToId !== undefined) {
        updateData.assignedToId = newAssignedToId;
      }
      if (targetOrderIndex !== undefined) {
        updateData.orderIndex = targetOrderIndex;
      }

      const updated = await tx.boardTask.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Registrar histórico de status
      if (isStatusChange) {
        await tx.boardTaskHistory.create({
          data: {
            taskId: id,
            userId: actingUserId,
            action: "STATUS_CHANGE",
            fromStatus: existing.status,
            toStatus: newStatus,
            details: `Moveu de ${existing.status} para ${newStatus}`,
          },
        });
      }

      // Registrar histórico de reatribuição
      if (isReassigned) {
        await tx.boardTaskHistory.create({
          data: {
            taskId: id,
            userId: actingUserId,
            action: "REASSIGNED",
            details: `Reatribuído automaticamente ao operador ${updated.assignedTo?.name || actingUserId}`,
          },
        });
      }

      // Se houve edição de campos sem mudança de status nem reatribuição
      if (!isStatusChange && !isReassigned) {
        await tx.boardTaskHistory.create({
          data: {
            taskId: id,
            userId: actingUserId,
            action: "UPDATED",
            details: "Dados da tarefa atualizados",
          },
        });
      }

      await safeAuditLog(
        {
          userId: actingUserId,
          action: isStatusChange ? "BOARD_TASK_MOVE" : "BOARD_TASK_UPDATE",
          entity: "BoardTask",
          entityId: id,
          details: {
            previousStatus: existing.status,
            newStatus: updated.status,
            previousAssignedToId: existing.assignedToId,
            newAssignedToId: updated.assignedToId,
            changes: data,
          },
          ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Exclusão de tarefa (ADMIN e GESTOR)
   */
  static async remove(id: string, actingUserId: string, ipAddress?: string | null) {
    const existing = await prisma.boardTask.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      throw new Error("Tarefa não encontrada");
    }

    await prisma.$transaction(async (tx) => {
      await tx.boardTask.delete({
        where: { id },
      });

      await safeAuditLog(
        {
          userId: actingUserId,
          action: "BOARD_TASK_DELETE",
          entity: "BoardTask",
          entityId: id,
          details: { title: existing.title },
          ipAddress,
        },
        tx
      );
    });

    return { success: true };
  }

  /**
   * Lista usuários ativos elegíveis para atribuição no quadro
   * (ADMIN, GESTOR, OPERADOR)
   */
  static async listAssignableUsers() {
    return prisma.user.findMany({
      where: {
        active: true,
        role: {
          in: [Role.ADMIN, Role.GESTOR, Role.OPERADOR],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
