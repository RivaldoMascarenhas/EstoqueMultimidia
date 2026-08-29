import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export function middlewareHandler(req: any) {
  const token = req.nextauth?.token;
  const pathname = req.nextUrl?.pathname || "";
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

    // 2. Bloqueio de áreas não autorizadas para perfil Acadêmico (ACADEMIC_SUPPORT)
    if (
      role === "ACADEMIC_SUPPORT" &&
      (pathname.startsWith("/armario") ||
        pathname.startsWith("/caixas") ||
        pathname.startsWith("/estoque") ||
        pathname.startsWith("/patrimonio") ||
        pathname.startsWith("/emprestimos") ||
        pathname.startsWith("/manutencao") ||
        pathname.startsWith("/movimentacoes") ||
        pathname.startsWith("/relatorios") ||
        pathname.startsWith("/biometria") ||
        pathname.startsWith("/eventos") ||
        pathname.startsWith("/presenca") ||
        pathname.startsWith("/sorteios") ||
        pathname.startsWith("/scanner") ||
        pathname.startsWith("/totem"))
    ) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }

    // 3. Isolamento estrito de rotas para o perfil EVENTOS
    if (
      role === "EVENTOS" &&
      (pathname.startsWith("/armario") ||
        pathname.startsWith("/caixas") ||
        pathname.startsWith("/estoque") ||
        pathname.startsWith("/patrimonio") ||
        pathname.startsWith("/emprestimos") ||
        pathname.startsWith("/manutencao") ||
        pathname.startsWith("/movimentacoes") ||
        pathname.startsWith("/agenda") ||
        pathname.startsWith("/salas") ||
        pathname.startsWith("/scanner") ||
        pathname.startsWith("/usuarios") ||
        pathname.startsWith("/configuracoes") ||
        pathname.startsWith("/auditoria") ||
        pathname.startsWith("/permissoes"))
    ) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
    }

    // 4. Bloqueio de rotas operacionais e de mutação para perfil CONSULTA (somente leitura)
    if (
      role === "CONSULTA" &&
      (pathname.startsWith("/agenda/nova-solicitacao") ||
        pathname.startsWith("/agenda/revisao-legado") ||
        pathname.startsWith("/totem") ||
        pathname.startsWith("/biometria/testar") ||
        pathname.includes("/sorteio"))
    ) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
    }

    return NextResponse.next();
}

export default withAuth(middlewareHandler, {
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
});

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
    "/totem/:path*",
    "/usuarios/:path*",
  ],
};
