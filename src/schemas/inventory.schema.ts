import { z } from "zod";

export const stockEntrySchema = z.object({
  itemId: z.string().min(1, "Selecione o item"),
  boxId: z.string().min(1, "Selecione a caixa de destino"),
  quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
  observation: z.string().optional(),
});

export const stockExitSchema = z.object({
  itemId: z.string().min(1, "Selecione o item"),
  boxId: z.string().min(1, "Selecione a caixa de origem"),
  quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
  observation: z.string().optional().default("Baixa de material realizada no setor"),
});

export const stockTransferSchema = z.object({
  itemId: z.string().min(1, "Selecione o item"),
  sourceBoxId: z.string().min(1, "Selecione a caixa de origem"),
  destinationBoxId: z.string().min(1, "Selecione a caixa de destino"),
  quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
  observation: z.string().optional(),
}).refine((data) => data.sourceBoxId !== data.destinationBoxId, {
  message: "A caixa de destino deve ser diferente da caixa de origem",
  path: ["destinationBoxId"],
});

export const itemCreateSchema = z.object({
  name: z.string().min(2, "Nome do item deve ter pelo menos 2 caracteres"),
  sku: z.string().min(2, "SKU/Código deve ter pelo menos 2 caracteres").toUpperCase(),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  itemType: z.enum(["MATERIAL", "ASSET_EQUIPMENT"]).default("MATERIAL"),
  unit: z.string().default("UN"),
  description: z.string().optional(),
  minStock: z.number().int().nonnegative("Estoque mínimo não pode ser negativo").default(0),
  idealStock: z.number().int().nonnegative("Estoque ideal não pode ser negativo").default(0),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  initialBoxId: z.string().optional(),
  initialQuantity: z.number().int().nonnegative().optional(),
  batchQuantity: z.number().int().min(1).max(200).optional(),
  tagPrefix: z.string().optional(),
  startNumber: z.number().int().nonnegative().optional(),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "A data de aquisição não pode ser no futuro e deve ser válida"),
  acquisitionValue: z.number().nonnegative("O valor de aquisição não pode ser negativo").optional(),
  notes: z.string().optional(),
});

export const itemUpdateSchema = z.object({
  name: z.string().min(2, "Nome do item deve ter pelo menos 2 caracteres").optional(),
  sku: z.string().min(2, "SKU/Código deve ter pelo menos 2 caracteres").toUpperCase().optional(),
  categoryId: z.string().min(1, "Selecione uma categoria").optional(),
  itemType: z.enum(["MATERIAL", "ASSET_EQUIPMENT"]).optional(),
  unit: z.string().optional(),
  description: z.string().nullable().optional(),
  minStock: z.number().int().nonnegative("Estoque mínimo não pode ser negativo").optional(),
  idealStock: z.number().int().nonnegative("Estoque ideal não pode ser negativo").optional(),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockExitInput = z.infer<typeof stockExitSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
