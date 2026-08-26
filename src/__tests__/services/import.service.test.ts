import { describe, it, expect } from "vitest";
import { ImportService } from "@/services/import.service";

describe("ImportService", () => {
  it("should parse CSV buffer and normalize diverse column names", () => {
    const csvData =
      "Nome Completo,Matricula,CPF,E-mail,Telefone,Categoria,Observacoes\n" +
      "Lucas Mendes,20265001,111.222.333-44,lucas@unifap.br,(88) 9999-8888,Aluno,Engenharia\n" +
      "Fernanda Lima,20265002,55566677788,fernanda@unifap.br,,Professor,Palestrante";

    const buffer = Buffer.from(csvData, "utf-8");
    const rows = ImportService.parseFile(buffer, "participantes.csv");

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Lucas Mendes");
    expect(rows[0].registration).toBe("20265001");
    expect(rows[0].cpf).toBe("11122233344");
    expect(rows[0].category).toBe("Aluno");

    expect(rows[1].name).toBe("Fernanda Lima");
    expect(rows[1].cpf).toBe("55566677788");
    expect(rows[1].category).toBe("Professor");
  });
});
