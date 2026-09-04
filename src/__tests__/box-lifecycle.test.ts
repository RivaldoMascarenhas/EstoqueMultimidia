import { describe, it, expect, vi, beforeEach } from "vitest";
import { CabinetService } from "@/services/cabinet.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    box: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inventory: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    stockMovement: {
      count: vi.fn().mockResolvedValue(0),
    },
    loan: {
      count: vi.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("CabinetService - Box Lifecycle & Deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve lançar erro ao tentar excluir uma caixa inexistente", async () => {
    vi.mocked(prisma.box.findFirst).mockResolvedValue(null);

    await expect(
      CabinetService.deleteBox("C999", "user-123")
    ).rejects.toThrow("Caixa 'C999' não encontrada ou já desativada.");
  });

  it("deve impedir a exclusão de caixa com materiais em estoque (quantity > 0)", async () => {
    vi.mocked(prisma.box.findFirst).mockResolvedValue({
      id: "box-1",
      code: "C001",
      name: "Caixa 001",
      doorId: "door-1",
      active: true,
      inventories: [{ id: "inv-1", quantity: 5 }] as any,
      assets: [] as any,
      door: { name: "Porta 1" } as any,
    } as any);

    await expect(
      CabinetService.deleteBox("C001", "user-123")
    ).rejects.toThrow(/não é possível excluir a caixa 'C001' pois ela ainda contém 5 item\(ns\) em estoque/i);
  });

  it("deve impedir a exclusão de caixa com equipamentos/patrimônios ativos alocados", async () => {
    vi.mocked(prisma.box.findFirst).mockResolvedValue({
      id: "box-2",
      code: "C002",
      name: "Caixa 002",
      doorId: "door-1",
      active: true,
      inventories: [],
      assets: [{ id: "asset-1", active: true }] as any,
      door: { name: "Porta 1" } as any,
    } as any);

    await expect(
      CabinetService.deleteBox("C002", "user-123")
    ).rejects.toThrow(/não é possível excluir a caixa 'C002' pois ela ainda possui 1 equipamento\(s\)\/patrimônio\(s\) alocado\(s\)/i);
  });

  it("deve realizar hard delete quando a caixa está vazia e sem histórico de movimentação/empréstimo", async () => {
    vi.mocked(prisma.box.findFirst).mockResolvedValue({
      id: "box-empty",
      code: "C010",
      name: "Caixa Vazia",
      doorId: "door-1",
      active: true,
      inventories: [],
      assets: [],
      door: { name: "Porta 1" } as any,
    } as any);

    vi.mocked(prisma.stockMovement.count).mockResolvedValue(0);
    vi.mocked(prisma.loan.count).mockResolvedValue(0);
    vi.mocked(prisma.box.delete).mockResolvedValue({} as any);

    const result = await CabinetService.deleteBox("C010", "user-admin");

    expect(result.hardDeleted).toBe(true);
    expect(result.code).toBe("C010");
    expect(prisma.inventory.deleteMany).toHaveBeenCalledWith({ where: { boxId: "box-empty" } });
    expect(prisma.box.delete).toHaveBeenCalledWith({ where: { id: "box-empty" } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DELETE_BOX",
        entity: "Box",
        entityId: "box-empty",
      }),
    });
  });

  it("deve realizar soft delete (active: false) quando a caixa está vazia mas possui histórico relacional", async () => {
    vi.mocked(prisma.box.findFirst).mockResolvedValue({
      id: "box-history",
      code: "C020",
      name: "Caixa com Histórico",
      doorId: "door-1",
      active: true,
      inventories: [],
      assets: [],
      door: { name: "Porta 1" } as any,
    } as any);

    // Tem 3 movimentações registradas no histórico
    vi.mocked(prisma.stockMovement.count).mockResolvedValue(3);
    vi.mocked(prisma.loan.count).mockResolvedValue(0);
    vi.mocked(prisma.box.update).mockResolvedValue({} as any);

    const result = await CabinetService.deleteBox("C020", "user-admin");

    expect(result.hardDeleted).toBe(false);
    expect(result.code).toBe("C020");
    expect(prisma.box.delete).not.toHaveBeenCalled();
    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: "box-history" },
      data: { active: false },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DELETE_BOX",
        entity: "Box",
        entityId: "box-history",
      }),
    });
  });

  it("deve reativar e atualizar dados ao criar caixa com código que estava inativo", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-archived",
      code: "C030",
      name: "Nome Antigo",
      doorId: "door-old",
      active: false,
      door: { name: "Porta Antiga" } as any,
    } as any);

    vi.mocked(prisma.box.update).mockResolvedValue({
      id: "box-archived",
      code: "C030",
      name: "Novo Nome",
      doorId: "door-new",
      active: true,
      door: { name: "Nova Porta" } as any,
    } as any);

    const created = await CabinetService.createBox(
      {
        code: "C030",
        name: "Novo Nome",
        doorId: "door-new",
        description: "Reativada",
      },
      "user-123"
    );

    expect(created.active).toBe(true);
    expect(created.name).toBe("Novo Nome");
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "RESTORE_BOX",
        entity: "Box",
        entityId: "box-archived",
      }),
    });
  });

  it("não deve retornar caixa inativa em getBoxByCode", async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-archived",
      code: "C040",
      active: false,
    } as any);

    const result = await CabinetService.getBoxByCode("C040");
    expect(result).toBeNull();
  });
});
