import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const baseUrl = origin;

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/configuracoes?tab=google-calendar&error=${error || "NO_CODE"}`, baseUrl)
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = `${origin}/api/v1/integrations/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/configuracoes?tab=google-calendar&error=MISSING_OAUTH_CREDENTIALS", baseUrl)
    );
  }

  try {
    // 1. Trocar o código de autorização pelos tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Erro ao trocar token OAuth:", errText);
      return NextResponse.redirect(
        new URL("/configuracoes?tab=google-calendar&error=TOKEN_EXCHANGE_FAILED", baseUrl)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    // 2. Buscar perfil do usuário do Google logado
    let userEmail = "Conta Google";
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.email || userEmail;
      }
    } catch {}

    // 3. Buscar lista de calendários para encontrar "Academico.engenharias"
    let targetCalendarId = "primary";
    let targetCalendarName = "Principal";

    try {
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (calRes.ok) {
        const calList = await calRes.json();
        const found = calList.items?.find((c: any) =>
          c.summary?.toLowerCase().includes("academico.engenharias") ||
          c.summary?.toLowerCase().includes("engenharias") ||
          c.summary?.toLowerCase().includes("academico")
        );
        if (found) {
          targetCalendarId = found.id;
          targetCalendarName = found.summary;
        } else if (calList.items?.length > 0) {
          targetCalendarId = calList.items[0].id;
          targetCalendarName = calList.items[0].summary;
        }
      }
    } catch {}

    // 4. Salvar integração no banco de dados
    await prisma.googleIntegration.upsert({
      where: { id: "default" },
      update: {
        accountEmail: userEmail,
        accessToken,
        refreshToken: refreshToken || undefined, // Se já existir refreshToken anterior, mantém
        expiryDate,
        calendarId: targetCalendarId,
        calendarName: targetCalendarName,
        connected: true,
      },
      create: {
        id: "default",
        accountEmail: userEmail,
        accessToken,
        refreshToken,
        expiryDate,
        calendarId: targetCalendarId,
        calendarName: targetCalendarName,
        connected: true,
      },
    });

    return NextResponse.redirect(
      new URL("/configuracoes?tab=google-calendar&connected=true", baseUrl)
    );
  } catch (err) {
    console.error("Erro no callback OAuth:", err);
    return NextResponse.redirect(
      new URL("/configuracoes?tab=google-calendar&error=INTERNAL_ERROR", baseUrl)
    );
  }
}
