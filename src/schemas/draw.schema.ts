import { z } from "zod";
import { DrawType } from "@prisma/client";

export const executeDrawSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório"),
  prizeId: z.string().min(1, "ID do prêmio é obrigatório"),
  drawType: z.nativeEnum(DrawType).default(DrawType.PERSON),
  requireRegistration: z.boolean().default(true),
  requirePresence: z.boolean().default(true),
  requireFacialPresenceOnly: z.boolean().default(false),
  allowRepeatWinners: z.boolean().optional(),
  categoryFilter: z.string().optional().nullable(),
  minNumber: z.number().int().optional(),
  maxNumber: z.number().int().optional(),
  notes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export const deliverPrizeSchema = z.object({
  winnerId: z.string().min(1, "ID do ganhador é obrigatório"),
  delivered: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export type ExecuteDrawInput = z.infer<typeof executeDrawSchema>;
export type DeliverPrizeInput = z.infer<typeof deliverPrizeSchema>;
