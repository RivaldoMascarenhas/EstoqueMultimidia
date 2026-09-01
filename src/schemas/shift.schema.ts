import { z } from "zod";
import { Shift } from "@prisma/client";

export const shiftConfigItemSchema = z.object({
  shift: z.nativeEnum(Shift),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm)"),
  label: z.string().min(2, "Nome do turno é obrigatório"),
  emoji: z.string().optional().nullable(),
  orderIndex: z.number().int().nonnegative("A ordem não pode ser negativa").optional(),
});

export const updateShiftConfigsSchema = z.object({
  configs: z.array(shiftConfigItemSchema).min(1, "Envie pelo menos uma configuração de turno"),
});

export type ShiftConfigItemInput = z.infer<typeof shiftConfigItemSchema>;
export type UpdateShiftConfigsInput = z.infer<typeof updateShiftConfigsSchema>;
