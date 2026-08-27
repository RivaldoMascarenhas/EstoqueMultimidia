import { z } from "zod";
import { EventStatus, ParticipantStatus } from "@prisma/client";

export const createEventSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens")
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  date: z.string().or(z.date()).optional().nullable(),
  time: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  logoUrl: z.string().optional().nullable().or(z.literal("")),
  coverUrl: z.string().optional().nullable().or(z.literal("")),
  status: z.nativeEnum(EventStatus).optional().default(EventStatus.DRAFT),
  primaryColor: z.string().optional().default("#002B49"),
  secondaryColor: z.string().optional().default("#EAA023"),
  allowRepeatWinners: z.boolean().optional().default(false),
  maxParticipants: z.number().int().positive().optional().nullable(),
  checkinOpenMinutesBefore: z.number().int().optional().default(60),
});

export const updateEventSchema = createEventSchema.partial();

export const addParticipantSchema = z.object({
  personId: z.string().min(1, "ID da pessoa é obrigatório"),
  category: z.string().max(50).optional().nullable(),
  ticketNumber: z.number().int().positive().optional(),
});

export const manualPresenceSchema = z.object({
  personId: z.string().min(1, "ID da pessoa é obrigatório"),
});

export type CreateEventInput = z.input<typeof createEventSchema>;
export type UpdateEventInput = z.input<typeof updateEventSchema>;
export type AddParticipantInput = z.input<typeof addParticipantSchema>;
