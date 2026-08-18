import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string;

    // 1. Áreas exclusivas de ADMIN (Usuários e Configurações globais)
    if (
      (pathname.startsWith("/usuarios") || pathname.startsWith("/configuracoes")) &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
    }

    // 2. Bloqueio de áreas operacionais internas para Apoio Acadêmico
    if (
      role === "ACADEMIC_SUPPORT" &&
      (pathname.startsWith("/armario") ||
        pathname.startsWith("/caixas") ||
        pathname.startsWith("/manutencao") ||
        pathname.startsWith("/movimentacoes"))
    ) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/salas/:path*",
    "/scanner/:path*",
    "/estoque/:path*",
    "/armario/:path*",
    "/caixas/:path*",
    "/patrimonio/:path*",
    "/emprestimos/:path*",
    "/manutencao/:path*",
    "/movimentacoes/:path*",
    "/relatorios/:path*",
    "/usuarios/:path*",
    "/configuracoes/:path*",
  ],
};
