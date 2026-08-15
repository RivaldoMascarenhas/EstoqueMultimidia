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
  notes: z.string().optional(),
});

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockExitInput = z.infer<typeof stockExitSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
