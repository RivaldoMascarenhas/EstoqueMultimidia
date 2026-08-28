import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string;

    // 1. Áreas exclusivas de ADMIN (Usuários, Auditoria, Permissões e Configurações globais)
    if (
      (pathname.startsWith("/usuarios") ||
        pathname.startsWith("/configuracoes") ||
        pathname.startsWith("/auditoria") ||
        pathname.startsWith("/permissoes")) &&
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
    "/armario/:path*",
    "/auditoria/:path*",
    "/biometria/:path*",
    "/caixas/:path*",
    "/configuracoes/:path*",
    "/emprestimos/:path*",
    "/estoque/:path*",
    "/eventos/:path*",
    "/manutencao/:path*",
    "/movimentacoes/:path*",
    "/patrimonio/:path*",
    "/perfil/:path*",
    "/permissoes/:path*",
    "/presenca/:path*",
    "/relatorios/:path*",
    "/salas/:path*",
    "/scanner/:path*",
    "/sorteios/:path*",
    "/usuarios/:path*",
  ],
};
