import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "@/services/inventory.service";
import { stockTransferSchema } from "@/schemas/inventory.schema";
import { prisma } from "@/lib/prisma";
import { MovementType } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    inventory: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Stock Transfer Workflow & Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Schema Validation (stockTransferSchema)", () => {
    it("deve rejeitar transferência se a caixa de origem for igual à caixa de destino", () => {
      const invalidPayload = {
        itemId: "item-vga-1",
        sourceBoxId: "box-c002",
        destinationBoxId: "box-c002",
        quantity: 2,
        observation: "Transferência teste",
      };

      const result = stockTransferSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          "A caixa de destino deve ser diferente da caixa de origem"
        );
      }
    });

    it("deve rejeitar quantidade menor ou igual a zero", () => {
      const invalidPayload = {
        itemId: "item-vga-1",
        sourceBoxId: "box-c002",
        destinationBoxId: "box-c003",
        quantity: 0,
      };

      const result = stockTransferSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          "A quantidade deve ser maior que zero"
        );
      }
    });

    it("deve aprovar payload válido de transferência entre caixas", () => {
      const validPayload = {
        itemId: "item-vga-1",
        sourceBoxId: "box-c002",
        destinationBoxId: "box-c003",
        quantity: 3,
        observation: "Reorganização das gavetas",
      };

      const result = stockTransferSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(3);
        expect(result.data.sourceBoxId).toBe("box-c002");
        expect(result.data.destinationBoxId).toBe("box-c003");
      }
    });
  });

  describe("2. InventoryService.registerTransfer (Lógica de Negócio)", () => {
    it("deve lançar erro se o item não tiver saldo/registro na caixa de origem", async () => {
      vi.mocked(prisma.inventory.findUnique).mockResolvedValueOnce(null);

      await expect(
        InventoryService.registerTransfer(
          {
            itemId: "item-vga-1",
            sourceBoxId: "box-c002",
            destinationBoxId: "box-c003",
            quantity: 1,
          },
          "user-1"
        )
      ).rejects.toThrow("Saldo não encontrado na caixa de origem.");

      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se o saldo da origem for insuficiente para a quantidade solicitada", async () => {
      vi.mocked(prisma.inventory.findUnique).mockResolvedValueOnce({
        id: "inv-origem",
        itemId: "item-vga-1",
        boxId: "box-c002",
        quantity: 2,
        item: { name: "Cabo VGA", unit: "UN" },
        box: { code: "C002" },
      } as any);

      // Simula falha atômica no updateMany (saldo inferior ao solicitado)
      vi.mocked(prisma.inventory.updateMany).mockResolvedValueOnce({ count: 0 });

      await expect(
        InventoryService.registerTransfer(
          {
            itemId: "item-vga-1",
            sourceBoxId: "box-c002",
            destinationBoxId: "box-c003",
            quantity: 5,
          },
          "user-1"
        )
      ).rejects.toThrow(/Saldo insuficiente para transferência na Caixa de origem/);

      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("deve transferir com sucesso quando a caixa de destino já possui o item", async () => {
      // 1. Origem possui 6 unidades
      vi.mocked(prisma.inventory.findUnique)
        .mockResolvedValueOnce({
          id: "inv-origem",
          itemId: "item-vga-1",
          boxId: "box-c002",
          quantity: 6,
          item: { name: "Cabo VGA", unit: "UN" },
          box: { code: "C002" },
        } as any)
        // 3. Destino já possui 4 unidades
        .mockResolvedValueOnce({
          id: "inv-destino",
          itemId: "item-vga-1",
          boxId: "box-c003",
          quantity: 4,
        } as any);

      // 2. Decremento atômico na origem
      vi.mocked(prisma.inventory.updateMany).mockResolvedValueOnce({ count: 1 });
      // 3. Incremento no destino
      vi.mocked(prisma.inventory.update).mockResolvedValueOnce({
        id: "inv-destino",
        quantity: 6,
      } as any);

      // 4. Criação do movimento
      const mockMovement = {
        id: "mov-1",
        type: MovementType.TRANSFER,
        itemId: "item-vga-1",
        sourceBoxId: "box-c002",
        destBoxId: "box-c003",
        quantity: 2,
        balanceBefore: 6,
        balanceAfter: 4,
      };
      vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce(mockMovement as any);

      const result = await InventoryService.registerTransfer(
        {
          itemId: "item-vga-1",
          sourceBoxId: "box-c002",
          destinationBoxId: "box-c003",
          quantity: 2,
          observation: "Mover 2 cabos para C003",
        },
        "user-admin"
      );

      expect(result).toEqual(mockMovement);

      // Verifica decremento na origem
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { id: "inv-origem", quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      });

      // Verifica incremento no destino (4 + 2 = 6)
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: "inv-destino" },
        data: { quantity: 6 },
      });

      // Verifica criação do histórico imutável com tipo TRANSFER
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: MovementType.TRANSFER,
          itemId: "item-vga-1",
          sourceBoxId: "box-c002",
          destBoxId: "box-c003",
          quantity: 2,
          balanceBefore: 6,
          balanceAfter: 4,
          observation: "Mover 2 cabos para C003",
          userId: "user-admin",
        },
        include: {
          item: true,
          sourceBox: true,
          destBox: true,
          user: { select: { name: true, email: true } },
        },
      });

      // Verifica auditoria
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-admin",
          action: "STOCK_TRANSFER",
          entity: "Inventory",
          entityId: "item-vga-1",
          details: {
            item: "Cabo VGA",
            fromBoxId: "box-c002",
            toBoxId: "box-c003",
            quantity: 2,
          },
        },
      });
    });

    it("deve criar novo registro de inventário na caixa de destino caso ela não tenha o item ainda", async () => {
      // 1. Origem possui 3 unidades
      vi.mocked(prisma.inventory.findUnique)
        .mockResolvedValueOnce({
          id: "inv-origem",
          itemId: "item-vga-1",
          boxId: "box-c002",
          quantity: 3,
          item: { name: "Cabo VGA", unit: "UN" },
          box: { code: "C002" },
        } as any)
        // 3. Destino não possui registro (null)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.inventory.updateMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.inventory.create).mockResolvedValueOnce({
        id: "inv-novo-destino",
        itemId: "item-vga-1",
        boxId: "box-c004",
        quantity: 1,
      } as any);

      vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({ id: "mov-2" } as any);

      await InventoryService.registerTransfer(
        {
          itemId: "item-vga-1",
          sourceBoxId: "box-c002",
          destinationBoxId: "box-c004",
          quantity: 1,
        },
        "user-admin"
      );

      // Deve chamar create para a nova caixa de destino
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: {
          itemId: "item-vga-1",
          boxId: "box-c004",
          quantity: 1,
        },
      });
    });
  });
});
