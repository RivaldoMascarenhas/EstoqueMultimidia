import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateApiRequest } from "@/lib/api-auth";
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

describe("API Auth - validateApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve rejeitar requisição sem header de autenticação", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/external/query");
    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Token de autorização ausente.");
  });

  it("deve autenticar requisição com EXTERNAL_API_MASTER_KEY", async () => {
    process.env.EXTERNAL_API_MASTER_KEY = "test_master_secret_key_123456";

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        Authorization: "Bearer test_master_secret_key_123456",
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(true);
    expect(result.role).toBe(Role.ADMIN);
  });

  it("deve autenticar requisição com ApiKey válida pesquisada por SHA-256", async () => {
    const rawToken = "unifap_live_abc123456789xyz";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      name: "n8n Bot",
      keyHash: hashed,
      keyPrefix: "unifap_live_abc123",
      role: Role.OPERADOR,
      active: true,
      expiresAt: null,
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
      user: {
        id: "user-1",
        name: "Admin",
        email: "admin@unifap.br",
        role: Role.ADMIN,
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
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: hashed },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
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
      active: false,
      expiresAt: null,
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/external/query", {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    });

    const result = await validateApiRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Chave de API inativa ou revogada.");
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
      active: true,
      expiresAt: new Date("2020-01-01"), // Expirado
      userId: "user-1",
      createdAt: new Date(),
      lastUsedAt: null,
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
});
