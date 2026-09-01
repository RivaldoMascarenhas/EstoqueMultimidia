import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role, PrizeStatus } from "@prisma/client";
import {
  canDeleteParticipant,
  canDeletePrize,
  canEditPrize,
  canCancelDraw,
  hasPermission,
  EVENT_PERMISSIONS,
} from "@/lib/event-permissions";
import { DELETE as deleteParticipantRoute } from "@/app/api/v1/events/[id]/participants/route";
import { DELETE as deletePrizeRoute } from "@/app/api/v1/events/[id]/prizes/[prizeId]/route";
import { DELETE as deleteDrawRoute } from "@/app/api/v1/events/[id]/draws/[drawId]/route";
import { DELETE as deleteEventRoute } from "@/app/api/v1/events/[id]/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    event: { findUnique: vi.fn(), delete: vi.fn() },
    eventUser: { findUnique: vi.fn() },
    eventParticipant: { findUnique: vi.fn(), delete: vi.fn() },
    presence: { deleteMany: vi.fn() },
    prize: { findUnique: vi.fn(), delete: vi.fn() },
    draw: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/event.service", () => ({
  EventService: {
    removeParticipant: vi.fn().mockResolvedValue({ id: "part-1" }),
    deletePrize: vi.fn().mockResolvedValue({ id: "prize-1" }),
    deleteEvent: vi.fn().mockResolvedValue({ id: "event-1" }),
  },
}));

vi.mock("@/services/draw.service", () => ({
  DrawService: {
    cancelDraw: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/services/realtime.service", () => ({
  realtimeService: {
    publish: vi.fn().mockResolvedValue(true),
  },
}));

describe("Event Permissions & State Validation Helpers", () => {
  describe("canDeleteParticipant", () => {
    it("deve permitir que o perfil EVENTOS remova participante SEM presença registrada", () => {
      const allowed = canDeleteParticipant(Role.EVENTOS, { hasPresence: false });
      expect(allowed).toBe(true);
    });

    it("deve BLOQUEAR que o perfil EVENTOS remova participante COM presença registrada", () => {
      const allowed = canDeleteParticipant(Role.EVENTOS, { hasPresence: true });
      expect(allowed).toBe(false);
    });

    it("deve permitir que ADMIN remova participante mesmo com presença registrada", () => {
      const allowed = canDeleteParticipant(Role.ADMIN, { hasPresence: true });
      expect(allowed).toBe(true);
    });

    it("deve bloquear que perfil CONSULTA ou ACADEMIC_SUPPORT remova participante", () => {
      expect(canDeleteParticipant(Role.CONSULTA, { hasPresence: false })).toBe(false);
      expect(canDeleteParticipant(Role.ACADEMIC_SUPPORT, { hasPresence: false })).toBe(false);
    });
  });

  describe("canDeletePrize", () => {
    it("deve permitir que o perfil EVENTOS remova prêmio DISPONÍVEL", () => {
      const allowed = canDeletePrize(Role.EVENTOS, { status: PrizeStatus.AVAILABLE });
      expect(allowed).toBe(true);
    });

    it("deve BLOQUEAR que o perfil EVENTOS remova prêmio já SORTEADO/WINNER", () => {
      const allowed = canDeletePrize(Role.EVENTOS, { status: PrizeStatus.DRAWN });
      expect(allowed).toBe(false);
    });

    it("deve BLOQUEAR que o perfil EVENTOS remova prêmio ENTREGUE/DELIVERED", () => {
      const allowed = canDeletePrize(Role.EVENTOS, { status: PrizeStatus.DELIVERED });
      expect(allowed).toBe(false);
    });

    it("deve permitir que ADMIN exclua prêmios mesmo se já sorteados", () => {
      const allowed = canDeletePrize(Role.ADMIN, { status: PrizeStatus.DRAWN });
      expect(allowed).toBe(true);
    });
  });

  describe("canEditPrize", () => {
    it("deve permitir que EVENTOS edite prêmio disponível", () => {
      expect(canEditPrize(Role.EVENTOS, { status: PrizeStatus.AVAILABLE })).toBe(true);
    });

    it("deve bloquear que EVENTOS edite prêmio sorteado", () => {
      expect(canEditPrize(Role.EVENTOS, { status: PrizeStatus.DRAWN })).toBe(false);
    });
  });

  describe("canCancelDraw", () => {
    it("deve bloquear que o perfil EVENTOS anule sorteios históricos", () => {
      expect(canCancelDraw(Role.EVENTOS)).toBe(false);
    });

    it("deve permitir que ADMIN e GESTOR anulem sorteios", () => {
      expect(canCancelDraw(Role.ADMIN)).toBe(true);
      expect(canCancelDraw(Role.GESTOR)).toBe(true);
    });
  });


  describe("Matriz de Permissões Genericas hasPermission", () => {
    it("deve conceder permissões corretas de eventos para o perfil EVENTOS", () => {
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.EVENTS_VIEW)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.EVENTS_CREATE)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.PARTICIPANTS_VIEW)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.PRESENCE_REGISTER)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.PRIZES_CREATE)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.DRAW_OPERATE)).toBe(true);
      expect(hasPermission(Role.EVENTOS, EVENT_PERMISSIONS.REPORTS_VIEW)).toBe(true);
      expect(hasPermission(Role.EVENTOS, "inventory:view")).toBe(false);
      expect(hasPermission(Role.EVENTOS, "users:manage")).toBe(false);
    });
  });
});

