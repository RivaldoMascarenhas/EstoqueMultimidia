import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const SYSTEM_TIMEZONE = "America/Fortaleza";

/**
 * Retorna as informações decompostas do momento atual no fuso horário do sistema (Fortaleza / Nordeste - UTC-3).
 * Evita divergências quando executado em servidores com fuso UTC (ex: Vercel).
 */
export function getSystemNow(timeZone = SYSTEM_TIMEZONE) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const values: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      values[p.type] = p.value;
    }
  }

  const year = parseInt(values.year, 10);
  const month = parseInt(values.month, 10);
  const day = parseInt(values.day, 10);
  const rawHour = parseInt(values.hour, 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(values.minute, 10);
  const second = parseInt(values.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const totalMinutes = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
    totalMinutes,
  };
}

export function formatTimeInTimezone(
  date: Date | string | null | undefined,
  timeZone = SYSTEM_TIMEZONE
): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDate(
  date: Date | string | null | undefined,
  timeZone = SYSTEM_TIMEZONE
): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch (e) {
    return "-";
  }
}

/**
 * Converte Date para string 'YYYY-MM-DD' no fuso horário do sistema.
 * Essencial para <input type="date" /> sem sofrer adiantamento de dia por UTC.
 */
export function formatDateInput(
  date?: Date | string | null,
  timeZone = SYSTEM_TIMEZONE
): string {
  const d = date ? (typeof date === "string" ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return "";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(d);
    const values: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        values[p.type] = p.value;
      }
    }
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function formatDateTime(
  date: Date | string | null | undefined,
  timeZone = SYSTEM_TIMEZONE
): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch (e) {
    return "-";
  }
}

export type StockStatusLevel = "NORMAL" | "LOW" | "CRITICAL";

export function getStockStatusLevel(current: number, min: number, ideal: number): {
  level: StockStatusLevel;
  label: string;
  colorClass: string;
  badgeClass: string;
} {
  if (current <= 0 || current <= Math.floor(min / 2)) {
    return {
      level: "CRITICAL",
      label: "Crítico",
      colorClass: "text-rose-600 dark:text-rose-400",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    };
  }
  if (current <= min) {
    return {
      level: "LOW",
      label: "Baixo",
      colorClass: "text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  }
  return {
    level: "NORMAL",
    label: "Normal",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  };
}
