import { describe, it, expect, vi, beforeEach } from "vitest";
import { DrawService } from "@/services/draw.service";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { prisma } from "@/lib/prisma";
import { DrawType, PrizeStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    idempotencyRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    winner: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/services/draw-eligibility.service", () => ({
  DrawEligibilityService: {
    getEligibleParticipants: vi.fn(),
  },
}));

describe("DrawService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate cryptographically secure random integers within range", () => {
    const max = 10;
    for (let i = 0; i < 50; i++) {
      const idx = DrawService.getRandomIndex(max);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(max);
    }
  });

  it("should return cached result when idempotency key exists", async () => {
    const cachedPayload = {
      drawId: "draw-cached",
      drawnName: "Cached Winner",
      drawnNumber: 42,
    };

    vi.mocked(prisma.idempotencyRecord.findUnique).mockResolvedValue({
      id: "idem-1",
      key: "idem-key-123",
      eventId: "ev-1",
      result: JSON.stringify(cachedPayload),
      createdAt: new Date(),
    } as any);

    const result = await DrawService.executeDraw({
      eventId: "ev-1",
      prizeId: "prz-1",
      idempotencyKey: "idem-key-123",
    });

    expect(result.drawId).toBe("draw-cached");
    expect(result.drawnName).toBe("Cached Winner");
  });

  it("should atomically lock prize, select winner and create records in transaction", async () => {
    vi.mocked(prisma.idempotencyRecord.findUnique).mockResolvedValue(null);

    vi.mocked(DrawEligibilityService.getEligibleParticipants).mockResolvedValue([
      {
        personId: "p-10",
        participantId: "part-10",
        ticketNumber: 15,
        name: "Ana Beatriz",
        registration: "20261010",
        category: "Aluno",
        email: "ana@unifap.br",
      },
    ]);

    const mockTx = {
      prize: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "prz-1",
          name: "Tablet Samsung",
          description: "128GB",
          sponsor: null,
        }),
      },
      draw: {
        create: vi.fn().mockResolvedValue({
          id: "draw-new-1",
          timestamp: new Date(),
        }),
      },
      winner: {
        create: vi.fn().mockResolvedValue({ id: "win-1" }),
      },
      eventParticipant: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      idempotencyRecord: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });

    const result = await DrawService.executeDraw({
      eventId: "ev-1",
      prizeId: "prz-1",
      drawType: DrawType.PERSON,
    });

    expect(result.drawnName).toBe("Ana Beatriz");
    expect(result.drawnNumber).toBe(15);
    expect(mockTx.prize.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prz-1", eventId: "ev-1", status: PrizeStatus.AVAILABLE },
        data: { status: PrizeStatus.DRAWN },
      })
    );
  });
});
