import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarService } from "@/services/google-calendar.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const runLiveTest = searchParams.get("test") === "true";

    // 1. Dados do OAuth2
    const oauthConfig = await prisma.googleIntegration.findUnique({
      where: { id: "default" },
    });

    const isOAuthConfigured = Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    const isOAuthConnected = Boolean(oauthConfig?.connected && oauthConfig?.refreshToken);

    // 2. Dados da Service Account
    const calendarId = oauthConfig?.calendarId || process.env.GOOGLE_CALENDAR_ID || "primary";
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
    const hasPrivateKey = Boolean(process.env.GOOGLE_PRIVATE_KEY);
    const isServiceAccountConfigured = Boolean(clientEmail && hasPrivateKey);

    const isConnected = isOAuthConnected || isServiceAccountConfigured;

    // 3. Contadores de status de sincronização no banco local
    const [totalSynced, totalPending, totalError] = await Promise.all([
      prisma.request.count({ where: { syncStatus: "SYNCED" } }),
      prisma.request.count({ where: { syncStatus: "PENDING" } }),
      prisma.request.count({ where: { syncStatus: "ERROR" } }),
    ]);

    let testResult: any = null;

    if (runLiveTest) {
      const auth = await GoogleCalendarService.getActiveAuth();

      if (auth.mode === "MOCK") {
        testResult = {
          success: true,
          mode: "MOCK_SIMULATION",
          message: "Modo de simulação ativo (credenciais não conectadas). Nenhum erro de bloqueio.",
        };
      } else {
        const startTest = Date.now();
        try {
          const testEvent = await GoogleCalendarService.createEvent({
            summary: "[Teste Conexão EstoqueMultimidia]",
            location: "Teste de Diagnóstico de Sistema",
            description: "Evento temporário para validar permissão de escrita e leitura.",
            startTime: new Date(),
            endTime: new Date(Date.now() + 15 * 60 * 1000),
          });

          const latencyMs = Date.now() - startTest;

          if (testEvent.success && testEvent.eventId) {
            await GoogleCalendarService.deleteEvent(testEvent.eventId).catch(() => {});

            testResult = {
              success: true,
              mode: auth.mode,
              latencyMs,
              calendarId: auth.calendarId,
              message: `Conexão bem-sucedida com Google Calendar via ${auth.mode === "OAUTH" ? "OAuth (" + (oauthConfig?.accountEmail || "Conta Google") + ")" : "Service Account"} em ${latencyMs}ms! Permissões de escrita validadas.`,
            };
          } else {
            testResult = {
              success: false,
              mode: auth.mode,
              latencyMs,
              calendarId: auth.calendarId,
              error: testEvent.error || "Não foi possível criar evento de teste no calendário.",
            };
          }
        } catch (e: any) {
          testResult = {
            success: false,
            mode: "CONNECTION_ERROR",
            error: e.message || "Falha ao conectar com os servidores do Google.",
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isConfigured: isConnected,
        activeMode: isOAuthConnected ? "OAUTH" : isServiceAccountConfigured ? "SERVICE_ACCOUNT" : "MOCK",
        oauth: {
          isOAuthConfigured,
          isConnected: isOAuthConnected,
          accountEmail: oauthConfig?.accountEmail || null,
          calendarName: oauthConfig?.calendarName || null,
          calendarId: oauthConfig?.calendarId || null,
        },
        serviceAccount: {
          isConfigured: isServiceAccountConfigured,
          clientEmail,
        },
        calendarId,
        stats: {
          synced: totalSynced,
          pending: totalPending,
          error: totalError,
        },
        testResult,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar status da integração Google Calendar." },
      { status: 500 }
    );
  }
}
