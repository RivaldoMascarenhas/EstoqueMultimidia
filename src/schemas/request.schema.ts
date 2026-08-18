import { z } from "zod";
import { RequestStatus, RequestOrigin } from "@prisma/client";

export const requestItemInputSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  label: z.string().min(1, "Descrição do item é obrigatória"),
  quantity: z.number().int().min(1).default(1),
  separated: z.boolean().default(false),
});

export const requestCreateSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  roomId: z.string().min(1, "Selecione a sala"),
  professorName: z.string().optional().nullable(),
  discipline: z.string().optional().nullable(),
  attendanceType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  origin: z.nativeEnum(RequestOrigin).default(RequestOrigin.MANUAL),
  assignedUserId: z.string().optional().nullable(),
  items: z.array(requestItemInputSchema).default([]),
  
  // Opções de Recorrência Semanal
  repeatWeekly: z.boolean().default(false),
  repeatUntilDate: z.string().optional().nullable(),
  repeatOccurrences: z.number().int().min(1).max(30).optional().nullable(),
});

export const requestUpdateSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  roomId: z.string().optional(),
  professorName: z.string().optional().nullable(),
  discipline: z.string().optional().nullable(),
  attendanceType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(RequestStatus).optional(),
  assignedUserId: z.string().optional().nullable(),
  items: z.array(requestItemInputSchema).optional(),
});

export const requestLegacyConfirmSchema = z.object({
  roomId: z.string().min(1, "Selecione a sala confirmada"),
  professorName: z.string().min(1, "Nome do professor"),
  discipline: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(requestItemInputSchema).optional(),
});

export type RequestItemInput = z.infer<typeof requestItemInputSchema>;
export type RequestCreateInput = z.infer<typeof requestCreateSchema>;
export type RequestUpdateInput = z.infer<typeof requestUpdateSchema>;
export type RequestLegacyConfirmInput = z.infer<typeof requestLegacyConfirmSchema>;
