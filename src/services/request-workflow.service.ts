import { RequestStatus, Role, ReservationStatus, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class RequestWorkflowService {
  /**
   * Tabela de transições de status permitidas por papel
   */
  private static readonly ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
    [RequestStatus.AGENDADO]: [
      RequestStatus.EM_PREPARACAO,
      RequestStatus.PREPARADO,
      RequestStatus.CANCELADO,
    ],
    [RequestStatus.EM_PREPARACAO]: [
      RequestStatus.AGENDADO,
      RequestStatus.PREPARADO,
      RequestStatus.EM_ATENDIMENTO,
      RequestStatus.CANCELADO,
    ],
    [RequestStatus.PREPARADO]: [
      RequestStatus.EM_PREPARACAO,
      RequestStatus.EM_ATENDIMENTO,
      RequestStatus.CANCELADO,
    ],
    [RequestStatus.EM_ATENDIMENTO]: [
      RequestStatus.PREPARADO,
      RequestStatus.FINALIZADO,
      RequestStatus.CANCELADO,
    ],
    [RequestStatus.FINALIZADO]: [
      // Estados finais - reabertura apenas por ADMIN/GESTOR
      RequestStatus.EM_ATENDIMENTO,
    ],
    [RequestStatus.CANCELADO]: [
      // Cancelado é terminal
    ],
  };

  /**
   * Verifica se uma transição direta é estruturalmente válida na máquina de estados
   */
  static canTransition(
    fromStatus: RequestStatus,
    toStatus: RequestStatus,
    userRole: Role
  ): boolean {
    if (fromStatus === toStatus) return true;

    // Apoio Acadêmico só pode transicionar para CANCELADO
    if (userRole === Role.ACADEMIC_SUPPORT) {
      return toStatus === RequestStatus.CANCELADO;
    }

    // ADMIN e GESTOR têm override com justificativa registrada em log
    if (userRole === Role.ADMIN || userRole === Role.GESTOR) {
      if (fromStatus === RequestStatus.CANCELADO) return false; // Cancelado não reabre
      return true;
    }

    const allowed = this.ALLOWED_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Validação estrita de transição com regras operacionais detalhadas
   */
  static validateTransition(
    request: {
      id: string;
      status: RequestStatus;
      createdById: string | null;
      tasks?: Array<{ id: string; taskType: TaskType; completed: boolean }>;
    },
    targetStatus: RequestStatus,
    user: { id: string; role: Role }
  ): void {
    if (request.status === targetStatus) return;

    // 1. Regra RBAC para Apoio Acadêmico
    if (user.role === Role.ACADEMIC_SUPPORT) {
      if (targetStatus !== RequestStatus.CANCELADO) {
        throw new Error("Permissão negada: o perfil Apoio Acadêmico não pode alterar o status de preparo ou atendimento interno.");
      }
      if (request.createdById !== user.id) {
        throw new Error("Permissão negada: você só pode cancelar as solicitações criadas pelo seu próprio usuário.");
      }
      return;
    }

    // 2. Não permitir reabrir chamados cancelados
    if (request.status === RequestStatus.CANCELADO) {
      throw new Error("Não é possível alterar o status de uma solicitação que já foi cancelada.");
    }

    // 3. Regra de Conclusão / Finalização direta
    if (targetStatus === RequestStatus.FINALIZADO) {
      // Se não for ADMIN/GESTOR forçando, verificar se passou por atendimento
      if (user.role === Role.OPERADOR && request.status === RequestStatus.AGENDADO) {
        throw new Error("Transição inválida: Não é permitido finalizar um atendimento direto do estado AGENDADO sem passar pela preparação e entrega.");
      }
    }

    // 4. Checagem na matriz de transições
    if (!this.canTransition(request.status, targetStatus, user.role)) {
      throw new Error(
        `Transição de status inválida: não é permitido mudar de "${request.status}" para "${targetStatus}".`
      );
    }
  }

  /**
   * Aplica os efeitos colaterais atômicos de mudança de status (ex: liberar reservas)
   */
  static async applyStatusSideEffects(
    requestId: string,
    newStatus: RequestStatus,
    tx: any = prisma
  ): Promise<void> {
    if (newStatus === RequestStatus.FINALIZADO) {
      // Marcar reservas ativas como concluídas (libera lock de estoque)
      await tx.reservation.updateMany({
        where: {
          requestId,
          status: ReservationStatus.ACTIVE,
        },
        data: {
          status: ReservationStatus.COMPLETED,
        },
      });
    } else if (newStatus === RequestStatus.CANCELADO) {
      // Cancelar todas as reservas ativas
      await tx.reservation.updateMany({
        where: {
          requestId,
          status: ReservationStatus.ACTIVE,
        },
        data: {
          status: ReservationStatus.CANCELLED,
        },
      });
    }
  }
}
