import { z } from "zod";

export const assetCreateSchema = z.object({
  assetTag: z.string().min(2, "Número de patrimônio deve ter pelo menos 2 caracteres").toUpperCase(),
  itemId: z.string().min(1, "Selecione o tipo/modelo do item no catálogo"),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  currentBoxId: z.string().optional(),
  acquisitionDate: z.string().optional(),
  purchaseDate: z.string().optional(), // alias
  acquisitionValue: z.number().nonnegative().optional(),
  purchaseValue: z.number().nonnegative().optional(), // alias
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
});

export const assetStatusUpdateSchema = z.object({
  status: z.enum(["AVAILABLE", "LOANED", "IN_MAINTENANCE", "MAINTENANCE", "DAMAGED", "WRITTEN_OFF", "RETIRED", "LOST"]),
  reason: z.string().min(2, "Informe a justificativa da alteração de status"),
  currentBoxId: z.string().optional(),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetStatusUpdateInput = z.infer<typeof assetStatusUpdateSchema>;
