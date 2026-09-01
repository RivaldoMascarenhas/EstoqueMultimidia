import { z } from "zod";
import { PrizeStatus } from "@prisma/client";
import { isValidPhone } from "@/lib/validators";

export const createPrizeSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório"),
  sponsorId: z.string().optional().nullable(),
  name: z.string().min(2, "Nome do prêmio deve ter pelo menos 2 caracteres").max(255),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  quantity: z.number().int().min(1, "Quantidade mínima é 1").default(1),
  estimatedValue: z.number().nonnegative("O valor estimado não pode ser negativo").optional().nullable(),
  order: z.number().int().default(0),
  status: z.nativeEnum(PrizeStatus).default(PrizeStatus.AVAILABLE),
});

export const updatePrizeSchema = createPrizeSchema.partial();

export const createSponsorSchema = z.object({
  name: z.string().min(2, "Nome do patrocinador é obrigatório").max(255),
  logoUrl: z.string().optional().nullable().or(z.literal("")),
  description: z.string().max(1000).optional().nullable(),
  website: z.string().optional().nullable().or(z.literal("")),
  instagram: z.string().max(100).optional().nullable(),
  phone: z
    .string()
    .refine((val) => !val || isValidPhone(val), "Telefone inválido. Formato esperado: (DDD) + 8 ou 9 dígitos")
    .optional()
    .nullable(),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreatePrizeInput = z.infer<typeof createPrizeSchema>;
export type UpdatePrizeInput = z.infer<typeof updatePrizeSchema>;
export type CreateSponsorInput = z.infer<typeof createSponsorSchema>;
