import { describe, it, expect } from "vitest";
import { RequestService } from "@/services/request.service";
import { AssetStatus, ReservationStatus } from "@prisma/client";

describe("RequestService - Validação de Conflito de Equipamento (Asset)", () => {
  it("deve detectar e bloquear reserva do mesmo Asset em horários sobrepostos", async () => {
    const startTime = new Date("2026-08-18T08:00:00Z");
    const endTime = new Date("2026-08-18T10:00:00Z");
    const assetId = "asset-notebook-1";

    const mockTx = {
      asset: {
        findUnique: async () => ({
          id: assetId,
          assetTag: "004687",
          status: AssetStatus.AVAILABLE,
          active: true,
          currentRoomId: null,
          item: { name: "Notebook Dell i5" },
        }),
      },
      reservation: {
        findMany: async () => [
          {
            id: "res-1",
            assetId: "asset-notebook-1",
            startTime: new Date("2026-08-18T08:30:00Z"),
            endTime: new Date("2026-08-18T11:00:00Z"),
            status: ReservationStatus.ACTIVE,
            request: {
              id: "req-1",
              startTime: new Date("2026-08-18T08:30:00Z"),
              endTime: new Date("2026-08-18T11:00:00Z"),
              professorName: "Prof. Carlos",
              room: { name: "1A" },
            },
          },
        ],
      },
    };

    await expect(
      RequestService.validateAssetConflict(assetId, startTime, endTime, undefined, mockTx)
    ).rejects.toThrow(/Conflito de patrimônio/);
  });

  it("deve rejeitar patrimônio em manutenção ou avariado", async () => {
    const startTime = new Date("2026-08-18T08:00:00Z");
    const endTime = new Date("2026-08-18T10:00:00Z");
    const assetId = "asset-notebook-maint";

    const mockTx = {
      asset: {
        findUnique: async () => ({
          id: assetId,
          assetTag: "004500",
          status: AssetStatus.IN_MAINTENANCE,
          active: true,
          currentRoomId: null,
          item: { name: "Notebook Lenovo" },
        }),
      },
    };

    await expect(
      RequestService.validateAssetConflict(assetId, startTime, endTime, undefined, mockTx)
    ).rejects.toThrow(/manutenção/);
  });

  it("deve permitir reserva do mesmo Asset em horários distintos sem sobreposição", async () => {
    const startTime = new Date("2026-08-18T14:00:00Z");
    const endTime = new Date("2026-08-18T16:00:00Z");
    const assetId = "asset-notebook-1";

    const mockTx = {
      asset: {
        findUnique: async () => ({
          id: assetId,
          assetTag: "004687",
          status: AssetStatus.AVAILABLE,
          active: true,
          currentRoomId: null,
          item: { name: "Notebook Dell i5" },
        }),
      },
      reservation: {
        findMany: async () => [],
      },
    };

    await expect(
      RequestService.validateAssetConflict(assetId, startTime, endTime, undefined, mockTx)
    ).resolves.toBeUndefined();
  });
});

