import { z } from "zod";
import { RequestStatus, RequestOrigin, ResourceType, RequestPriority, TaskType } from "@prisma/client";

export const requestItemInputSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  resourceType: z.nativeEnum(ResourceType).default(ResourceType.QUANTITATIVE),
  label: z.string().min(1, "Descrição do item é obrigatória"),
  quantity: z.number().int().min(1).default(1),
  separated: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const requestCreateSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  roomId: z.string().min(1, "Selecione a sala"),
  professorName: z.string().optional().nullable(),
  discipline: z.string().optional().nullable(),
  attendanceType: z.string().optional().nullable(),
  priority: z.nativeEnum(RequestPriority).default(RequestPriority.NORMAL),
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
  priority: z.nativeEnum(RequestPriority).optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(RequestStatus).optional(),
  assignedUserId: z.string().optional().nullable(),
  items: z.array(requestItemInputSchema).optional(),
});

export const requestTaskToggleSchema = z.object({
  completed: z.boolean(),
});

export const requestTaskCreateSchema = z.object({
  title: z.string().min(1, "Título da tarefa é obrigatório"),
  description: z.string().optional().nullable(),
  taskType: z.nativeEnum(TaskType).default(TaskType.CUSTOM),
});

export const requestAllocateAssetSchema = z.object({
  itemId: z.string().min(1, "Identificador do item é obrigatório"),
  assetId: z.string().min(1, "Selecione o patrimônio físico"),
});

export const requestSwapAssetSchema = z.object({
  itemId: z.string().min(1, "Identificador do item é obrigatório"),
  newAssetId: z.string().min(1, "Selecione o novo patrimônio"),
  reason: z.string().min(3, "Informe o motivo da substituição (mínimo 3 caracteres)"),
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
export type RequestTaskToggleInput = z.infer<typeof requestTaskToggleSchema>;
export type RequestTaskCreateInput = z.infer<typeof requestTaskCreateSchema>;
export type RequestAllocateAssetInput = z.infer<typeof requestAllocateAssetSchema>;
export type RequestSwapAssetInput = z.infer<typeof requestSwapAssetSchema>;
export type RequestLegacyConfirmInput = z.infer<typeof requestLegacyConfirmSchema>;
