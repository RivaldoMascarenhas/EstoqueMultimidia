import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${origin}/api/v1/integrations/google-calendar/callback`;

    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          "/configuracoes?tab=google-calendar&error=GOOGLE_OAUTH_CLIENT_ID_NAO_CONFIGURADO",
          req.url
        )
      );
    }

    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent"); // Força o envio do refresh_token

    return NextResponse.redirect(authUrl.toString());
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao iniciar autenticação OAuth." },
      { status: 500 }
    );
  }
}
