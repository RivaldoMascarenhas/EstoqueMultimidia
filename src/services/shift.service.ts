import { prisma } from "@/lib/prisma";
import { Shift, ShiftConfig } from "@prisma/client";
import { ShiftConfigItemInput } from "@/schemas/shift.schema";
import { formatTimeInTimezone, getSystemNow } from "@/lib/utils";

export interface ShiftInfo {
  shift: Shift;
  label: string;
  emoji: string;
  startTime: string;
  endTime: string;
  orderIndex: number;
}

export const DEFAULT_SHIFTS: ShiftInfo[] = [
  {
    shift: Shift.MORNING,
    label: "Manhã",
    emoji: "🌅",
    startTime: "07:00",
    endTime: "12:00",
    orderIndex: 1,
  },
  {
    shift: Shift.AFTERNOON,
    label: "Tarde",
    emoji: "☀️",
    startTime: "12:00",
    endTime: "18:00",
    orderIndex: 2,
  },
  {
    shift: Shift.NIGHT,
    label: "Noite",
    emoji: "🌙",
    startTime: "18:00",
    endTime: "22:30",
    orderIndex: 3,
  },
];

export class ShiftService {
  /**
   * Converte uma string "HH:mm" em minutos desde as 00:00 para comparações numéricas precisas.
   */
  static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
    return hours * 60 + minutes;
  }

  /**
   * Determina se um horário está estritamente fora de qualquer turno regular cadastrado
   * (ex: 04:00 da madrugada ou 23:30 da noite)
   */
  static isOutsideRegularShifts(
    timeInput: string | Date,
    configs?: (ShiftConfig | ShiftInfo)[]
  ): boolean {
    let timeStr: string;

    if (timeInput instanceof Date) {
      timeStr = formatTimeInTimezone(timeInput);
    } else if (typeof timeInput === "string") {
      if (timeInput.includes("T")) {
        timeStr = formatTimeInTimezone(new Date(timeInput));
      } else {
        timeStr = timeInput.trim();
      }
    } else {
      return false;
    }

    const targetMinutes = this.timeToMinutes(timeStr);
    const activeConfigs = configs && configs.length > 0 ? configs : DEFAULT_SHIFTS;

    const sorted = [...activeConfigs].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    const firstStart = this.timeToMinutes(sorted[0]?.startTime || "07:00");
    const lastEnd = this.timeToMinutes(sorted[sorted.length - 1]?.endTime || "22:30");

    return targetMinutes < firstStart || targetMinutes >= lastEnd;
  }

  /**
   * Determina o turno a partir de uma string "HH:mm" ou objeto Date,
   * respeitando as faixas configuradas no banco de dados ou a configuração padrão.
   *
   * Regra de limites exatos:
   * [startTime <= time < endTime]
   * - 07:00 -> MORNING
   * - 11:59 -> MORNING
   * - 12:00 -> AFTERNOON (transição exata)
   * - 17:59 -> AFTERNOON
   * - 18:00 -> NIGHT (transição exata)
   * - 21:59 -> NIGHT
   * - 22:00 -> NIGHT
   */
  static getShiftFromTime(
    timeInput: string | Date,
    configs?: (ShiftConfig | ShiftInfo)[]
  ): Shift {
    let timeStr: string;

    if (timeInput instanceof Date) {
      timeStr = formatTimeInTimezone(timeInput);
    } else if (typeof timeInput === "string") {
      if (timeInput.includes("T")) {
        timeStr = formatTimeInTimezone(new Date(timeInput));
      } else {
        timeStr = timeInput.trim();
      }
    } else {
      return Shift.MORNING;
    }

    const targetMinutes = this.timeToMinutes(timeStr);
    const activeConfigs = configs && configs.length > 0 ? configs : DEFAULT_SHIFTS;

    // Ordenar por início
    const sorted = [...activeConfigs].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    // 1. Checar se se encaixa em algum turno [startTime <= time < endTime]
    for (const config of sorted) {
      const startMin = this.timeToMinutes(config.startTime);
      const endMin = this.timeToMinutes(config.endTime);

      if (targetMinutes >= startMin && targetMinutes < endMin) {
        return config.shift;
      }
    }

    // 2. Se for antes do início do primeiro turno (ex: 06:30) -> Primeiro turno (Manhã)
    const firstShift = sorted[0];
    if (firstShift && targetMinutes < this.timeToMinutes(firstShift.startTime)) {
      return firstShift.shift;
    }

    // 3. Se for igual ou após o final do último turno (ex: 22:30, 23:00) -> Último turno (Noite)
    const lastShift = sorted[sorted.length - 1];
    if (lastShift && targetMinutes >= this.timeToMinutes(lastShift.endTime)) {
      return lastShift.shift;
    }

    return Shift.MORNING;
  }

  /**
   * Retorna os detalhes operacionais do turno incluindo verificação de fora de expediente
   */
  static getShiftDetails(
    timeInput: string | Date,
    configs?: (ShiftConfig | ShiftInfo)[]
  ): {
    shift: Shift;
    isOutsideShift: boolean;
    label: string;
    emoji: string;
    displayLabel: string;
  } {
    const shift = this.getShiftFromTime(timeInput, configs);
    const isOutside = this.isOutsideRegularShifts(timeInput, configs);
    const activeConfigs = configs && configs.length > 0 ? configs : DEFAULT_SHIFTS;
    const config = activeConfigs.find((c) => c.shift === shift) || DEFAULT_SHIFTS[0];

    return {
      shift,
      isOutsideShift: isOutside,
      label: config.label,
      emoji: config.emoji || "📅",
      displayLabel: isOutside ? `${config.label} (Fora do Expediente)` : config.label,
    };
  }

  /**
   * Obtém as configurações de turno cadastradas no banco de dados
   */
  static async getShiftConfigs(): Promise<ShiftInfo[]> {
    try {
      const dbConfigs = await prisma.shiftConfig.findMany({
        orderBy: { orderIndex: "asc" },
      });

      if (!dbConfigs || dbConfigs.length === 0) {
        return DEFAULT_SHIFTS;
      }

      return dbConfigs.map((c) => ({
        shift: c.shift,
        label: c.label,
        emoji: c.emoji || (c.shift === Shift.MORNING ? "🌅" : c.shift === Shift.AFTERNOON ? "☀️" : "🌙"),
        startTime: c.startTime,
        endTime: c.endTime,
        orderIndex: c.orderIndex,
      }));
    } catch {
      return DEFAULT_SHIFTS;
    }
  }

  /**
   * Identifica o turno atual com base no horário do sistema
   */
  static async getCurrentShift(): Promise<Shift> {
    const configs = await this.getShiftConfigs();
    const now = getSystemNow();
    return this.getShiftFromTime(now.timeStr, configs);
  }

  /**
   * Atualiza as configurações de horário dos turnos (Ação restrita a ADMIN)
   */
  static async updateShiftConfigs(
    newConfigs: ShiftConfigItemInput[],
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const updatedList = [];

      for (const item of newConfigs) {
        const record = await tx.shiftConfig.upsert({
          where: { shift: item.shift },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
            label: item.label,
            emoji: item.emoji || null,
            orderIndex: item.orderIndex ?? (item.shift === Shift.MORNING ? 1 : item.shift === Shift.AFTERNOON ? 2 : 3),
          },
          create: {
            shift: item.shift,
            startTime: item.startTime,
            endTime: item.endTime,
            label: item.label,
            emoji: item.emoji || null,
            orderIndex: item.orderIndex ?? (item.shift === Shift.MORNING ? 1 : item.shift === Shift.AFTERNOON ? 2 : 3),
          },
        });
        updatedList.push(record);
      }

      // Trilha de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE_SHIFT_CONFIGS",
          entity: "ShiftConfig",
          details: { updatedConfigs: newConfigs },
        },
      });

      return updatedList;
    });
  }
}
