import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { POST as testBiometricsRoute } from "@/app/api/v1/biometrics/test/route";
import { GET as getRequestsRoute, POST as createRequestRoute } from "@/app/api/v1/requests/route";
import { GET as getRequestByIdRoute } from "@/app/api/v1/requests/[id]/route";
import { RequestService } from "@/services/request.service";
import { DrawService } from "@/services/draw.service";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    eventUser: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    eventParticipant: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    presence: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    prize: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    draw: { findUnique: vi.fn(), delete: vi.fn(), count: vi.fn() },
    winner: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    request: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    requestTask: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    requestItem: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/biometric-api.service", () => ({
  BiometricApiService: {
    testBiometrics: vi.fn().mockResolvedValue({ success: true, recognized: true }),
  },
}));

describe("Security Audit Hardening Tests (SEC-01 to SEC-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SEC-01: assertEventAccess & EventUser Isolation", () => {
    it("deve permitir acesso global para ADMIN", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "admin-1", role: Role.ADMIN });
      expect(result.authorized).toBe(true);
      expect(result.event).toBeDefined();
    });

    it("deve permitir acesso global para GESTOR", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "gestor-1", role: Role.GESTOR });
      expect(result.authorized).toBe(true);
    });

    it("deve permitir acesso para OPERADOR com permissão correspondente", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "oper-1", role: Role.OPERADOR }, {
        requiredPermission: EVENT_PERMISSIONS.EVENTS_VIEW,
      });
      expect(result.authorized).toBe(true);
    });

    it("deve PERMITIR acesso para EVENTOS se vinculado via EventUser", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      vi.mocked(prisma.eventUser.findUnique).mockResolvedValue({
        id: "eu-1",
        userId: "user-eventos-1",
        eventId: "evt-1",
      } as any);

      const result = await assertEventAccess("evt-1", { id: "user-eventos-1", role: Role.EVENTOS });
      expect(result.authorized).toBe(true);
    });

    it("deve BLOQUEAR com 403 para EVENTOS se NÃO vinculado via EventUser (Anti-IDOR)", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-alheio" } as any);
      vi.mocked(prisma.eventUser.findUnique).mockResolvedValue(null);

      const result = await assertEventAccess("evt-alheio", { id: "user-eventos-1", role: Role.EVENTOS });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 mutação para perfil CONSULTA", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess(
        "evt-1",
        { id: "consulta-1", role: Role.CONSULTA },
        { isMutation: true }
      );
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 acesso ao módulo de eventos por ACADEMIC_SUPPORT", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "acad-1", role: Role.ACADEMIC_SUPPORT });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve retornar 404 se o evento não existir", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const result = await assertEventAccess("evt-inexistente", { id: "admin-1", role: Role.ADMIN });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(404);
    });
  });

  describe("SEC-02: Isolamento de Solicitações (Requests)", () => {
    it("deve BLOQUEAR com 403 o perfil EVENTOS em GET /api/v1/requests", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "eventos-1", role: Role.EVENTOS },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "eventos-1",
        role: Role.EVENTOS,
        active: true,
        mustChangePassword: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/requests");
      const res = await getRequestsRoute(req);
      expect(res.status).toBe(403);
    });

    it("deve aplicar escopo createdById para ACADEMIC_SUPPORT em GET /api/v1/requests", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "acad-1", role: Role.ACADEMIC_SUPPORT },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "acad-1",
        role: Role.ACADEMIC_SUPPORT,
        active: true,
        mustChangePassword: false,
      } as any);
      vi.mocked(prisma.request.findMany).mockResolvedValue([]);

      const req = new NextRequest("http://localhost:3000/api/v1/requests");
      const res = await getRequestsRoute(req);
      expect(res.status).toBe(200);

      // Confirma que prisma.request.findMany foi chamado com createdById = 'acad-1'
      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdById: "acad-1",
          }),
        })
      );
    });

    it("deve retornar 404 quando ACADEMIC_SUPPORT consulta solicitação de outro usuário em GET /api/v1/requests/[id]", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "acad-1", role: Role.ACADEMIC_SUPPORT },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "acad-1",
        role: Role.ACADEMIC_SUPPORT,
        active: true,
        mustChangePassword: false,
      } as any);
      vi.mocked(prisma.request.findUnique).mockResolvedValue({
        id: "req-alheio",
        createdById: "outro-usuario",
        room: { name: "Lab 01" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/requests/req-alheio");
      const res = await getRequestByIdRoute(req, { params: { id: "req-alheio" } });
      expect(res.status).toBe(404);
    });
  });

  describe("SEC-03: Bloqueio de Criação de Requests por EVENTOS e CONSULTA", () => {
    it("deve BLOQUEAR com 403 perfil EVENTOS em POST /api/v1/requests", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "eventos-1", role: Role.EVENTOS },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "eventos-1",
        role: Role.EVENTOS,
        active: true,
        mustChangePassword: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/requests", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-09-01",
          startTime: "08:00",
          endTime: "10:00",
          roomId: "room-1",
        }),
      });
      const res = await createRequestRoute(req);
      expect(res.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 perfil CONSULTA em POST /api/v1/requests", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "consulta-1", role: Role.CONSULTA },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "consulta-1",
        role: Role.CONSULTA,
        active: true,
        mustChangePassword: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/requests", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-09-01",
          startTime: "08:00",
          endTime: "10:00",
          roomId: "room-1",
        }),
      });
      const res = await createRequestRoute(req);
      expect(res.status).toBe(403);
    });
  });

  describe("SEC-04: Teste Biométrico Role Enforcement", () => {
    it("deve BLOQUEAR com 403 perfil CONSULTA em POST /api/v1/biometrics/test", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "consulta-1", role: Role.CONSULTA },
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "consulta-1",
        role: Role.CONSULTA,
        active: true,
        mustChangePassword: false,
      } as any);

      const formData = new FormData();
      formData.append("crop", new Blob(["fake-image"], { type: "image/jpeg" }));

      const req = new NextRequest("http://localhost:3000/api/v1/biometrics/test", {
        method: "POST",
        body: formData,
      });

      const res = await testBiometricsRoute(req);
      expect(res.status).toBe(403);
    });
  });

  describe("SEC-06: Validação de IDOR em Objetos Filhos", () => {
    it("deve rejeitar deleteTask se a tarefa pertencer a outro requestId", async () => {
      vi.mocked(prisma.requestTask.findUnique).mockResolvedValue({
        id: "task-1",
        requestId: "outro-request",
      } as any);

      await expect(
        RequestService.deleteTask("req-alvo", "task-1", "user-1")
      ).rejects.toThrow("Tarefa operacional não encontrada.");
    });

    it("deve rejeitar addTask se o requestId não existir", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(null);

      await expect(
        RequestService.addTask("req-inexistente", { title: "Test task", taskType: "CUSTOM" }, "user-1")
      ).rejects.toThrow("Solicitação de atendimento não encontrada.");
    });

    it("deve rejeitar cancelDraw se o sorteio pertencer a outro eventId", async () => {
      vi.mocked(prisma.draw.findUnique).mockResolvedValue({
        id: "draw-1",
        eventId: "outro-evento",
        prize: { quantity: 1 },
        winners: [],
      } as any);

      await expect(
        DrawService.cancelDraw({ drawId: "draw-1", eventId: "evento-atual" })
      ).rejects.toThrow("Sorteio não encontrado.");
    });

    it("deve rejeitar deliverPrize se o ganhador pertencer a outro eventId", async () => {
      vi.mocked(prisma.winner.findUnique).mockResolvedValue({
        id: "win-1",
        eventId: "outro-evento",
      } as any);

      await expect(
        DrawService.deliverPrize({ winnerId: "win-1", eventId: "evento-atual" })
      ).rejects.toThrow("Registro de premiação não encontrado.");
    });
  });

  describe("XSS: Sanitização de URL em formatImageUrl", () => {
    it("deve neutralizar esquemas perigosos (javascript:)", () => {
      expect(normalizeImageUrl("javascript:alert(document.domain)")).toBe("");
      expect(normalizeImageUrl("JAVASCRIPT:alert(1)")).toBe("");
    });

    it("deve neutralizar esquemas data: perigosos para HTML/SVG", () => {
      expect(normalizeImageUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("");
      expect(normalizeImageUrl("data:image/svg+xml;utf8,<svg onload=alert(1)>")).toBe("");
    });

    it("deve permitir URLs e imagens legítimas", () => {
      expect(normalizeImageUrl("https://exemplo.com/foto.jpg")).toBe("https://exemplo.com/foto.jpg");
      expect(normalizeImageUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
      expect(normalizeImageUrl("/brand/logo.png")).toBe("/brand/logo.png");
    });
  });
});
