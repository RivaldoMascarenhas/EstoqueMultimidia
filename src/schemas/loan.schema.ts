import { z } from "zod";

export const loanCreateSchema = z.object({
  assetId: z.string().min(1, "Selecione o equipamento a ser emprestado"),
  borrowerName: z.string().min(3, "Nome do solicitante deve ter pelo menos 3 caracteres"),
  borrowerEmail: z.string().min(1, "E-mail de quem ficará com o equipamento é obrigatório").email("Informe um e-mail institucional válido"),
  borrowerPhone: z.string().optional().or(z.literal("")),
  borrowerDepartment: z.string().optional().or(z.literal("")),
  destination: z.string().min(2, "Informe a sala, laboratório ou destino de uso"),
  expectedReturnDate: z.string().min(1, "Informe a data e horário previstos para devolução"),
  notes: z.string().optional().or(z.literal("")),
});

export const loanReturnSchema = z.object({
  condition: z.enum(["PERFECT", "DAMAGED"]),
  returnBoxId: z.string().min(1, "Selecione a caixa física onde o item foi guardado"),
  returnedCondition: z.string().optional().or(z.literal("")),
  returnNotes: z.string().optional().or(z.literal("")),
});

export const loanRenewSchema = z.object({
  newExpectedReturnDate: z.string().min(1, "Informe a nova data e horário previstos de devolução"),
  reason: z.string().min(3, "Informe a justificativa da renovação de prazo"),
});

export type LoanCreateInput = z.infer<typeof loanCreateSchema>;
export type LoanReturnInput = z.infer<typeof loanReturnSchema>;
export type LoanRenewInput = z.infer<typeof loanRenewSchema>;
