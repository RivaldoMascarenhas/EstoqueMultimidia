import { describe, it, expect, vi, beforeEach } from "vitest";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { prisma } from "@/lib/prisma";
import { ParticipantStatus, PresenceMethod } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    eventParticipant: {
      findMany: vi.fn(),
    },
  },
}));

describe("DrawEligibilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter eligible candidates requiring presence and excluding inactive persons", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-1",
      allowRepeatWinners: false,
    } as any);

    vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
      {
        id: "part-1",
        eventId: "ev-1",
        personId: "p-1",
        ticketNumber: 1,
        category: "Aluno",
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "p-1",
          name: "João Silva",
          registration: "2026001",
          email: "joao@unifap.br",
          active: true,
          presences: [{ method: PresenceMethod.FACE, confidence: 0.95, status: "REGISTERED" }],
        },
      },
      {
        id: "part-2",
        eventId: "ev-1",
        personId: "p-2",
        ticketNumber: 2,
        category: "Aluno",
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "p-2",
          name: "Maria Santos",
          registration: "2026002",
          email: "maria@unifap.br",
          active: true,
          presences: [], // Ausente
        },
      },
    ] as any);

    const eligible = await DrawEligibilityService.getEligibleParticipants({
      eventId: "ev-1",
      requirePresence: true,
    });

    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("João Silva");
    expect(eligible[0].ticketNumber).toBe(1);
  });

  it("should filter only facial presence when requireFacialPresenceOnly is true", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "ev-1",
      allowRepeatWinners: false,
    } as any);

    vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
      {
        id: "part-1",
        eventId: "ev-1",
        personId: "p-1",
        ticketNumber: 1,
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "p-1",
          name: "João Facial",
          active: true,
          presences: [{ method: PresenceMethod.FACE, confidence: 0.92, status: "REGISTERED" }],
        },
      },
      {
        id: "part-2",
        eventId: "ev-1",
        personId: "p-2",
        ticketNumber: 2,
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "p-2",
          name: "Carlos Manual",
          active: true,
          presences: [{ method: PresenceMethod.MANUAL, confidence: null, status: "REGISTERED" }],
        },
      },
    ] as any);

    const eligible = await DrawEligibilityService.getEligibleParticipants({
      eventId: "ev-1",
      requirePresence: true,
      requireFacialPresenceOnly: true,
    });

    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("João Facial");
    expect(eligible[0].presenceMethod).toBe(PresenceMethod.FACE);
  });
});
