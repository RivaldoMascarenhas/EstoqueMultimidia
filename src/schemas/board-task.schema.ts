import { z } from "zod";
import { BoardTaskStatus, BoardTaskPriority } from "@prisma/client";

export const boardTaskCreateSchema = z.object({
  title: z
    .string({ required_error: "Título é obrigatório" })
    .trim()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string().trim().max(2000, "Descrição muito longa").optional().nullable(),
  priority: z.nativeEnum(BoardTaskPriority).default(BoardTaskPriority.MEDIUM),
  status: z.nativeEnum(BoardTaskStatus).default(BoardTaskStatus.TODO).optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Data de vencimento inválida"),
  assignedToId: z.string().optional().nullable(),
});

export const boardTaskUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título não pode ficar vazio")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .optional(),
  description: z.string().trim().max(2000, "Descrição muito longa").optional().nullable(),
  status: z.nativeEnum(BoardTaskStatus).optional(),
  priority: z.nativeEnum(BoardTaskPriority).optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Data de vencimento inválida"),
  assignedToId: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
  autoReassign: z.boolean().optional().default(true),
});

export type BoardTaskCreateInput = z.infer<typeof boardTaskCreateSchema>;
export type BoardTaskUpdateInput = z.infer<typeof boardTaskUpdateSchema>;
