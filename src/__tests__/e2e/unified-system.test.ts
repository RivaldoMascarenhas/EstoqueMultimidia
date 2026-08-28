import { describe, it, expect, vi } from "vitest";
import { ImportService } from "@/services/import.service";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { DrawService } from "@/services/draw.service";
import { DrawType, ParticipantStatus, PresenceMethod, PrizeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    eventParticipant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    person: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    presence: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    prize: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    idempotencyRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Unified System Integration Flow (Estoque + Eventos + Biometria + Sorteios)", () => {
  it("executes the complete unified workflow successfully", async () => {
    // 1. Import participants from CSV
    const csvContent =
      "Nome,Matricula,CPF,Categoria\n" +
      "Mariana Costa,20267001,11144477700,Aluno\n" +
      "Roberto Alves,20267002,22255588800,Professor";

    const parsedRows = await ImportService.parseFile(Buffer.from(csvContent), "inscritos.csv");
    expect(parsedRows).toHaveLength(2);
    expect(parsedRows[0].name).toBe("Mariana Costa");

    // 2. Mock Event & Participants in DB
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "event-unifap-2026",
      name: "Semana Acadêmica de Tecnologia 2026",
      allowRepeatWinners: false,
    } as any);

    // 3. Mock Presences: Mariana confirmed presence via FACE, Roberto is absent
    vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
      {
        id: "part-mariana",
        eventId: "event-unifap-2026",
        personId: "person-mariana",
        ticketNumber: 101,
        category: "Aluno",
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "person-mariana",
          name: "Mariana Costa",
          registration: "20267001",
          active: true,
          presences: [{ method: PresenceMethod.FACE, confidence: 0.96, status: "REGISTERED" }],
        },
      },
      {
        id: "part-roberto",
        eventId: "event-unifap-2026",
        personId: "person-roberto",
        ticketNumber: 102,
        category: "Professor",
        status: ParticipantStatus.ACTIVE,
        isWinner: false,
        person: {
          id: "person-roberto",
          name: "Roberto Alves",
          registration: "20267002",
          active: true,
          presences: [], // Ausente
        },
      },
    ] as any);

    // 4. Calculate Draw Eligibility (Must only return Mariana)
    const eligible = await DrawEligibilityService.getEligibleParticipants({
      eventId: "event-unifap-2026",
      requirePresence: true,
    });

    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("Mariana Costa");
    expect(eligible[0].ticketNumber).toBe(101);

    // 5. Execute Sorteio with atomic prize lock
    const mockTx = {
      prize: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "prize-alexa",
          name: "Echo Dot 5ª Geração",
          sponsor: null,
        }),
      },
      draw: {
        create: vi.fn().mockResolvedValue({
          id: "draw-sat-01",
          timestamp: new Date(),
        }),
      },
      winner: {
        create: vi.fn().mockResolvedValue({ id: "winner-sat-01" }),
      },
      eventParticipant: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

    const drawResult = await DrawService.executeDraw({
      eventId: "event-unifap-2026",
      prizeId: "prize-alexa",
      drawType: DrawType.PERSON,
      requirePresence: true,
    });

    expect(drawResult.drawnName).toBe("Mariana Costa");
    expect(drawResult.drawnNumber).toBe(101);
    expect(drawResult.prize.name).toBe("Echo Dot 5ª Geração");
  });
});
