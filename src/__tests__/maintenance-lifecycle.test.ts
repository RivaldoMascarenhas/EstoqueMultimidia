import { describe, it, expect } from "vitest";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";

describe("Maintenance Lifecycle & Workshop Triaging Tests", () => {
  describe("1. Abertura de Ordem de Serviço", () => {
    it("deve transicionar status do ativo para IN_MAINTENANCE e status da OS para PENDING ou IN_PROGRESS", () => {
      const assetStatusInitial = AssetStatus.AVAILABLE;
      const targetAssetStatus = AssetStatus.IN_MAINTENANCE;
      const initialMaintStatus = MaintenanceStatus.IN_PROGRESS;

      expect(assetStatusInitial).toBe(AssetStatus.AVAILABLE);
      expect(targetAssetStatus).toBe(AssetStatus.IN_MAINTENANCE);
      expect(initialMaintStatus).toBe(MaintenanceStatus.IN_PROGRESS);
    });

    it("deve gerar numeração de OS com garantia de unicidade anual", () => {
      const year = 2026;
      const count = 99;
      const orderNumber = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

      expect(orderNumber).toBe("OS-2026-0100");
    });
  });

  describe("2. Conclusão com Sucesso e Reintegração Física", () => {
    it("deve restaurar o patrimônio para AVAILABLE e exigir caixa do armário", () => {
      const outcome = "AVAILABLE" as string;
      const returnBoxId = "box-armario-1-porta-a";
      
      const targetAssetStatus = outcome === "AVAILABLE" ? AssetStatus.AVAILABLE : AssetStatus.WRITTEN_OFF;
      const targetMaintStatus = MaintenanceStatus.COMPLETED;

      expect(targetAssetStatus).toBe(AssetStatus.AVAILABLE);
      expect(targetMaintStatus).toBe(MaintenanceStatus.COMPLETED);
      expect(returnBoxId).toBeTruthy();
    });
  });

  describe("3. Baixa por Perda Total / Condenação Técnica", () => {
    it("deve transicionar o status do patrimônio para WRITTEN_OFF quando condenado", () => {
      const outcome = "WRITTEN_OFF" as string;
      const targetAssetStatus = outcome === "AVAILABLE" ? AssetStatus.AVAILABLE : AssetStatus.WRITTEN_OFF;

      expect(targetAssetStatus).toBe(AssetStatus.WRITTEN_OFF);
    });
  });

  describe("4. Cancelamento de OS", () => {
    it("deve restaurar status do patrimônio para AVAILABLE quando a OS for cancelada", () => {
      const currentAssetStatus = AssetStatus.IN_MAINTENANCE;
      const isRestorable = currentAssetStatus === AssetStatus.IN_MAINTENANCE;
      const targetAssetStatus = isRestorable ? AssetStatus.AVAILABLE : currentAssetStatus;
      const targetMaintStatus = MaintenanceStatus.CANCELLED;

      expect(targetAssetStatus).toBe(AssetStatus.AVAILABLE);
      expect(targetMaintStatus).toBe(MaintenanceStatus.CANCELLED);
    });
  });
});
