import { z } from "zod";

export const assetCreateSchema = z.object({
  assetTag: z.string().min(2, "Número de patrimônio deve ter pelo menos 2 caracteres").toUpperCase(),
  itemId: z.string().min(1, "Selecione o tipo/modelo do item no catálogo"),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  currentBoxId: z.string().optional(),
  acquisitionDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "A data de aquisição não pode ser no futuro e deve ser válida"),
  purchaseDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "A data de compra não pode ser no futuro e deve ser válida"),
  acquisitionValue: z.number().nonnegative().optional(),
  purchaseValue: z.number().nonnegative().optional(), // alias
  warrantyExpiry: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Data de garantia inválida"),
  notes: z.string().optional(),
});

export const assetBatchCreateSchema = z.object({
  itemId: z.string().min(1, "Selecione o tipo/modelo do item no catálogo"),
  quantity: z.number().int().min(1, "A quantidade deve ser pelo menos 1").max(200, "Máximo de 200 itens por lote"),
  tagPrefix: z.string().default("PAT-").transform((v) => v.toUpperCase()),
  startNumber: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  model: z.string().optional(),
  currentBoxId: z.string().optional(),
  acquisitionDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "A data de aquisição não pode ser no futuro e deve ser válida"),
  purchaseDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "A data de compra não pode ser no futuro e deve ser válida"),
  acquisitionValue: z.number().nonnegative().optional(),
  purchaseValue: z.number().nonnegative().optional(),
  warrantyExpiry: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Data de garantia inválida"),
  notes: z.string().optional(),
});

export const assetStatusUpdateSchema = z.object({
  status: z.enum(["AVAILABLE", "LOANED", "IN_MAINTENANCE", "MAINTENANCE", "DAMAGED", "WRITTEN_OFF", "RETIRED", "LOST"]),
  reason: z.string().min(2, "Informe a justificativa da alteração de status"),
  currentBoxId: z.string().optional(),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetBatchCreateInput = z.infer<typeof assetBatchCreateSchema>;
export type AssetStatusUpdateInput = z.infer<typeof assetStatusUpdateSchema>;

