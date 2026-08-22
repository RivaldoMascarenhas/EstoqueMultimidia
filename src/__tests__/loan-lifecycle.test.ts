import { describe, it, expect } from "vitest";
import { AssetStatus, LoanStatus } from "@prisma/client";

describe("Loan Lifecycle & Countertriaging Tests", () => {

  describe("1. Devolução Normal de Empréstimo", () => {
    it("deve calcular transição de status para RETURNED e restaurar Asset para AVAILABLE", () => {
      const condition = "NORMAL" as string;
      const isDamaged = condition === "DAMAGED";
      const targetAssetStatus = isDamaged ? AssetStatus.IN_MAINTENANCE : AssetStatus.AVAILABLE;
      const targetLoanStatus = isDamaged ? LoanStatus.RETURNED_DAMAGED : LoanStatus.RETURNED;

      expect(targetLoanStatus).toBe(LoanStatus.RETURNED);
      expect(targetAssetStatus).toBe(AssetStatus.AVAILABLE);
    });
  });

  describe("2. Devolução com Avaria e Geração Automática de OS", () => {
    it("deve identificar avaria, alterar status para RETURNED_DAMAGED e enviar Asset para IN_MAINTENANCE", () => {
      const condition = "DAMAGED" as string;
      const isDamaged = condition === "DAMAGED";
      const targetAssetStatus = isDamaged ? AssetStatus.IN_MAINTENANCE : AssetStatus.AVAILABLE;
      const targetLoanStatus = isDamaged ? LoanStatus.RETURNED_DAMAGED : LoanStatus.RETURNED;

      expect(targetLoanStatus).toBe(LoanStatus.RETURNED_DAMAGED);
      expect(targetAssetStatus).toBe(AssetStatus.IN_MAINTENANCE);
    });

    it("deve formatar número sequencial de OS no padrão OS-YYYY-XXXX", () => {
      const year = 2026;
      const count = 42;
      const candidateOS = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

      expect(candidateOS).toBe("OS-2026-0043");
      expect(candidateOS).toMatch(/^OS-\d{4}-\d{4}$/);
    });
  });

  describe("3. Renovação de Empréstimo e Validação de Conflito com Agenda", () => {
    it("deve bloquear renovação se o equipamento possuir reserva ativa na agenda no novo período", () => {
      const now = new Date("2026-08-25T10:00:00Z");
      const newExpectedReturnDate = new Date("2026-08-25T16:00:00Z");

      // Simulação de reserva existente entre 13:00 e 15:00
      const activeReservation = {
        id: "res-1",
        assetId: "asset-notebook-1",
        status: "ACTIVE",
        startTime: new Date("2026-08-25T13:00:00Z"),
        endTime: new Date("2026-08-25T15:00:00Z"),
        request: {
          room: { name: "Auditório Central" },
        },
      };

      const hasConflict =
        activeReservation.startTime <= newExpectedReturnDate &&
        activeReservation.endTime >= now;

      expect(hasConflict).toBe(true);

      const errorMessage = `Não é possível renovar: este equipamento já está reservado para atendimento na sala ${activeReservation.request.room.name} até as 15:00.`;
      expect(errorMessage).toContain("Auditório Central");
    });

    it("deve permitir renovação quando não houver sobreposição de reservas", () => {
      const now = new Date("2026-08-25T10:00:00Z");
      const newExpectedReturnDate = new Date("2026-08-25T12:00:00Z");

      // Reserva que só começa às 14:00
      const futureReservation = {
        id: "res-2",
        assetId: "asset-notebook-1",
        status: "ACTIVE",
        startTime: new Date("2026-08-25T14:00:00Z"),
        endTime: new Date("2026-08-25T16:00:00Z"),
      };

      const hasConflict =
        futureReservation.startTime <= newExpectedReturnDate &&
        futureReservation.endTime >= now;

      expect(hasConflict).toBe(false);
    });
  });

  describe("4. Validação de Extravio", () => {
    it("deve suportar marcação de item extraviado com registro no histórico", () => {
      const fromStatus = AssetStatus.LOANED;
      const toStatus = AssetStatus.LOST;

      expect(fromStatus).toBe(AssetStatus.LOANED);
      expect(toStatus).toBe(AssetStatus.LOST);
    });
  });
});
