import { Role, PrizeStatus } from "@prisma/client";

/**
 * Constantes de permissão explícitas do módulo de Eventos
 */
export const EVENT_PERMISSIONS = {
  // Eventos
  EVENTS_VIEW: "events:view",
  EVENTS_CREATE: "events:create",
  EVENTS_EDIT: "events:edit",
  EVENTS_DELETE: "events:delete",

  // Participantes
  PARTICIPANTS_VIEW: "events:participants:view",
  PARTICIPANTS_CREATE: "events:participants:create",
  PARTICIPANTS_EDIT: "events:participants:edit",
  PARTICIPANTS_DELETE: "events:participants:delete",

  // Presenças
  PRESENCE_VIEW: "events:presence:view",
  PRESENCE_REGISTER: "events:presence:register",
  PRESENCE_EDIT: "events:presence:edit",
  PRESENCE_DELETE: "events:presence:delete",

  // Prêmios
  PRIZES_VIEW: "events:prizes:view",
  PRIZES_CREATE: "events:prizes:create",
  PRIZES_EDIT: "events:prizes:edit",
  PRIZES_DELETE: "events:prizes:delete",

  // Sorteios
  DRAW_VIEW: "events:draw:view",
  DRAW_OPERATE: "events:draw:operate",
  DRAW_DELETE: "events:draw:delete",
  DRAW_INVALIDATE: "events:draw:invalidate",

  // Ganhadores & Entrega
  WINNERS_VIEW: "events:winners:view",
  WINNERS_DELIVER: "events:winners:deliver",
  WINNERS_DELETE: "events:winners:delete",

  // Relatórios
  REPORTS_VIEW: "events:reports:view",

  // Apresentação & Telão
  PRESENTATION_MANAGE: "events:presentation:manage",
} as const;

export type EventPermission = (typeof EVENT_PERMISSIONS)[keyof typeof EVENT_PERMISSIONS];

/**
 * Matriz de Permissões por Papel
 */
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: [
    "*", // Acesso irrestrito
  ],
  GESTOR: [
    EVENT_PERMISSIONS.EVENTS_VIEW,
    EVENT_PERMISSIONS.EVENTS_CREATE,
    EVENT_PERMISSIONS.EVENTS_EDIT,
    EVENT_PERMISSIONS.EVENTS_DELETE,
    EVENT_PERMISSIONS.PARTICIPANTS_VIEW,
    EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
    EVENT_PERMISSIONS.PARTICIPANTS_EDIT,
    EVENT_PERMISSIONS.PARTICIPANTS_DELETE,
    EVENT_PERMISSIONS.PRESENCE_VIEW,
    EVENT_PERMISSIONS.PRESENCE_REGISTER,
    EVENT_PERMISSIONS.PRIZES_VIEW,
    EVENT_PERMISSIONS.PRIZES_CREATE,
    EVENT_PERMISSIONS.PRIZES_EDIT,
    EVENT_PERMISSIONS.PRIZES_DELETE,
    EVENT_PERMISSIONS.DRAW_VIEW,
    EVENT_PERMISSIONS.DRAW_OPERATE,
    EVENT_PERMISSIONS.DRAW_DELETE,
    EVENT_PERMISSIONS.DRAW_INVALIDATE,
    EVENT_PERMISSIONS.WINNERS_VIEW,
    EVENT_PERMISSIONS.WINNERS_DELIVER,
    EVENT_PERMISSIONS.REPORTS_VIEW,
    EVENT_PERMISSIONS.PRESENTATION_MANAGE,
  ],
  OPERADOR: [
    EVENT_PERMISSIONS.EVENTS_VIEW,
    EVENT_PERMISSIONS.EVENTS_CREATE,
    EVENT_PERMISSIONS.EVENTS_EDIT,
    EVENT_PERMISSIONS.EVENTS_DELETE,
    EVENT_PERMISSIONS.PARTICIPANTS_VIEW,
    EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
    EVENT_PERMISSIONS.PARTICIPANTS_EDIT,
    EVENT_PERMISSIONS.PARTICIPANTS_DELETE,
    EVENT_PERMISSIONS.PRESENCE_VIEW,
    EVENT_PERMISSIONS.PRESENCE_REGISTER,
    EVENT_PERMISSIONS.PRIZES_VIEW,
    EVENT_PERMISSIONS.PRIZES_CREATE,
    EVENT_PERMISSIONS.PRIZES_EDIT,
    EVENT_PERMISSIONS.PRIZES_DELETE,
    EVENT_PERMISSIONS.DRAW_VIEW,
    EVENT_PERMISSIONS.DRAW_OPERATE,
    EVENT_PERMISSIONS.WINNERS_VIEW,
    EVENT_PERMISSIONS.WINNERS_DELIVER,
    EVENT_PERMISSIONS.REPORTS_VIEW,
    EVENT_PERMISSIONS.PRESENTATION_MANAGE,
  ],
  EVENTOS: [
    EVENT_PERMISSIONS.EVENTS_VIEW,
    EVENT_PERMISSIONS.EVENTS_CREATE,
    EVENT_PERMISSIONS.EVENTS_EDIT,
    EVENT_PERMISSIONS.EVENTS_DELETE,
    EVENT_PERMISSIONS.PARTICIPANTS_VIEW,
    EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
    EVENT_PERMISSIONS.PARTICIPANTS_EDIT,
    EVENT_PERMISSIONS.PARTICIPANTS_DELETE,
    EVENT_PERMISSIONS.PRESENCE_VIEW,
    EVENT_PERMISSIONS.PRESENCE_REGISTER,
    EVENT_PERMISSIONS.PRIZES_VIEW,
    EVENT_PERMISSIONS.PRIZES_CREATE,
    EVENT_PERMISSIONS.PRIZES_EDIT,
    EVENT_PERMISSIONS.PRIZES_DELETE,
    EVENT_PERMISSIONS.DRAW_VIEW,
    EVENT_PERMISSIONS.DRAW_OPERATE,
    EVENT_PERMISSIONS.WINNERS_VIEW,
    EVENT_PERMISSIONS.WINNERS_DELIVER,
    EVENT_PERMISSIONS.REPORTS_VIEW,
    EVENT_PERMISSIONS.PRESENTATION_MANAGE,
  ],
  CONSULTA: [
    EVENT_PERMISSIONS.EVENTS_VIEW,
    EVENT_PERMISSIONS.PARTICIPANTS_VIEW,
    EVENT_PERMISSIONS.PRESENCE_VIEW,
    EVENT_PERMISSIONS.PRIZES_VIEW,
    EVENT_PERMISSIONS.DRAW_VIEW,
    EVENT_PERMISSIONS.WINNERS_VIEW,
    EVENT_PERMISSIONS.REPORTS_VIEW,
  ],
  ACADEMIC_SUPPORT: [
    // Apoio Acadêmico focado em agenda operacional
  ],
};

