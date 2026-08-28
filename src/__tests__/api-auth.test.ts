import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateApiRequest, requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

describe("API Auth - validateApiRequest & requireApiPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve rejeitar requisição sem header de autenticação", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/external/query");
    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Token de autorização ausente.");
  });

  it("deve autenticar requisição com ApiKey válida e retornar permissões granulares", async () => {
    const rawToken = "unifap_live_abc123456789xyz";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      name: "n8n Bot",
      keyHash: hashed,
      keyPrefix: "unifap_live_abc123",
      role: Role.OPERADOR,
      permissions: ["inventory:read", "loan:create"],
      active: true,
      expiresAt: null,
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-1",
        name: "Admin",
        role: Role.ADMIN,
        active: true,
      },
    } as any);

    vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        "x-api-key": rawToken,
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(true);
    expect(result.role).toBe(Role.OPERADOR);
    expect(result.permissions).toEqual(["inventory:read", "loan:create"]);

    // Testar validação de permissões granulares
    const permRead = requireApiPermission(result, "inventory:read");
    expect(permRead.allowed).toBe(true);

    const permDelete = requireApiPermission(result, "inventory:delete");
    expect(permDelete.allowed).toBe(false);
    expect(permDelete.response?.status).toBe(403);
  });

  it("deve rejeitar ApiKey se o usuário proprietário estiver inativo no banco", async () => {
    const rawToken = "unifap_live_inactive_owner";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-inactive",
      name: "Bot Inativo",
      keyHash: hashed,
      keyPrefix: "unifap_live_inactive",
      role: Role.OPERADOR,
      permissions: ["inventory:read"],
      active: true,
      expiresAt: null,
      userId: "user-demoted",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-demoted",
        name: "Usuário Desativado",
        role: Role.OPERADOR,
        active: false, // Proprietário desativado!
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/proprietário da chave de API está inativo/);
  });

  it("deve rejeitar ApiKey revogada / inativa", async () => {
    const rawToken = "unifap_live_revoked_key";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-2",
      name: "Revoked Bot",
      keyHash: hashed,
      keyPrefix: "unifap_live_revoked",
      role: Role.OPERADOR,
      permissions: [],
      active: false,
      expiresAt: null,
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-1",
        name: "Admin",
        role: Role.ADMIN,
        active: true,
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Chave de API revogada ou inativa.");
  });

  it("deve rejeitar ApiKey expirada", async () => {
    const rawToken = "unifap_live_expired_key";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-3",
      name: "Expired Bot",
      keyHash: hashed,
      keyPrefix: "unifap_live_expired",
      role: Role.OPERADOR,
      permissions: [],
      active: true,
      expiresAt: new Date("2020-01-01"), // Expirado
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-1",
        name: "Admin",
        role: Role.ADMIN,
        active: true,
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Chave de API expirada.");
  });

  it("deve rejeitar acesso se a ApiKey não possuir o escopo explícito necessário (sem bypass de role)", async () => {
    const rawToken = "unifap_live_no_scope_key";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-4",
      name: "Bot Sem Escopo",
      keyHash: hashed,
      keyPrefix: "unifap_live_no_scope",
      role: Role.ADMIN, // Mesmo se tivesse role ADMIN gravada
      permissions: ["inventory:read"], // Mas não tem loan:create
      active: true,
      expiresAt: null,
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-1",
        name: "Admin",
        role: Role.ADMIN,
        active: true,
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/loans", {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    });

    const result = await validateApiRequest(req);
    expect(result.authenticated).toBe(true);

    const check = requireApiPermission(result, "loan:create");
    expect(check.allowed).toBe(false);
    expect(check.response?.status).toBe(403);
  });
});
