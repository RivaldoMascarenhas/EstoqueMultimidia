/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { InventoryService } from "@/services/inventory.service";
import { GET as itemsGet, POST as itemsPost } from "@/app/api/v1/items/route";
import { GET as profileGet, PUT as profilePut } from "@/app/api/v1/auth/profile/route";
import { POST as changePassword } from "@/app/api/v1/auth/change-password/route";
import { validateRequestOrigin, getAllowedOrigins } from "@/lib/request-security";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: vi.fn(), update: vi.fn() },
  item: { findMany: vi.fn(), count: vi.fn() },
  reservation: { findMany: vi.fn() },
  event: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
} }));

function session(role = "ADMIN", active = true, mustChangePassword = false) {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "test-user", role: "ADMIN" } } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "test-user", role, active, mustChangePassword } as any);
}
const request = (path: string, method = "GET", headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000/api/v1/${path}`, { method, headers });

beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); session(); });

describe("Isolamento dos módulos na API (guard real, banco simulado)", () => {
  const loaders = import.meta.glob<{ GET: (...args: any[]) => Promise<Response> }>("../app/api/v1/**/route.ts");
  const routes = ["items", "items/[id]", "doors", "categories", "boxes/[code]", "assets", "assets/[id]", "assets/metrics", "loans/[id]", "loans/metrics", "loans/available-assets", "maintenances/[id]", "maintenances/metrics", "maintenances/eligible-assets", "inventory/availability", "reports", "dashboard/summary"];
  it.each(routes)("nega %s aos perfis Eventos e Apoio Acadêmico, mesmo com JWT antigo de admin", async (route) => {
    const routeModule = await loaders[`../app/api/v1/${route}/route.ts`]();
    for (const role of route === "inventory/availability" ? ["EVENTOS"] : ["EVENTOS", "ACADEMIC_SUPPORT"]) {
      session(role);
      const response = await routeModule.GET(request(route), { params: Promise.resolve({ id: "test", code: "test" }) });
      expect(response.status).toBe(403);
      expect(prisma.item.findMany).not.toHaveBeenCalled();
    }
  });
  it("permite consultar disponibilidade no agendamento acadêmico", async () => {
    session("ACADEMIC_SUPPORT");
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.reservation.findMany).mockResolvedValue([]);
    const { GET } = await import("@/app/api/v1/inventory/availability/route");
    const response = await GET(request("inventory/availability?date=2030-01-07&startTime=08:00&endTime=10:00"));
    expect(response.status).toBe(200);
    expect(prisma.reservation.findMany).toHaveBeenCalled();
  });
  it("restringe busca de eventos aos vínculos e não seleciona tokens de apresentação", async () => {
    session("EVENTOS");
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    const { GET } = await import("@/app/api/v1/search/route");
    expect((await GET(request("search?q=evento"))).status).toBe(200);
    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ managers: { some: { userId: "test-user" } } }),
      select: { id: true, name: true, date: true, location: true, status: true, _count: expect.any(Object) },
    }));
  });
  it.each(["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"])("mantém leitura do estoque para %s", async (role) => {
    session(role);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.item.count).mockResolvedValue(0);
    expect((await itemsGet(request("items"))).status).toBe(200);
  });
  it("não envia notificações de estoque para Eventos", async () => {
    session("EVENTOS");
    const { GET } = await import("@/app/api/v1/notifications/route");
    const response = await GET(request("notifications"));
    expect(await response.json()).toEqual({ success: true, data: [], unreadCount: 0 });
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });
});

describe("Revogação de sessão e alteração de senha", () => {
  it("nega nova conexão realtime para conta revogada com JWT antigo", async () => {
    session("ADMIN", false);
    const { GET } = await import("@/app/api/v1/events/[id]/realtime/route");
    const response = await GET(request("events/test/realtime?poll=true"), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(401);
  });
  it("nega leitura e alteração de perfil para conta inativa", async () => {
    session("ADMIN", false);
    expect((await profileGet(request("auth/profile"))).status).toBe(401);
    expect((await profilePut(request("auth/profile", "PUT"))).status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it("nega troca obrigatória de senha com conta inativa", async () => {
    session("ADMIN", false, true);
    expect((await changePassword(request("auth/change-password", "POST"))).status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it("não permite usar a troca inicial de senha fora do fluxo obrigatório", async () => {
    expect((await changePassword(request("auth/change-password", "POST"))).status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("Origem das operações autenticadas por sessão", () => {
  it.each([{}, { "x-api-key": "arbitrary" }, { authorization: "Bearer unifap_arbitrary" }])("nega mutação externa antes do acesso ao banco: %j", async (extra) => {
    const response = await itemsPost(request("items", "POST", { origin: "https://untrusted.example", ...extra } as unknown as Record<string, string>));
    expect(response.status).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("nega origem externa na troca obrigatória de senha", async () => {
    expect((await changePassword(request("auth/change-password", "POST", { origin: "https://untrusted.example" }))).status).toBe(403);
  });
  it("não confia em host encaminhado quando produção não tem origem configurada", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", ""); vi.stubEnv("NEXTAUTH_URL", ""); vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    try {
      const req = request("items", "POST", { "x-forwarded-host": "untrusted.example", origin: "https://untrusted.example" });
      expect(getAllowedOrigins(req).size).toBe(0);
      expect(validateRequestOrigin(req)?.status).toBe(403);
    } finally { vi.unstubAllEnvs(); }
  });
});

describe("Filtros e paginação do estoque", () => {
  it.each(["page=-1", "page=1.5", "page=abc", "limit=0", "limit=100000", "status=INVALID"])("rejeita %s sem consultar itens", async (query) => {
    expect((await itemsGet(request(`items?${query}`))).status).toBe(400);
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });
  it("combina busca textual com caixa sem sobrescrever a busca", async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.item.count).mockResolvedValue(0);
    await InventoryService.getItems({ search: "cabo", boxId: "box-test", page: 2, limit: 50 });
    expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.arrayContaining([{ name: { contains: "cabo", mode: "insensitive" } }]), AND: expect.any(Array) }),
      skip: 50, take: 50,
    }));
  });
});
