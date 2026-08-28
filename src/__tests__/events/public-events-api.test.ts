import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPublicEvent } from "@/app/api/v1/public/events/[id]/route";
import { GET as getPublicPresences } from "@/app/api/v1/public/events/[id]/presences/route";
import { GET as getPublicPrizes } from "@/app/api/v1/public/events/[id]/prizes/route";
import { POST as bootstrapPresentation } from "@/app/api/v1/public/presentation/bootstrap/route";
import { POST as postPublicPresence } from "@/app/api/v1/public/events/[id]/presence/route";
import { GET as getAdminPresences } from "@/app/api/v1/events/[id]/presences/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { EventStatus, PresenceMethod } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    presence: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    prize: {
      findMany: vi.fn(),
    },
    eventParticipant: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Public Tokenized Events API & Security Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve rejeitar acesso público a /api/v1/public/events/[id] sem presentationToken", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-123");
    const res = (await getPublicEvent(req, { params: { id: "ev-123" } }))!;
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Token de apresentação obrigatório");
  });

  it("deve permitir acesso a /api/v1/public/events/[id] com presentationToken válido e omitir dados confidenciais", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-123",
      name: "Semana Acadêmica UniFAP",
      slug: "semana-academica-unifap",
      status: EventStatus.OPEN,
      presentationToken: "valid_secret_token_123",
      _count: { participants: 100, presences: 80, prizes: 4, winners: 0 },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-123?token=valid_secret_token_123");
    const res = (await getPublicEvent(req, { params: { id: "ev-123" } }))!;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.event.name).toBe("Semana Acadêmica UniFAP");
    expect(json.event.presentationToken).toBeUndefined(); // Token nunca deve vazar
  });

  it("deve sanitizar presenças no endpoint público para o telão (sem CPF nem matrícula)", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-123",
      presentationToken: "valid_token",
    } as any);

    vi.mocked(prisma.presence.count).mockResolvedValue(1);
    vi.mocked(prisma.presence.findMany).mockResolvedValue([
      {
        id: "pres-1",
        eventId: "ev-123",
        confidence: 0.98,
        capturedAt: new Date("2026-08-28T18:00:00Z"),
        person: {
          name: "Rivaldo Mascarenhas",
          photoUrl: "/photos/rivaldo.jpg",
        },
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-123/presences?token=valid_token");
    const res = (await getPublicPresences(req, { params: { id: "ev-123" } }))!;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].name).toBe("Rivaldo Mascarenhas");
    expect(json.items[0].cpf).toBeUndefined();
    expect(json.items[0].registration).toBeUndefined();
  });

  it("deve autenticar bootstrap de apresentação e retornar cookie HttpOnly", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-123",
      name: "Evento Teste",
      presentationToken: "token_seguro_bootstrap",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/public/presentation/bootstrap", {
      method: "POST",
      body: JSON.stringify({ eventId: "ev-123", token: "token_seguro_bootstrap" }),
    });

    const res = (await bootstrapPresentation(req))!;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(res.cookies.get("presentation_session")?.value).toBe("token_seguro_bootstrap");
  });

  it("deve bloquear requisições anônimas ao endpoint administrativo de presenças", async () => {
    const { getServerSession } = await import("next-auth");
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/v1/events/ev-123/presences");
    const res = (await getAdminPresences(req, { params: { id: "ev-123" } }))!;

    expect(res.status).toBe(401);
  });
});
