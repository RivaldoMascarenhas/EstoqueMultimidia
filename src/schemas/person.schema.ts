import { z } from "zod";
import { isValidCPF, isValidPhone } from "@/lib/validators";

export const createPersonSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(255),
    cpf: z
      .string()
      .transform((val) => (val ? val.replace(/\D/g, "") : ""))
      .refine((val) => !val || isValidCPF(val), "CPF inválido")
      .optional()
      .nullable(),
    registration: z.string().max(50).optional().nullable(),
    email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
    phone: z
      .string()
      .max(50)
      .refine((val) => !val || isValidPhone(val), "Telefone inválido. Formato esperado: (DDD) + 8 ou 9 dígitos")
      .optional()
      .nullable(),
    category: z.string().min(1, "Categoria é obrigatória (ex: Aluno, Professor, Técnico, Visitante)"),
    affiliation: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    active: z.boolean().default(true).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.registration && data.registration.trim().length > 0) ||
      Boolean(data.cpf && data.cpf.trim().length > 0),
    {
      message: "Informe ao menos a Matrícula ou o CPF para identificação única da pessoa.",
      path: ["registration"],
    }
  );

export const updatePersonSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(255).optional(),
    cpf: z
      .string()
      .transform((val) => (val ? val.replace(/\D/g, "") : ""))
      .refine((val) => !val || isValidCPF(val), "CPF inválido")
      .optional()
      .nullable(),
    registration: z.string().max(50).optional().nullable(),
    email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
    phone: z
      .string()
      .max(50)
      .refine((val) => !val || isValidPhone(val), "Telefone inválido. Formato esperado: (DDD) + 8 ou 9 dígitos")
      .optional()
      .nullable(),
    category: z.string().min(1, "Categoria é obrigatória").optional().nullable(),
    affiliation: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    active: z.boolean().optional(),
  });

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
