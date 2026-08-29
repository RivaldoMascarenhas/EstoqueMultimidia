import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as scannerLookup } from "@/app/api/v1/scanner/lookup/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    asset: { findFirst: vi.fn() },
    box: { findFirst: vi.fn() },
    loan: { findFirst: vi.fn() },
    maintenance: { findFirst: vi.fn() },
    item: { findFirst: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Scanner RBAC & LGPD Data Minimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u-1",
      active: true,
      role: Role.OPERADOR,
    } as any);
  });

  it("deve bloquear acesso ao scanner se usuário não estiver autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/v1/scanner/lookup", {
      method: "POST",
      body: JSON.stringify({ code: "LOAN-12345" }),
    });

    const res = await scannerLookup(req);
    expect(res.status).toBe(401);
  });

  it("deve mascarar e-mail e telefone do solicitante para usuário com perfil CONSULTA", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u-consulta", role: Role.CONSULTA, name: "Leitor" },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u-consulta",
      active: true,
      role: Role.CONSULTA,
    } as any);

    vi.mocked(prisma.loan.findFirst).mockResolvedValue({
      id: "loan-abc-12345",
      protocol: "LOAN-12345",
      borrowerName: "João da Silva",
      borrowerEmail: "joao.silva@unifapce.edu.br",
      borrowerPhone: "88999887766",
      borrowerDocument: "12345678900",
      borrowerWhatsapp: "88999887766",
      notes: "Observação confidencial do operador",
      asset: { id: "ast-1", assetTag: "PAT-001", item: { name: "Projetor" } },
      createdByUser: { name: "Admin", email: "admin@unifapce.edu.br" },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/scanner/lookup", {
      method: "POST",
      body: JSON.stringify({ code: "LOAN-12345" }),
    });

    const res = await scannerLookup(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.entityType).toBe("LOAN");
    // PII deve estar mascarado
    expect(json.data.borrowerEmail).toBe("j*****a@unifapce.edu.br");
    expect(json.data.borrowerPhone).toBe("(88) 9****-7766");
    expect(json.data.borrowerDocument).toBe("***.456.789-**");
    expect(json.data.notes).toBe("Informações restritas ao operador");
  });

  it("deve exibir dados completos para OPERADOR e ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u-admin", role: Role.ADMIN, name: "Administrador" },
    } as any);

    vi.mocked(prisma.loan.findFirst).mockResolvedValue({
      id: "loan-abc-12345",
      protocol: "LOAN-12345",
      borrowerName: "João da Silva",
      borrowerEmail: "joao.silva@unifapce.edu.br",
      borrowerPhone: "88999887766",
      borrowerDocument: "12345678900",
      borrowerWhatsapp: "88999887766",
      notes: "Observação confidencial do operador",
      asset: { id: "ast-1", assetTag: "PAT-001", item: { name: "Projetor" } },
      createdByUser: { name: "Admin", email: "admin@unifapce.edu.br" },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/scanner/lookup", {
      method: "POST",
      body: JSON.stringify({ code: "LOAN-12345" }),
    });

    const res = await scannerLookup(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.borrowerEmail).toBe("joao.silva@unifapce.edu.br");
    expect(json.data.borrowerPhone).toBe("88999887766");
    expect(json.data.borrowerDocument).toBe("12345678900");
    expect(json.data.notes).toBe("Observação confidencial do operador");
  });
});
