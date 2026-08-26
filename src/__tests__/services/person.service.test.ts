import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonService } from "@/services/person.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    person: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("PersonService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a person successfully when CPF is unique", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.person.create).mockResolvedValue({
      id: "p-new-1",
      name: "Gabriel Martins",
      cpf: "12345678900",
      registration: "20269999",
      email: "gabriel@unifap.br",
      phone: null,
      category: "Aluno",
      photoUrl: null,
      active: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const person = await PersonService.createPerson({
      name: "Gabriel Martins",
      cpf: "12345678900",
      registration: "20269999",
      email: "gabriel@unifap.br",
    });

    expect(person.id).toBe("p-new-1");
    expect(person.name).toBe("Gabriel Martins");
    expect(prisma.person.create).toHaveBeenCalled();
  });

  it("should throw an error when creating person with duplicate CPF", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: "p-existing",
      cpf: "12345678900",
    } as any);

    await expect(
      PersonService.createPerson({
        name: "Outro Nome",
        cpf: "12345678900",
      })
    ).rejects.toThrow(/Já existe uma pessoa cadastrada com o CPF/);
  });
});
