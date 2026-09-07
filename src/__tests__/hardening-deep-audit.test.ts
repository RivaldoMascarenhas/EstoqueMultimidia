/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET as searchGet } from "@/app/api/v1/search/route";
import { GET as auditLogsGet } from "@/app/api/v1/audit-logs/route";
import { GET as movementsGet } from "@/app/api/v1/movements/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    item: { findMany: vi.fn(), count: vi.fn() },
    asset: { findMany: vi.fn() },
    box: { findMany: vi.fn() },
    loan: { findMany: vi.fn() },
    maintenance: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    person: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn() },
    stockMovement: { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  },
}));

function mockSession(role = "ADMIN", active = true) {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "test-user", role } } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "test-user", role, active, mustChangePassword: false } as any);
}

const req = (path: string) => new NextRequest(`http://localhost:3000/api/v1/${path}`);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mockSession();
});

describe("Hardening Deep Audit - RBAC & Resource Protections", () => {
  describe("Audit Logs API (/api/v1/audit-logs)", () => {
    it("permite acesso apenas para ADMIN", async () => {
      mockSession("ADMIN");
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      const res = await auditLogsGet(req("audit-logs"));
      expect(res.status).toBe(200);
      expect(prisma.auditLog.findMany).toHaveBeenCalled();
    });

    it.each(["GESTOR", "OPERADOR", "CONSULTA", "ACADEMIC_SUPPORT", "EVENTOS"])(
      "bloqueia com 403 o perfil %s",
      async (role) => {
        mockSession(role);
        const res = await auditLogsGet(req("audit-logs"));
        expect(res.status).toBe(403);
        expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
      }
    );
  });

  describe("Busca Global (/api/v1/search) - Isolamento de Estoque e Patrimônio", () => {
    it.each(["ACADEMIC_SUPPORT", "EVENTOS"])(
      "não consulta nem retorna itens e patrimônios para o perfil %s",
      async (role) => {
        mockSession(role);
        vi.mocked(prisma.box.findMany).mockResolvedValue([]);
        vi.mocked(prisma.event.findMany).mockResolvedValue([]);
        vi.mocked(prisma.person.findMany).mockResolvedValue([]);

        const res = await searchGet(req("search?q=projetor"));
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json.data.items).toEqual([]);
        expect(json.data.assets).toEqual([]);
        expect(prisma.item.findMany).not.toHaveBeenCalled();
        expect(prisma.asset.findMany).not.toHaveBeenCalled();
      }
    );

    it.each(["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"])(
      "permite busca em itens e patrimônios para perfil interno %s",
      async (role) => {
        mockSession(role);
        vi.mocked(prisma.item.findMany).mockResolvedValue([]);
        vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
        vi.mocked(prisma.box.findMany).mockResolvedValue([]);
        vi.mocked(prisma.loan.findMany).mockResolvedValue([]);
        vi.mocked(prisma.maintenance.findMany).mockResolvedValue([]);
        vi.mocked(prisma.event.findMany).mockResolvedValue([]);
        vi.mocked(prisma.person.findMany).mockResolvedValue([]);

        const res = await searchGet(req("search?q=projetor"));
        expect(res.status).toBe(200);
        expect(prisma.item.findMany).toHaveBeenCalled();
        expect(prisma.asset.findMany).toHaveBeenCalled();
      }
    );
  });

  describe("Movimentações (/api/v1/movements) - Proteção contra DoS de consulta ilimitada", () => {
    it("aplica take padrão de 200 registros na consulta ao banco", async () => {
      mockSession("ADMIN");
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);

      const res = await movementsGet(req("movements"));
      expect(res.status).toBe(200);
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      );
    });

    it("respeita limit customizado informado na query", async () => {
      mockSession("ADMIN");
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);

      const res = await movementsGet(req("movements?limit=50"));
      expect(res.status).toBe(200);
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it("limita o take a no máximo 500 mesmo com limit excessivo", async () => {
      mockSession("ADMIN");
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);

      const res = await movementsGet(req("movements?limit=99999"));
      expect(res.status).toBe(200);
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 })
      );
    });
  });
});
