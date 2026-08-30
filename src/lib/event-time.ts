/**
 * Utilitário de tempo e fuso horário para eventos (Fuso Oficial: America/Fortaleza - Ceará / Juazeiro do Norte - UTC-3)
 */

/**
 * Converte qualquer Date ou string para YYYY-MM-DD no fuso horário local (America/Fortaleza / UTC-3).
 */
export function getBrazilDateString(date: Date | string): string {
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return date.trim();
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  return "";
}

/**
 * Converte data e hora de um evento para timestamp absoluto considerando o fuso de Fortaleza/Ceará (UTC-3).
 */
export function getEventStartTimestamp(
  date: Date | string | null | undefined,
  time?: string | null
): number | null {
  if (!date) return null;

  const dateStr = getBrazilDateString(date);
  if (!dateStr || !dateStr.includes("-")) return null;

  const [year, month, day] = dateStr.split("-").map(Number);

  // Se o evento não possui horário específico cadastrado
  if (!time || !/^\d{1,2}:\d{2}$/.test(time.trim())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoWithTimezone = `${year}-${pad(month)}-${pad(day)}T23:59:59-03:00`;
    const parsed = new Date(isoWithTimezone);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const parts = time.trim().split(":").map(Number);
  const hours = parts[0];
  const minutes = parts[1];

  const pad = (n: number) => String(n).padStart(2, "0");
  // Horário oficial do Brasil / Amapá (UTC-3)
  const isoWithTimezone = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-03:00`;
  const parsed = new Date(isoWithTimezone);

  if (isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

/**
 * Verifica se um usuário com papel OPERADOR ou GESTOR tem permissão de tempo para excluir o evento.
 * Regra: Faltando 30 minutos ou mais para o início do evento -> Permitido.
 * Faltando menos de 30 minutos ou já iniciado -> Bloqueado.
 * Administrador -> Sempre permitido.
 */
export function canDeleteEventByRoleAndTime(
  userRole: string | undefined | null,
  event: { date?: Date | string | null; time?: string | null } | null | undefined
): { allowed: boolean; remainingMinutes?: number; reason?: string } {
  if (userRole === "ADMIN") {
    return { allowed: true };
  }

  if (userRole !== "OPERADOR" && userRole !== "GESTOR") {
    return { allowed: false, reason: "Perfil não possui permissão para excluir eventos." };
  }

  if (!event || !event.date) {
    // Sem data definida (rascunho): operador pode excluir
    return { allowed: true };
  }

  const startTimestamp = getEventStartTimestamp(event.date, event.time);
  if (!startTimestamp) {
    return { allowed: true };
  }

  const now = Date.now();
  const diffMinutes = (startTimestamp - now) / (1000 * 60);

  if (diffMinutes < 30) {
    return {
      allowed: false,
      remainingMinutes: Math.round(diffMinutes),
      reason:
        "Operadores só podem excluir eventos com mais de 30 minutos de antecedência do início. Para excluir este evento, solicite a um Administrador.",
    };
  }

  return { allowed: true, remainingMinutes: Math.round(diffMinutes) };
}
