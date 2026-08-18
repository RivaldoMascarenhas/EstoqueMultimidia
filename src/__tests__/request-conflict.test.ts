import { describe, it, expect } from "vitest";
import { RequestService } from "@/services/request.service";

describe("RequestService - Validação de Conflito de Equipamento (Asset)", () => {
  it("deve detectar e bloquear reserva do mesmo Asset em horários sobrepostos", async () => {
    // Mock prisma transaction
    const startTime = new Date("2026-08-18T08:00:00Z");
    const endTime = new Date("2026-08-18T10:00:00Z");
    const assetId = "asset-notebook-1";

    const mockTx = {
      requestItem: {
        findMany: async () => [
          {
            id: "req-item-1",
            assetId: "asset-notebook-1",
            request: {
              id: "req-1",
              startTime: new Date("2026-08-18T08:30:00Z"),
              endTime: new Date("2026-08-18T11:00:00Z"),
              professorName: "Prof. Carlos",
              room: { name: "1A" },
              status: "AGENDADO",
            },
          },
        ],
      },
    };

    await expect(
      RequestService.validateAssetConflict(assetId, startTime, endTime, undefined, mockTx)
    ).rejects.toThrow(/Conflito de equipamento/);
  });

  it("deve permitir reserva do mesmo Asset em horários distintos sem sobreposição", async () => {
    const startTime = new Date("2026-08-18T14:00:00Z");
    const endTime = new Date("2026-08-18T16:00:00Z");
    const assetId = "asset-notebook-1";

    const mockTx = {
      requestItem: {
        findMany: async () => [],
      },
    };

    await expect(
      RequestService.validateAssetConflict(assetId, startTime, endTime, undefined, mockTx)
    ).resolves.toBeUndefined();
  });
});
