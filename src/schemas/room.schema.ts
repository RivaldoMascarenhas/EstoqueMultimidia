import { z } from "zod";

export const fixedEquipmentSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional().nullable(),
  assetId: z.string({ required_error: "Patrimônio (assetId) é obrigatório" }),
  label: z.string().min(1, "Descrição do equipamento é obrigatória"),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const roomCreateSchema = z.object({
  name: z.string().min(1, "Nome da sala é obrigatório"),
  floor: z.string().optional().nullable(),
  block: z.string().optional().nullable(),
  active: z.boolean().default(true),
  fixedProjectorModel: z.string().optional().nullable(),
  vgaCableOk: z.boolean().optional().nullable(),
  hdmiCableOk: z.boolean().optional().nullable(),
  lampHours: z.number().int().min(0, "Horas da lâmpada não podem ser negativas").optional().nullable(),
  lampStatus: z.string().optional().nullable(),
  lastVisitAt: z.string().optional().nullable(),
  fixedEquipment: z.array(fixedEquipmentSchema).optional(),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export type FixedEquipmentInput = z.infer<typeof fixedEquipmentSchema>;
export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type RoomUpdateInput = z.infer<typeof roomUpdateSchema>;
