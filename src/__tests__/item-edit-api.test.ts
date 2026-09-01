import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getItem, PUT as updateItem, DELETE as deleteItem } from "@/app/api/v1/items/[id]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    item: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Items API [id] - Edit & Permission Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(prisma.user.findUnique) as any).mockImplementation((args: any) => {
      const id = args?.where?.id;
      if (id === "adm-1") {
        return Promise.resolve({ id: "adm-1", name: "Admin", role: Role.ADMIN, active: true });
      }
      if (id === "gestor-1") {
        return Promise.resolve({ id: "gestor-1", name: "Gestor", role: Role.GESTOR, active: true });
      }
      if (id === "op-1") {
        return Promise.resolve({ id: "op-1", name: "Operador", role: Role.OPERADOR, active: true });
      }
      if (id === "eventos-1") {
        return Promise.resolve({ id: "eventos-1", name: "Eventos", role: Role.EVENTOS, active: true });
      }
      if (id === "cons-1") {
        return Promise.resolve({ id: "cons-1", name: "Consulta", role: Role.CONSULTA, active: true });
      }
      return Promise.resolve(null);
    });
  });

  it("permite que ADMIN edite o nome, SKU e informações do item", async () => {
    (vi.mocked(getServerSession) as any).mockResolvedValue({
      user: { id: "adm-1", role: Role.ADMIN, name: "Admin" },
    });

    const existingItem = {
      id: "item-123",
      name: "Cabo HDMI 1.5m",
      sku: "CAB-HDMI-15",
      categoryId: "cat-1",
      itemType: "MATERIAL",
      unit: "UN",
      minStock: 5,
      idealStock: 20,
      manufacturer: "Dell",
      model: "Standard",
      category: { name: "Cabos" },
      inventories: [],
      assets: [],
    };

    (vi.mocked(prisma.item.findUnique) as any).mockResolvedValue(existingItem);
    (vi.mocked(prisma.item.update) as any).mockResolvedValue({
      ...existingItem,
      name: "Cabo HDMI 2.0m Reforçado",
      sku: "CAB-HDMI-20",
    });

    const req = new NextRequest("http://localhost/api/v1/items/item-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Cabo HDMI 2.0m Reforçado",
        sku: "CAB-HDMI-20",
        categoryId: "cat-1",
      }),
    });

    const response = await updateItem(req, { params: Promise.resolve({ id: "item-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Cabo HDMI 2.0m Reforçado");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "UPDATE_ITEM",
          userId: "adm-1",
        }),
      })
    );
  });

  it("permite que GESTOR edite o nome e detalhes de um modelo de equipamento", async () => {
    (vi.mocked(getServerSession) as any).mockResolvedValue({
      user: { id: "gestor-1", role: Role.GESTOR, name: "Gestor" },
    });

    const existingItem = {
      id: "eqp-123",
      name: "Monitor HP 23",
      sku: "EQP-HP-23",
      categoryId: "cat-2",
      itemType: "ASSET_EQUIPMENT",
      unit: "UN",
      minStock: 2,
      idealStock: 10,
      manufacturer: "HP",
      model: "EliteDisplay 23",
      category: { name: "Monitores" },
      inventories: [],
      assets: [],
    };

    (vi.mocked(prisma.item.findUnique) as any).mockResolvedValue(existingItem);
    (vi.mocked(prisma.item.update) as any).mockResolvedValue({
      ...existingItem,
      name: "Monitor HP 23.8 IPS Full HD",
    });

    const req = new NextRequest("http://localhost/api/v1/items/eqp-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Monitor HP 23.8 IPS Full HD",
      }),
    });

    const response = await updateItem(req, { params: Promise.resolve({ id: "eqp-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Monitor HP 23.8 IPS Full HD");
  });

  it("bloqueia OPERADOR de editar item retornando 403 Forbidden", async () => {
    (vi.mocked(getServerSession) as any).mockResolvedValue({
      user: { id: "op-1", role: Role.OPERADOR, name: "Operador" },
    });

    const req = new NextRequest("http://localhost/api/v1/items/item-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Tentativa de alteração não autorizada",
      }),
    });

    const response = await updateItem(req, { params: Promise.resolve({ id: "item-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/Permissão insuficiente/i);
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("bloqueia EVENTOS de editar item retornando 403 Forbidden", async () => {
    (vi.mocked(getServerSession) as any).mockResolvedValue({
      user: { id: "eventos-1", role: Role.EVENTOS, name: "Eventos" },
    });

    const req = new NextRequest("http://localhost/api/v1/items/item-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Tentativa de alteração",
      }),
    });

    const response = await updateItem(req, { params: Promise.resolve({ id: "item-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("bloqueia CONSULTA de editar item retornando 403 Forbidden", async () => {
    (vi.mocked(getServerSession) as any).mockResolvedValue({
      user: { id: "cons-1", role: Role.CONSULTA, name: "Consulta" },
    });

    const req = new NextRequest("http://localhost/api/v1/items/item-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Tentativa de alteração",
      }),
    });

    const response = await updateItem(req, { params: Promise.resolve({ id: "item-123" }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});
