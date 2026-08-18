import { prisma } from "@/lib/prisma";

export interface CalendarEventPayload {
  summary: string;
  location: string;
  description: string;
  startTime: Date;
  endTime: Date;
  recurrenceRule?: string[]; // e.g. ["RRULE:FREQ=WEEKLY;UNTIL=20261231T235959Z"]
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string | null;
  error?: string | null;
}

export class GoogleCalendarService {
  /**
   * Constrói o payload padronizado para o Google Calendar a partir de uma solicitação de atendimento
   */
  static buildEventPayload(request: any): CalendarEventPayload {
    const roomName = request.room?.name || "Sala não definida";
    const profName = request.professorName || "Professor";
    const discipline = request.discipline ? ` - ${request.discipline}` : "";
    const itemsList = request.items?.map((i: any) => i.label || i.item?.name).join(", ") || "Nenhum equipamento";

    const summary = `[Multimídia] Sala ${roomName} • ${profName}${discipline}`;
    const location = `Sala ${roomName}${request.room?.floor ? ` (${request.room.floor})` : ""}`;
    const description = [
      `Atendimento de Multimídia: Sala ${roomName}`,
      `Docente / Solicitante: ${profName}`,
      request.discipline ? `Disciplina: ${request.discipline}` : null,
      request.attendanceType ? `Tipo: ${request.attendanceType}` : null,
      `Equipamentos: ${itemsList}`,
      request.room?.fixedProjectorModel ? `Projetor da sala: ${request.room.fixedProjectorModel}` : null,
      request.notes ? `Observações: ${request.notes}` : null,
      `\nGerenciado pelo Sistema EstoqueMultimidia`,
    ].filter(Boolean).join("\n");

    return {
      summary,
      location,
      description,
      startTime: new Date(request.startTime),
      endTime: new Date(request.endTime),
    };
  }

  /**
   * Obtém o token de acesso ativo (Prioridade 1: OAuth2 da Conta Logada; Prioridade 2: Service Account; Prioridade 3: Mock)
   */
  static async getActiveAuth(): Promise<{
    mode: "OAUTH" | "SERVICE_ACCOUNT" | "MOCK";
    accessToken?: string;
    calendarId: string;
  }> {
    // 1. Tentar OAuth2 da Conta Conectada
    try {
      const oauthConfig = await prisma.googleIntegration.findUnique({
        where: { id: "default" },
      });

      if (oauthConfig && oauthConfig.connected && oauthConfig.refreshToken) {
        const now = new Date();
        // Se o accessToken ainda estiver válido por pelo menos 2 minutos, reutiliza
        if (
          oauthConfig.accessToken &&
          oauthConfig.expiryDate &&
          oauthConfig.expiryDate.getTime() > now.getTime() + 120 * 1000
        ) {
          return {
            mode: "OAUTH",
            accessToken: oauthConfig.accessToken,
            calendarId: oauthConfig.calendarId || "primary",
          };
        }

        // Se expirou, renova usando o refresh_token
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: oauthConfig.refreshToken,
              grant_type: "refresh_token",
            }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccessToken = refreshData.access_token;
            const expiresIn = refreshData.expires_in || 3600;
            const newExpiryDate = new Date(Date.now() + expiresIn * 1000);

            await prisma.googleIntegration.update({
              where: { id: "default" },
              data: {
                accessToken: newAccessToken,
                expiryDate: newExpiryDate,
              },
            });

            return {
              mode: "OAUTH",
              accessToken: newAccessToken,
              calendarId: oauthConfig.calendarId || "primary",
            };
          }
        }
      }
    } catch (e) {
      console.warn("Falha ao consultar OAuth token do banco:", e);
    }

    // 2. Tentar Service Account (.env)
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    if (clientEmail && privateKey) {
      const saToken = await this.getServiceAccountToken(clientEmail, privateKey);
      if (saToken) {
        return {
          mode: "SERVICE_ACCOUNT",
          accessToken: saToken,
          calendarId,
        };
      }
    }

    // 3. Fallback: Mock Simulação
    return {
      mode: "MOCK",
      calendarId,
    };
  }

  /**
   * Sincroniza a criação de um evento de saída para o Google Calendar.
   */
  static async createEvent(payload: CalendarEventPayload): Promise<CalendarSyncResult> {
    const auth = await this.getActiveAuth();

    if (auth.mode === "MOCK" || !auth.accessToken) {
      const mockEventId = `gcal_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        eventId: mockEventId,
      };
    }

    try {
      const body: any = {
        summary: payload.summary,
        location: payload.location,
        description: payload.description,
        start: {
          dateTime: payload.startTime.toISOString(),
          timeZone: "America/Fortaleza",
        },
        end: {
          dateTime: payload.endTime.toISOString(),
          timeZone: "America/Fortaleza",
        },
      };

      if (payload.recurrenceRule && payload.recurrenceRule.length > 0) {
        body.recurrence = payload.recurrenceRule;
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Google Calendar API error (${response.status}): ${errorText}`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        eventId: result.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Erro inesperado ao sincronizar com Google Calendar.",
      };
    }
  }

  /**
   * Atualiza um evento existente no Google Calendar
   */
  static async updateEvent(
    googleEventId: string,
    payload: CalendarEventPayload
  ): Promise<CalendarSyncResult> {
    const auth = await this.getActiveAuth();

    if (auth.mode === "MOCK" || !auth.accessToken || googleEventId.startsWith("gcal_evt_")) {
      return {
        success: true,
        eventId: googleEventId,
      };
    }

    try {
      const body: any = {
        summary: payload.summary,
        location: payload.location,
        description: payload.description,
        start: {
          dateTime: payload.startTime.toISOString(),
          timeZone: "America/Fortaleza",
        },
        end: {
          dateTime: payload.endTime.toISOString(),
          timeZone: "America/Fortaleza",
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      return { success: true, eventId: googleEventId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Exclui um evento do Google Calendar
   */
  static async deleteEvent(googleEventId: string): Promise<CalendarSyncResult> {
    const auth = await this.getActiveAuth();

    if (auth.mode === "MOCK" || !auth.accessToken || googleEventId.startsWith("gcal_evt_")) {
      return { success: true };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Gera token OAuth2 JWT para Service Account do Google
   */
  private static async getServiceAccountToken(
    clientEmail: string,
    privateKey: string
  ): Promise<string | null> {
    try {
      const crypto = await import("crypto");
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "RS256", typ: "JWT" };
      const claimSet = {
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/calendar.events",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };

      const encodeBase64Url = (obj: any) =>
        Buffer.from(JSON.stringify(obj))
          .toString("base64")
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");

      const encodedHeader = encodeBase64Url(header);
      const encodedClaimSet = encodeBase64Url(claimSet);
      const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

      const signer = crypto.createSign("RSA-SHA256");
      signer.update(signatureInput);
      const signature = signer
        .sign(privateKey, "base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

      const jwt = `${signatureInput}.${signature}`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      if (!tokenRes.ok) return null;
      const tokenData = await tokenRes.json();
      return tokenData.access_token || null;
    } catch {
      return null;
    }
  }
}
