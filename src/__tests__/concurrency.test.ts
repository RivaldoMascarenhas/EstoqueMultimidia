import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoanService } from "@/services/loan.service";
import { InventoryService } from "@/services/inventory.service";
import { prisma } from "@/lib/prisma";
import { AssetStatus, LoanStatus, MovementType } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    asset: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    loan: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    reservation: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    assetHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    box: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Concurrency & Anti-Race Condition Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LoanService - Concurrency & Double Booking Prevention", () => {
    it("deve lançar erro se duas requisições tentarem emprestar o mesmo item simultaneamente (updateMany count = 0)", async () => {
      // Simula que o ativo parecia AVAILABLE no findUnique inicial
      vi.mocked(prisma.asset.findUnique).mockResolvedValueOnce({
        id: "asset-1",
        assetTag: "PAT-001",
        status: AssetStatus.AVAILABLE,
        item: { name: "Projetor Epson" },
        currentBox: { name: "Caixa 01", door: { name: "Porta A" } },
      } as any);

      // Mas no updateMany condicional atômico, outra transação já alterou o status (retorna count 0)
      vi.mocked(prisma.asset.updateMany).mockResolvedValueOnce({ count: 0 });

      await expect(
        LoanService.createLoan(
          {
            assetId: "asset-1",
            borrowerName: "Prof. Carlos",
            destination: "Auditório 1",
            expectedReturnDate: new Date(Date.now() + 3600000).toISOString(),
          },
          "user-1",
          "Operador"
        )
      ).rejects.toThrow(/foi alocado concorrentemente por outra requisição/);

      expect(prisma.loan.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se duas devoluções simultâneas tentarem devolver o mesmo empréstimo", async () => {
      vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
        id: "loan-1",
        assetId: "asset-1",
        status: LoanStatus.ACTIVE,
        asset: { id: "asset-1", assetTag: "PAT-001", item: { name: "Projetor" } },
      } as any);

      vi.mocked(prisma.box.findUnique).mockResolvedValueOnce({
        id: "box-1",
        name: "Caixa 01",
        code: "C001",
        door: { name: "Porta A" },
      } as any);

      // Simula que outra devolução acabou de ocorrer (count = 0)
      vi.mocked(prisma.loan.updateMany).mockResolvedValueOnce({ count: 0 });

      await expect(
        LoanService.returnLoan(
          "loan-1",
          {
            returnBoxId: "box-1",
            condition: "PERFECT",
          },
          "user-1",
          "Operador"
        )
      ).rejects.toThrow(/já foi devolvido ou não se encontra ativo/);
    });
  });

  describe("InventoryService - Strict Anti-Negative Balance", () => {
    it("deve lançar erro e impedir saldo negativo quando múltiplas saídas concorrentes esgotam o estoque", async () => {
      vi.mocked(prisma.inventory.findUnique).mockResolvedValueOnce({
        id: "inv-1",
        itemId: "item-1",
        boxId: "box-1",
        quantity: 5,
        item: { name: "Cabo HDMI 2m", unit: "un" },
        box: { code: "C001" },
      } as any);

      // Simula que o estoque foi consumido por outra transação concorrente
      vi.mocked(prisma.inventory.updateMany).mockResolvedValueOnce({ count: 0 });

      await expect(
        InventoryService.registerExit(
          {
            itemId: "item-1",
            boxId: "box-1",
            quantity: 5,
            observation: "Aula prática",
          },
          "user-1"
        )
      ).rejects.toThrow(/Saldo insuficiente na Caixa/);

      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });
  });
});
