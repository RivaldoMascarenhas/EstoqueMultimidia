import { RequestStatus, Role, ReservationStatus, TaskType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class RequestWorkflowService {
  /**
   * Tabela rígida de transições padrão para OPERADOR
   * AGENDADO -> EM_PREPARACAO -> PREPARADO -> EM_ATENDIMENTO -> FINALIZADO
   */
  private static readonly STRICT_OPERATOR_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
    [RequestStatus.AGENDADO]: [
      RequestStatus.EM_PREPARACAO,
      RequestStatus.CANCELADO,
      RequestStatus.PROBLEMA,
    ],
    [RequestStatus.EM_PREPARACAO]: [
      RequestStatus.AGENDADO, // Desfazer início
      RequestStatus.PREPARADO, // Concluir checklist
      RequestStatus.CANCELADO,
      RequestStatus.PROBLEMA,
    ],
    [RequestStatus.PREPARADO]: [
      RequestStatus.EM_PREPARACAO, // Voltar para ajuste
      RequestStatus.EM_ATENDIMENTO, // Entregue na sala
      RequestStatus.CANCELADO,
      RequestStatus.PROBLEMA,
    ],
    [RequestStatus.EM_ATENDIMENTO]: [
      RequestStatus.PREPARADO, // Reverter entrega
      RequestStatus.FINALIZADO, // Recolhido e finalizado
      RequestStatus.CANCELADO,
      RequestStatus.PROBLEMA,
    ],
    [RequestStatus.PROBLEMA]: [
      RequestStatus.EM_PREPARACAO, // Reabrir preparo ou troca de patrimônio
      RequestStatus.PREPARADO,     // Problema sanado
      RequestStatus.CANCELADO,     // Impossibilidade de atendimento
    ],
    [RequestStatus.FINALIZADO]: [],
    [RequestStatus.CANCELADO]: [],
  };

  /**
   * Verifica se uma transição direta é estruturalmente permitida para o perfil
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

    // Cancelado é terminal para todos os perfis
    if (fromStatus === RequestStatus.CANCELADO) {
      return false;
    }

    // ADMIN e GESTOR têm permissão de override estrutural
    if (userRole === Role.ADMIN || userRole === Role.GESTOR) {
      return true;
    }

    // OPERADOR segue a matriz rígida linear
    const allowed = this.STRICT_OPERATOR_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Validação estrita de transição com regras operacionais e de autorização
   */
  static validateTransition(
    request: {
      id: string;
      status: RequestStatus;
      createdById: string | null;
      tasks?: Array<{ id: string; taskType: TaskType; completed: boolean }>;
    },
    targetStatus: RequestStatus,
    user: { id: string; role: Role },
    justification?: string
  ): { isOverride: boolean } {
    if (request.status === targetStatus) {
      return { isOverride: false };
    }

    // 1. Regra de autorização para Apoio Acadêmico
    if (user.role === Role.ACADEMIC_SUPPORT) {
      if (targetStatus !== RequestStatus.CANCELADO) {
        throw new Error(
          "Permissão negada: o perfil Apoio Acadêmico não pode alterar o status operacional do atendimento."
        );
      }
      if (request.createdById !== user.id) {
        throw new Error(
          "Permissão negada: você só pode cancelar as solicitações criadas pelo seu próprio usuário."
        );
      }
      return { isOverride: false };
    }

    // 2. Não permitir reabrir chamados cancelados
    if (request.status === RequestStatus.CANCELADO) {
      throw new Error(
        "Não é possível alterar o status de uma solicitação que já foi cancelada."
      );
    }

    // 3. Verificação de transição padrão vs override para ADMIN / GESTOR
    const isStandardTransition = (this.STRICT_OPERATOR_TRANSITIONS[request.status] || []).includes(targetStatus);

    if (!isStandardTransition) {
      if (user.role === Role.ADMIN || user.role === Role.GESTOR) {
        // ADMIN / GESTOR fazendo salto não-linear (override)
        if (targetStatus === RequestStatus.FINALIZADO && request.status === RequestStatus.AGENDADO) {
          if (!justification || justification.trim().length < 5) {
            throw new Error(
              "Justificativa obrigatória: Para finalizar diretamente uma solicitação AGENDADA como Administrador/Gestor, informe uma justificativa técnica."
            );
          }
        }
        return { isOverride: true };
      } else {
        // OPERADOR tentando salto inválido
        throw new Error(
          `Transição de status inválida para operador: não é permitido mudar diretamente de "${request.status}" para "${targetStatus}". Siga o fluxo de preparação e entrega.`
        );
      }
    }

    return { isOverride: false };
  }

  /**
   * Aplica os efeitos colaterais atômicos de mudança de status (ex: liberar reservas)
   */
  static async applyStatusSideEffects(
    requestId: string,
    newStatus: RequestStatus,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    if (newStatus === RequestStatus.FINALIZADO) {
      // Concluir reservas ativas (libera o estoque e patrimônios)
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

  /**
   * Executa a transição completa de status de forma transacional e atômica
   */
  static async transition(
    requestId: string,
    targetStatus: RequestStatus,
    user: { id: string; role: Role; name?: string },
    options?: {
      justification?: string;
      tx?: Prisma.TransactionClient;
    }
  ) {
    const runner = async (tx: Prisma.TransactionClient) => {
      const request = await tx.request.findUniqueOrThrow({
        where: { id: requestId },
        include: { tasks: true, room: true },
      });

      const { isOverride } = this.validateTransition(
        request,
        targetStatus,
        user,
        options?.justification
      );

      const updated = await tx.request.update({
        where: { id: requestId },
        data: { status: targetStatus },
        include: {
          room: true,
          items: { include: { item: true, asset: true } },
          tasks: { orderBy: { orderIndex: "asc" } },
          reservations: true,
        },
      });

      await this.applyStatusSideEffects(requestId, targetStatus, tx);

      // Trilha de auditoria da transição
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: isOverride ? "WORKFLOW_STATUS_OVERRIDE" : "WORKFLOW_STATUS_TRANSITION",
          entity: "Request",
          entityId: requestId,
          details: {
            fromStatus: request.status,
            toStatus: targetStatus,
            isOverride,
            justification: options?.justification || null,
          },
        },
      });

      return updated;
    };

    if (options?.tx) {
      return await runner(options.tx);
    } else {
      return await prisma.$transaction(runner);
    }
  }
}
