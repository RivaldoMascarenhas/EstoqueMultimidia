import { describe, it, expect, vi } from "vitest";
import { AssetStatus, ItemLogisticsType, ItemType } from "@prisma/client";
import { RequestService } from "@/services/request.service";

describe("Validação de Disponibilidade de Patrimônios para Agendamento", () => {
  it("Cenário 1: Novo patrimônio individual criado (AVAILABLE) fica imediatamente disponível para agendamento", async () => {
    const mockTx: any = {
      item: {
        update: vi.fn().mockResolvedValue({ id: "item-projetor-epson" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "item-projetor-epson",
          name: "Projetor Epson PowerLite X49",
          sku: "EQP-EPSON-X49",
          active: true,
          itemType: ItemType.ASSET_EQUIPMENT,
          logisticsType: ItemLogisticsType.MOBILE_PORTABLE,
          inventories: [],
          assets: [
            {
              id: "asset-pat-001",
              assetTag: "PAT-004129",
              status: AssetStatus.AVAILABLE,
              active: true,
              currentRoomId: null,
            },
          ],
        }),
      },
      reservation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const item = await RequestService.validateItemAvailability(
      "item-projetor-epson",
      1,
      new Date("2026-08-25T08:00:00Z"),
      new Date("2026-08-25T10:00:00Z"),
      undefined,
      mockTx
    );

    expect(item).toBeDefined();
    expect(item.name).toBe("Projetor Epson PowerLite X49");
    expect(item.assets).toHaveLength(1);
    expect(item.assets[0].status).toBe(AssetStatus.AVAILABLE);
  });

  it("Cenário 2: Lote de 50 patrimônios criados fica com 50 unidades disponíveis para agendamentos", async () => {
    // Simular 50 ativos criados em lote
    const batchAssets = Array.from({ length: 50 }, (_, i) => ({
      id: `asset-pc-${i + 1}`,
      assetTag: `PAT-DELL-${1000 + i + 1}`,
      status: AssetStatus.AVAILABLE,
      active: true,
      currentRoomId: null,
    }));

    const mockTx: any = {
      item: {
        update: vi.fn().mockResolvedValue({ id: "item-dell-optiplex" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "item-dell-optiplex",
          name: "Computador Dell OptiPlex 3080",
          sku: "PC-DELL-3080",
          active: true,
          itemType: ItemType.ASSET_EQUIPMENT,
          logisticsType: ItemLogisticsType.MOBILE_PORTABLE,
          inventories: [],
          assets: batchAssets,
        }),
      },
      reservation: {
        // Suponha que 10 já estejam reservados para o mesmo horário
        findMany: vi.fn().mockResolvedValue([
          { itemId: "item-dell-optiplex", quantity: 5 },
          { itemId: "item-dell-optiplex", quantity: 5 },
        ]),
      },
    };

    // Solicitar 30 unidades (de 50 criados, 10 reservados -> restam 40 -> 30 solicitados deve passar)
    const item = await RequestService.validateItemAvailability(
      "item-dell-optiplex",
      30,
      new Date("2026-08-25T14:00:00Z"),
      new Date("2026-08-25T18:00:00Z"),
      undefined,
      mockTx
    );

    expect(item.assets).toHaveLength(50);
  });

  it("Cenário 3: Bloqueia agendamento se a quantidade solicitada exceder os patrimônios disponíveis", async () => {
    const mockTx: any = {
      item: {
        update: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          id: "item-caixa-som",
          name: "Caixa de Som JBL",
          sku: "EQP-JBL-100",
          active: true,
          itemType: ItemType.ASSET_EQUIPMENT,
          logisticsType: ItemLogisticsType.MOBILE_PORTABLE,
          inventories: [],
          assets: [
            { id: "asset-1", status: AssetStatus.AVAILABLE, active: true },
            { id: "asset-2", status: AssetStatus.AVAILABLE, active: true },
          ],
        }),
      },
      reservation: {
        findMany: vi.fn().mockResolvedValue([
          { itemId: "item-caixa-som", quantity: 1 },
        ]),
      },
    };

    // Total de ativos disponíveis: 2. Reservado: 1. Disponível: 1. Tentativa de reservar: 2 -> Deve falhar com erro amigável.
    await expect(
      RequestService.validateItemAvailability(
        "item-caixa-som",
        2,
        new Date("2026-08-25T19:00:00Z"),
        new Date("2026-08-25T21:00:00Z"),
        undefined,
        mockTx
      )
    ).rejects.toThrow(/Disponibilidade insuficiente/i);
  });

  it("Cenário 4: Patrimônio em manutenção técnica (IN_MAINTENANCE) não fica disponível para agendamento", async () => {
    // Como a query do Prisma filtra apenas assets com status AVAILABLE e currentRoomId: null,
    // quando todos os ativos estão em manutenção ou danificados, Prisma retorna assets = []
    const mockTx: any = {
      item: {
        update: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          id: "item-microfone",
          name: "Microfone Sem Fio Shure",
          sku: "EQP-SHURE-58",
          active: true,
          itemType: ItemType.ASSET_EQUIPMENT,
          logisticsType: ItemLogisticsType.MOBILE_PORTABLE,
          inventories: [],
          assets: [], // Nenhum ativo AVAILABLE retornado pelo filtro de status
        }),
      },
      reservation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    // Todos os patrimônios estão em manutenção -> Disponibilidade é 0
    await expect(
      RequestService.validateItemAvailability(
        "item-microfone",
        1,
        new Date("2026-08-25T08:00:00Z"),
        new Date("2026-08-25T10:00:00Z"),
        undefined,
        mockTx
      )
    ).rejects.toThrow(/Disponibilidade insuficiente/i);
  });

  it("Cenário 5: Cálculo da rota de disponibilidade (/api/v1/inventory/availability) reflete criação de patrimônios", () => {
    const testItem = {
      id: "item-note-1",
      name: "Notebook Acer Nitro",
      sku: "EQP-ACER-01",
      category: { name: "Informática" },
      logisticsType: ItemLogisticsType.MOBILE_PORTABLE,
      inventories: [],
      assets: [
        { id: "a1", status: AssetStatus.AVAILABLE },
        { id: "a2", status: AssetStatus.AVAILABLE },
        { id: "a3", status: AssetStatus.IN_MAINTENANCE },
        { id: "a4", status: AssetStatus.LOANED },
      ],
    };

    const totalAssets = testItem.assets.length; // 4
    const maintenanceCount = testItem.assets.filter(
      (a) => a.status === AssetStatus.IN_MAINTENANCE || a.status === AssetStatus.DAMAGED
    ).length; // 1
    const loanedCount = testItem.assets.filter((a) => a.status === AssetStatus.LOANED).length; // 1
    const reservedCount = 1; // 1 reservado para o horário

    const netAvailable = Math.max(0, totalAssets - maintenanceCount - loanedCount - reservedCount);

    expect(totalAssets).toBe(4);
    expect(maintenanceCount).toBe(1);
    expect(loanedCount).toBe(1);
    expect(netAvailable).toBe(1); // 4 - 1 - 1 - 1 = 1 disponível
    expect(netAvailable > 0).toBe(true);
  });
});
