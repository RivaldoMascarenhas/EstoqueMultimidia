import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Se usuário não tem permissão para áreas administrativas restritas (ex: /usuarios)
    if (pathname.startsWith("/usuarios") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
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