/**
 * Verifica se um papel possui permissão genérica
 */
export function hasPermission(role?: Role | null, permission?: string): boolean {
  if (!role) return false;
  if (role === Role.ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission || "");
}

/**
 * Helper de Validação de Estado: Exclusão de Participante
 * REGRA: O perfil EVENTOS pode remover participante SOMENTE se hasPresence === false.
 * ADMIN e GESTOR sempre podem.
 */
export function canDeleteParticipant(
  role: Role,
  participant: { hasPresence: boolean }
): boolean {
  if (role === Role.ADMIN || role === Role.GESTOR) return true;
  if (role !== Role.EVENTOS && role !== Role.OPERADOR) return false;
  return !participant.hasPresence;
}

/**
 * Helper de Validação de Estado: Exclusão de Prêmio
 * REGRA: O perfil EVENTOS só pode excluir prêmio se status === "AVAILABLE" (não sorteado).
 * ADMIN e GESTOR sempre podem.
 */
export function canDeletePrize(
  role: Role,
  prize: { status: PrizeStatus | string }
): boolean {
  if (role === Role.ADMIN || role === Role.GESTOR) return true;
  if (role !== Role.EVENTOS && role !== Role.OPERADOR) return false;
  return prize.status === PrizeStatus.AVAILABLE || prize.status === "AVAILABLE";
}

/**
 * Helper de Validação de Estado: Edição de Prêmio
 * REGRA: O perfil EVENTOS não pode alterar prêmio já sorteado.
 */
export function canEditPrize(
  role: Role,
  prize: { status: PrizeStatus | string }
): boolean {
  if (role === Role.ADMIN || role === Role.GESTOR) return true;
  if (role !== Role.EVENTOS && role !== Role.OPERADOR) return false;
  return prize.status === PrizeStatus.AVAILABLE || prize.status === "AVAILABLE";
}

/**
 * Helper de Validação de Estado: Cancelamento / Anulação de Sorteio
 * REGRA: Apenas ADMIN e GESTOR podem invalidar sorteios realizados.
 */
export function canCancelDraw(role: Role): boolean {
  return role === Role.ADMIN || role === Role.GESTOR;
}

/**
 * Helper de Validação de Estado: Exclusão de Presença
 * REGRA: Presenças são registros de auditoria inalteráveis por EVENTOS/OPERADOR. Apenas ADMIN.
 */
export function canDeletePresence(role: Role): boolean {
  return role === Role.ADMIN;
}

