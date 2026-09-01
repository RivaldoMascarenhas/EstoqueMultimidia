import { z } from "zod";
import { isValidPhone } from "@/lib/validators";

export const maintenanceTypeEnum = z.enum([
  "CORRECTIVE",
  "PREVENTIVE",
  "EXTERNAL",
  "INTERNAL",
]);

export const maintenancePriorityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const maintenanceStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const maintenanceCreateSchema = z.object({
  assetId: z.string().min(1, "Selecione o equipamento patrimonial"),
  issueDescription: z.string().min(3, "Descreva o defeito ou motivo da manutenção (mínimo 3 caracteres)"),
  maintenanceType: maintenanceTypeEnum.default("CORRECTIVE"),
  priority: maintenancePriorityEnum.default("MEDIUM"),
  serviceProvider: z.string().optional().or(z.literal("")),
  cost: z.number().min(0, "O custo não pode ser negativo").optional().nullable(),
  diagnosis: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  contactPhone: z
    .string()
    .refine((val) => !val || isValidPhone(val), "Telefone inválido")
    .optional()
    .or(z.literal("")),
  technicalNotes: z.string().optional().or(z.literal("")),
});

export const maintenanceUpdateSchema = z.object({
  issueDescription: z.string().min(3, "Descreva o defeito").optional(),
  maintenanceType: maintenanceTypeEnum.optional(),
  priority: maintenancePriorityEnum.optional(),
  status: maintenanceStatusEnum.optional(),
  serviceProvider: z.string().optional().or(z.literal("")),
  cost: z.number().min(0, "O custo não pode ser negativo").optional().nullable(),
  diagnosis: z.string().optional().or(z.literal("")),
  solution: z.string().optional().or(z.literal("")),
  technicalNotes: z.string().optional().or(z.literal("")),
  replacedParts: z.string().optional().or(z.literal("")),
  lampHours: z.number().int().min(0, "Horas não podem ser negativas").optional().nullable(),
  contactName: z.string().optional().or(z.literal("")),
  contactPhone: z
    .string()
    .refine((val) => !val || isValidPhone(val), "Telefone inválido")
    .optional()
    .or(z.literal("")),
});

export const maintenanceCompleteSchema = z.object({
  solution: z.string().min(3, "Descreva o laudo/solução técnica aplicada"),
  technicalNotes: z.string().optional().or(z.literal("")),
  replacedParts: z.string().optional().or(z.literal("")),
  lampHours: z.number().int().min(0).optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  outcome: z.enum(["AVAILABLE", "WRITTEN_OFF"]),
  returnBoxId: z.string().optional().nullable(),
  writeOffReason: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.outcome === "AVAILABLE" && (!data.returnBoxId || data.returnBoxId.trim() === "")) {
      return false;
    }
    return true;
  },
  {
    message: "Selecione a caixa física do armário para guardar o equipamento reparado",
    path: ["returnBoxId"],
  }
).refine(
  (data) => {
    if (data.outcome === "WRITTEN_OFF" && (!data.writeOffReason || data.writeOffReason.trim() === "")) {
      return false;
    }
    return true;
  },
  {
    message: "Informe a justificativa para baixa definitiva / descarte do equipamento",
    path: ["writeOffReason"],
  }
);

export const maintenanceCancelSchema = z.object({
  reason: z.string().min(3, "Informe a justificativa do cancelamento"),
  returnBoxId: z.string().optional().nullable(),
});

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>;
export type MaintenanceCompleteInput = z.infer<typeof maintenanceCompleteSchema>;
export type MaintenanceCancelInput = z.infer<typeof maintenanceCancelSchema>;
