import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/v1/movements/route";
import { isFaceInsideGuide } from "@/lib/face-framing";
import { formatDateTime, formatTimeInTimezone } from "@/lib/utils";

vi.mock("@/lib/api-guard", () => ({ requireSession: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { stockMovement: { findMany: vi.fn(), count: vi.fn() } } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);
  vi.mocked(prisma.stockMovement.count).mockResolvedValue(201);
});
describe("Histórico paginado", () => {
  it("alcança registros além dos primeiros 200 e mantém filtros", async () => {
    const response = await GET(new NextRequest("http://localhost/api/v1/movements?page=5&limit=50&search=cabo&startDate=2026-09-06"));
    const data = await response.json();
    expect(data.pagination).toEqual({ page: 5, limit: 50, total: 201, totalPages: 5 });
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 200, take: 50, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
    const where = vi.mocked(prisma.stockMovement.findMany).mock.calls[0][0]!.where;
    expect(prisma.stockMovement.count).toHaveBeenCalledWith({ where });
    expect((where!.createdAt as { gte: Date }).gte.toISOString()).toBe("2026-09-06T03:00:00.000Z");
  });
  it.each(["0", "-1", "1.5", "NaN"])("rejeita página inválida %s", async page => {
    expect((await GET(new NextRequest(`http://localhost/api/v1/movements?page=${page}`))).status).toBe(400);
    expect(prisma.stockMovement.findMany).not.toHaveBeenCalled();
  });
});
describe("Moldura facial real", () => {
  const viewport = { left: 0, top: 0, width: 400, height: 400 };
  const guide = { left: 100, top: 100, width: 200, height: 200 };
  it("aceita rosto inteiro dentro da moldura", () => {
    expect(isFaceInsideGuide({ originX: 125, originY: 125, width: 150, height: 150 }, 400, 400, viewport, guide)).toBe(true);
  });
  it("rejeita rosto com centro dentro e bordas fora", () => {
    expect(isFaceInsideGuide({ originX: 75, originY: 75, width: 250, height: 250 }, 400, 400, viewport, guide)).toBe(false);
  });
  it("considera object-cover e espelhamento em tela retrato", () => {
    expect(isFaceInsideGuide({ originX: 350, originY: 125, width: 150, height: 150 }, 800, 400, viewport, guide)).toBe(true);
    expect(isFaceInsideGuide({ originX: 0, originY: 125, width: 150, height: 150 }, 800, 400, viewport, guide)).toBe(false);
  });
});
it("exibe Fortaleza na virada do dia UTC", () => {
  expect(formatDateTime("2026-09-07T01:30:00Z")).toContain("06/09/2026");
  expect(formatTimeInTimezone("2026-09-07T01:30:00Z")).toBe("22:30");
});
