import { describe, it, expect } from "vitest";
import { middlewareHandler } from "@/middleware";

function createMockRequest(pathname: string, role?: string) {
  const url = `http://localhost:3000${pathname}`;
  return {
    url,
    nextUrl: { pathname },
    nextauth: {
      token: role ? { role, sub: "user-123", email: "test@unifap.br" } : null,
    },
  };
}

describe("Next.js Middleware — RBAC Route Protection & Redirects", () => {
  describe("Perfil ACADÊMICO (ACADEMIC_SUPPORT)", () => {
    const forbiddenRoutes = [
      "/biometria/pessoas",
      "/eventos",
      "/eventos/cmta89sdj002ji5jdvhmaoffz",
      "/presenca",
      "/sorteios",
      "/totem/cmta89sdj002ji5jdvhmaoffz",
      "/estoque",
      "/patrimonio",
      "/emprestimos",
      "/manutencao",
      "/armario",
      "/caixas",
      "/movimentacoes",
      "/relatorios",
      "/scanner",
    ];

    forbiddenRoutes.forEach((route) => {
      it(`deve bloquear acesso à rota ${route} e redirecionar para /agenda`, () => {
        const req = createMockRequest(route, "ACADEMIC_SUPPORT");
        const res = middlewareHandler(req);

        expect(res).toBeDefined();
        expect(res.status).toBe(307); // NextResponse.redirect
        const redirectUrl = res.headers.get("location");
        expect(redirectUrl).toContain("/agenda");
      });
    });

    it("deve bloquear acesso a /usuarios e redirecionar para /dashboard?error=unauthorized", () => {
      const req = createMockRequest("/usuarios", "ACADEMIC_SUPPORT");
      const res = middlewareHandler(req);

      expect(res.status).toBe(307);
      const redirectUrl = res.headers.get("location");
      expect(redirectUrl).toContain("/dashboard?error=unauthorized");
    });

    const allowedRoutes = ["/agenda", "/salas", "/dashboard", "/perfil"];

    allowedRoutes.forEach((route) => {
      it(`deve PERMITIR acesso à rota autorizada ${route}`, () => {
        const req = createMockRequest(route, "ACADEMIC_SUPPORT");
        const res = middlewareHandler(req);

        // NextResponse.next() returns undefined headers/location (allowed)
        expect(res?.headers?.get("location")).toBeNull();
      });
    });
  });

  describe("Perfil EVENTOS", () => {
    const forbiddenRoutes = [
      "/estoque",
      "/patrimonio",
      "/emprestimos",
      "/manutencao",
      "/armario",
      "/caixas",
      "/movimentacoes",
      "/agenda",
      "/salas",
      "/scanner",
      "/usuarios",
      "/configuracoes",
      "/auditoria",
      "/permissoes",
    ];

    forbiddenRoutes.forEach((route) => {
      it(`deve bloquear acesso à rota ${route} e redirecionar para /dashboard?error=unauthorized`, () => {
        const req = createMockRequest(route, "EVENTOS");
        const res = middlewareHandler(req);

        expect(res).toBeDefined();
        expect(res.status).toBe(307);
        const redirectUrl = res.headers.get("location");
        expect(redirectUrl).toContain("/dashboard?error=unauthorized");
      });
    });

    const allowedRoutes = [
      "/dashboard",
      "/eventos",
      "/eventos/cmta89sdj002ji5jdvhmaoffz",
      "/eventos/cmta89sdj002ji5jdvhmaoffz/sorteio",
      "/presenca",
      "/totem/cmta89sdj002ji5jdvhmaoffz",
      "/sorteios",
      "/biometria/pessoas",
      "/relatorios",
      "/privacidade",
      "/perfil",
    ];

    allowedRoutes.forEach((route) => {
      it(`deve PERMITIR acesso à rota autorizada de eventos: ${route}`, () => {
        const req = createMockRequest(route, "EVENTOS");
        const res = middlewareHandler(req);

        expect(res?.headers?.get("location")).toBeNull();
      });
    });
  });

  describe("Perfil ADMIN vs OUTROS", () => {
    it("deve permitir que ADMIN acesse /usuarios", () => {
      const req = createMockRequest("/usuarios", "ADMIN");
      const res = middlewareHandler(req);
      expect(res?.headers?.get("location")).toBeNull();
    });

    it("deve permitir que ADMIN acesse /configuracoes", () => {
      const req = createMockRequest("/configuracoes", "ADMIN");
      const res = middlewareHandler(req);
      expect(res?.headers?.get("location")).toBeNull();
    });

    it("deve bloquear que OPERADOR acesse /usuarios e redirecionar para /dashboard?error=unauthorized", () => {
      const req = createMockRequest("/usuarios", "OPERADOR");
      const res = middlewareHandler(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard?error=unauthorized");
    });

    it("deve bloquear que GESTOR acesse /usuarios e redirecionar para /dashboard?error=unauthorized", () => {
      const req = createMockRequest("/usuarios", "GESTOR");
      const res = middlewareHandler(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard?error=unauthorized");
    });
  });

  describe("Perfil CONSULTA (Somente Leitura)", () => {
    const forbiddenRoutes = [
      "/agenda/nova-solicitacao",
      "/agenda/revisao-legado",
      "/totem/cmta89sdj002ji5jdvhmaoffz",
      "/biometria/testar",
      "/eventos/cmta89sdj002ji5jdvhmaoffz/sorteio",
      "/usuarios",
      "/configuracoes",
      "/auditoria",
      "/permissoes",
    ];

    forbiddenRoutes.forEach((route) => {
      it(`deve bloquear rota operacional/mutação ${route} e redirecionar para dashboard`, () => {
        const req = createMockRequest(route, "CONSULTA");
        const res = middlewareHandler(req);

        expect(res).toBeDefined();
        expect(res.status).toBe(307);
        const redirectUrl = res.headers.get("location");
        expect(redirectUrl).toContain("/dashboard?error=unauthorized");
      });
    });

    const allowedReadRoutes = [
      "/dashboard",
      "/estoque",
      "/armario",
      "/caixas",
      "/caixas/CX-01",
      "/patrimonio",
      "/emprestimos",
      "/manutencao",
      "/movimentacoes",
      "/agenda",
      "/salas",
      "/eventos",
      "/eventos/cmta89sdj002ji5jdvhmaoffz",
      "/biometria/pessoas",
      "/relatorios",
      "/perfil",
    ];

    allowedReadRoutes.forEach((route) => {
      it(`deve PERMITIR leitura na rota de consulta: ${route}`, () => {
        const req = createMockRequest(route, "CONSULTA");
        const res = middlewareHandler(req);

        expect(res?.headers?.get("location")).toBeNull();
      });
    });
  });
});
