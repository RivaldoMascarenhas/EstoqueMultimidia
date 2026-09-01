import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Utilitário de Proteção Anti-CSRF e Validação de Origem (CWE-352)
 * Garante que requisições de mutação de estado (POST, PUT, PATCH, DELETE)
 * originadas por navegadores provenham exclusivamente de domínios autorizados.
 */

/**
 * Computa o conjunto de origens permitidas considerando ambiente, proxies Cloudflare e variáveis de ambiente
 */
export function getAllowedOrigins(req?: Request | NextRequest): Set<string> {
  const allowed = new Set<string>();

  // 1. Variável de ambiente configurada explicitamente (ex: https://estoque.unifap.br)
  if (process.env.APP_ORIGIN) {
    process.env.APP_ORIGIN.split(",")
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean)
      .forEach((o) => allowed.add(o));
  }

  // 2. Variável padrão do NextAuth e App URL
  if (process.env.NEXTAUTH_URL) {
    try {
      const authOrigin = new URL(process.env.NEXTAUTH_URL).origin.toLowerCase();
      allowed.add(authOrigin);
    } catch {}
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const pubOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin.toLowerCase();
      allowed.add(pubOrigin);
    } catch {}
  }

  // 3. Em desenvolvimento ou caso nenhuma URL tenha sido configurada, deriva do host local
  if (process.env.NODE_ENV !== "production" || allowed.size === 0) {
    if (req) {
      try {
        if ("url" in req && req.url) {
          const reqOrigin = new URL(req.url).origin.toLowerCase();
          allowed.add(reqOrigin);
        }
      } catch {}

      const headers = "headers" in req ? req.headers : null;
      if (headers) {
        const forwardedHost = headers.get("x-forwarded-host");
        const forwardedProto = headers.get("x-forwarded-proto") || "https";
        if (forwardedHost) {
          const host = forwardedHost.split(",")[0].trim();
          allowed.add(`${forwardedProto}://${host}`.toLowerCase());
        }

        const hostHeader = headers.get("host");
        if (hostHeader) {
          const proto = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
          allowed.add(`${proto}://${hostHeader.trim()}`.toLowerCase());
        }
      }
    }
  }

  // 4. Origens locais de desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
    allowed.add("http://localhost:8000");
    allowed.add("http://127.0.0.1:8000");
  }

  return allowed;
}

/**
 * Valida a origem da requisição mutante contra CSRF
 * Retorna NextResponse com 403 caso a origem seja não autorizada, ou null se válida.
 */
export function validateRequestOrigin(req: NextRequest | Request): NextResponse | null {
  if (!MUTATING_METHODS.has(req.method)) {
    return null;
  }

  const headers = req.headers;

  // 1. Exceção segura: Requisições autenticadas por API Key
  if (headers.get("x-api-key") || headers.get("authorization")?.startsWith("Bearer unifap_")) {
    return null;
  }

  // 2. Exceção segura: Comunicação interna entre microsserviços (ex: FastAPI)
  const internalToken = headers.get("x-internal-token");
  if (internalToken && internalToken === process.env.BIOMETRIC_INTERNAL_TOKEN) {
    return null;
  }

  // 3. Exceção segura: Ambiente de testes automatizados unitários
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    // Se o teste injetar explicitamente Origin ou Referer, avalia a checagem de segurança
    const testOrigin = headers.get("origin");
    const testReferer = headers.get("referer");
    if (!testOrigin && !testReferer) {
      return null;
    }
  }

  const originHeader = headers.get("origin");
  const refererHeader = headers.get("referer");
  const allowedOrigins = getAllowedOrigins(req);

  // 4. Validação pelo cabeçalho Origin (prioritário)
  if (originHeader) {
    try {
      const parsedOrigin = new URL(originHeader).origin.toLowerCase();
      if (!allowedOrigins.has(parsedOrigin)) {
        return NextResponse.json(
          {
            success: false,
            error: "Origem da requisição não permitida. Requisição bloqueada por segurança (Anti-CSRF).",
          },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { success: false, error: "Cabeçalho de origem ('Origin') inválido." },
        { status: 400 }
      );
    }
  }

  // 5. Fallback para cabeçalho Referer
  if (refererHeader) {
    try {
      const parsedRefererOrigin = new URL(refererHeader).origin.toLowerCase();
      if (!allowedOrigins.has(parsedRefererOrigin)) {
        return NextResponse.json(
          {
            success: false,
            error: "Origem do referenciador ('Referer') não permitida (Anti-CSRF).",
          },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { success: false, error: "Cabeçalho de referência ('Referer') inválido." },
        { status: 400 }
      );
    }
  }

  // 6. Requisição de mutação sem Origin e sem Referer
  // Se for uma requisição via navegador com cookies de sessão, bloqueia
  const hasSessionCookie =
    headers.get("cookie")?.includes("next-auth.session-token") ||
    headers.get("cookie")?.includes("__Secure-next-auth.session-token");

  if (hasSessionCookie && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "Requisição mutante sem cabeçalho de origem (Origin/Referer) bloqueada.",
      },
      { status: 403 }
    );
  }

  return null;
}
