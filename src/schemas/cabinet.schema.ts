import { z } from "zod";

export const boxCreateSchema = z.object({
  code: z.string().min(2, "Código da caixa deve ter pelo menos 2 caracteres (ex: C001)").toUpperCase(),
  name: z.string().min(2, "Nome da caixa deve ter pelo menos 2 caracteres"),
  doorId: z.string().min(1, "Selecione uma porta"),
  description: z.string().optional(),
});

export const doorCreateSchema = z.object({
  code: z.string().min(2, "Código da porta deve ter pelo menos 2 caracteres (ex: PORTA-1)").toUpperCase(),
  name: z.string().min(2, "Nome da porta deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

export type BoxCreateInput = z.infer<typeof boxCreateSchema>;
export type DoorCreateInput = z.infer<typeof doorCreateSchema>;
