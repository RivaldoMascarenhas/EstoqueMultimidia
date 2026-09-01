import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission, EventPermission } from "@/lib/event-permissions";

export interface AssertEventAccessResult {
  authorized: boolean;
  errorResponse?: NextResponse;
  event?: any;
}

export interface AssertEventAccessOptions {
  requiredPermission?: EventPermission | string;
  isMutation?: boolean;
}

/**
 * Validação centralizada de controle de acesso e escopo contextual a eventos (Anti-IDOR).
 * Garante que:
 * 1. O evento exista.
 * 2. ADMIN e GESTOR possuam acesso global institucional.
 * 3. OPERADOR possua acesso operacional.
 * 4. EVENTOS seja estritamente restrito aos eventos vinculados via EventUser(userId, eventId).
 * 5. CONSULTA possua acesso estritamente somente-leitura.
 * 6. Demais perfis (ex: ACADEMIC_SUPPORT) sejam bloqueados.
 */
export async function assertEventAccess(
  eventId: string,
  user: { id: string; role: Role },
  options: AssertEventAccessOptions = {}
): Promise<AssertEventAccessResult> {
  if (!eventId) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "ID do evento não informado." },
        { status: 400 }
      ),
    };
  }

  if (!user || !user.id || !user.role) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      ),
    };
  }

  // 1. Verificar se o evento existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      ),
    };
  }

  // 2. Administradores possuem acesso irrestrito
  if (user.role === Role.ADMIN) {
    return { authorized: true, event };
  }

  // 3. Bloqueio de papéis não autorizados no módulo de eventos (ex: ACADEMIC_SUPPORT)
  if (user.role === Role.ACADEMIC_SUPPORT) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Permissão insuficiente para o módulo de eventos." },
        { status: 403 }
      ),
    };
  }

  // 4. Verificação estrita de permissão funcional na matriz de roles (P2 defensivo)
  if (options.requiredPermission && !hasPermission(user.role, options.requiredPermission)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Permissão insuficiente para esta operação." },
        { status: 403 }
      ),
    };
  }

  // 5. Bloqueio de mutação para perfil CONSULTA
  if (user.role === Role.CONSULTA) {
    if (options.isMutation) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { success: false, error: "Perfil de consulta possui permissão apenas de leitura." },
          { status: 403 }
        ),
      };
    }
    return { authorized: true, event };
  }

  // 6. EVENTOS é estritamente restrito aos eventos vinculados via EventUser(userId, eventId)
  if (user.role === Role.EVENTOS) {
    const assignment = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: event.id,
        },
      },
    });

    if (!assignment) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { success: false, error: "Acesso negado. Usuário do perfil EVENTOS não possui vínculo atribuído a este evento." },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, event };
  }

  // 7. GESTOR e OPERADOR possuem acesso aos eventos conforme suas permissões institucionais
  if (user.role === Role.GESTOR || user.role === Role.OPERADOR) {
    return { authorized: true, event };
  }

  // Demais papéis não mapeados
  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { success: false, error: "Acesso não autorizado." },
      { status: 403 }
    ),
  };
}
