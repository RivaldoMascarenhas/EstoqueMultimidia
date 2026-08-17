import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSession } from "@/lib/api-guard";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("API Guard - requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar erro 401 se o usuário não possuir sessão ativa", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const { session, error } = await requireSession();

    expect(session).toBeNull();
    expect(error).toBeDefined();
    expect(error?.status).toBe(401);

    const json = await error?.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Não autenticado.");
  });

  it("deve retornar erro 403 se o role do usuário não for permitido", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: "user-123",
        name: "Operador Teste",
        email: "operador@unifap.br",
        role: Role.OPERADOR,
      },
      expires: "2099-01-01",
    } as any);

    const { session, error } = await requireSession([Role.ADMIN]);

    expect(session).toBeNull();
    expect(error).toBeDefined();
    expect(error?.status).toBe(403);

    const json = await error?.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Permissão insuficiente.");
  });

  it("deve permitir acesso e retornar a sessão se o role for autorizado", async () => {
    const mockSession = {
      user: {
        id: "admin-123",
        name: "Admin Geral",
        email: "admin@unifap.br",
        role: Role.ADMIN,
      },
      expires: "2099-01-01",
    };
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

    const { session, error } = await requireSession([Role.ADMIN]);

    expect(error).toBeNull();
    expect(session).toEqual(mockSession);
  });

  it("deve permitir qualquer papel válido quando allowedRoles não for especificado", async () => {
    const mockSession = {
      user: {
        id: "consulta-123",
        name: "Usuário Consulta",
        email: "consulta@unifap.br",
        role: Role.CONSULTA,
      },
      expires: "2099-01-01",
    };
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

    const { session, error } = await requireSession();

    expect(error).toBeNull();
    expect(session).toEqual(mockSession);
  });
});