describe("API Security Guard & State Rules for Role EVENTOS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-1",
      name: "Evento Teste",
    } as any);
    vi.mocked(prisma.eventUser.findUnique).mockResolvedValue({
      id: "eu-1",
      userId: "u-eventos",
      eventId: "ev-1",
    } as any);
  });

  describe("DELETE /api/v1/events/[id]/participants (Exclusão com Validação de Presença)", () => {
    it("deve retornar 403 Forbidden se usuário EVENTOS tentar remover participante com presença registrada", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      // Participante possui presença registrada
      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({
        id: "ep-1",
        eventId: "ev-1",
        personId: "person-123",
        person: {
          id: "person-123",
          name: "Aluno Presente",
          presences: [{ id: "presence-1", eventId: "ev-1" }],
        },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1/participants?personId=person-123", {
        method: "DELETE",
      });

      const res = await deleteParticipantRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("presença confirmada");
    });

    it("deve permitir exclusão se usuário EVENTOS remover participante SEM presença registrada", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      // Participante sem presenças
      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({
        id: "ep-2",
        eventId: "ev-1",
        personId: "person-456",
        person: {
          id: "person-456",
          name: "Aluno Ausente",
          presences: [],
        },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1/participants?personId=person-456", {
        method: "DELETE",
      });

      const res = await deleteParticipantRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("DELETE /api/v1/events/[id]/prizes/[prizeId] (Exclusão com Validação de Prêmio Sorteado)", () => {
    it("deve retornar 403 Forbidden se usuário EVENTOS tentar excluir prêmio já sorteado (WINNER)", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      // Prêmio sorteado
      vi.mocked(prisma.prize.findUnique).mockResolvedValue({
        id: "prize-100",
        eventId: "ev-1",
        name: "Notebook Dell",
        status: PrizeStatus.DRAWN,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1/prizes/prize-100", {
        method: "DELETE",
      });

      const res = await deletePrizeRoute(req, { params: Promise.resolve({ id: "ev-1", prizeId: "prize-100" }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("já foi sorteado e não pode ser excluído");
    });

    it("deve permitir exclusão se usuário EVENTOS excluir prêmio ainda disponível (AVAILABLE)", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      // Prêmio disponível
      vi.mocked(prisma.prize.findUnique).mockResolvedValue({
        id: "prize-101",
        eventId: "ev-1",
        name: "Mochila UniFAP",
        status: PrizeStatus.AVAILABLE,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1/prizes/prize-101", {
        method: "DELETE",
      });

      const res = await deletePrizeRoute(req, { params: Promise.resolve({ id: "ev-1", prizeId: "prize-101" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("DELETE /api/v1/events/[id]/draws/[drawId] (Anulação Restrita de Sorteios)", () => {
    it("deve retornar 403 Forbidden se usuário EVENTOS tentar anular um sorteio", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1/draws/draw-999", {
        method: "DELETE",
      });

      const res = await deleteDrawRoute(req, { params: Promise.resolve({ id: "ev-1", drawId: "draw-999" }) });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/events/[id] (Exclusão com Regra de 30 minutos)", () => {
    it("deve permitir que usuário EVENTOS exclua evento com mais de 30 minutos de antecedência", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        name: "Evento Futuro",
        date: new Date("2099-12-31T00:00:00.000Z"),
        time: "18:00",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1", {
        method: "DELETE",
      });

      const res = await deleteEventRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("deve bloquear usuário EVENTOS se faltar menos de 30 minutos para o evento ou já iniciado", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-eventos", role: Role.EVENTOS, name: "Operador Eventos" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-eventos",
        active: true,
        role: Role.EVENTOS,
      } as any);

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        name: "Evento Próximo ou Passado",
        date: new Date("2020-01-01T00:00:00.000Z"),
        time: "10:00",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1", {
        method: "DELETE",
      });

      const res = await deleteEventRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("30 minutos de antecedência");
    });

    it("deve permitir que ADMIN exclua evento a qualquer momento", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "adm-1", role: Role.ADMIN, name: "Administrador" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "adm-1",
        active: true,
        role: Role.ADMIN,
      } as any);

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        name: "Evento Teste",
        date: new Date(Date.now() + 5 * 60 * 1000), // Começa em 5 min
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/events/ev-1", {
        method: "DELETE",
      });

      const res = await deleteEventRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res.status).toBe(200);
    });
  });
});
