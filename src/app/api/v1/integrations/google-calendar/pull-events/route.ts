import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarService } from "@/services/google-calendar.service";
import { ShiftService } from "@/services/shift.service";
import { requireSession } from "@/lib/api-guard";
import { Role, RequestOrigin, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const auth = await GoogleCalendarService.getActiveAuth();
    if (!auth.accessToken) {
      return NextResponse.json(
        { success: false, error: "Nenhuma autenticação ativa para consultar o Google Calendar." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const pullAll = searchParams.get("all") === "true";
    const daysAhead = parseInt(searchParams.get("days") || "180", 10);

    const gcalUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`
    );
    
    if (!pullAll && searchParams.has("days")) {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
      gcalUrl.searchParams.set("timeMin", timeMin);
      gcalUrl.searchParams.set("timeMax", timeMax);
    }

    gcalUrl.searchParams.set("singleEvents", "true");
    gcalUrl.searchParams.set("orderBy", "startTime");
    gcalUrl.searchParams.set("maxResults", "500");

    const response = await fetch(gcalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Erro na API do Google Calendar (${response.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const json = await response.json();
    const events = json.items || [];

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum evento encontrado no período selecionado nesta agenda.",
        data: { totalFound: 0, imported: 0, skipped: 0 },
      });
    }

    let rooms = await prisma.room.findMany({ select: { id: true, name: true } });
    if (rooms.length === 0) {
      const created = await prisma.room.create({
        data: { name: "Auditório / Geral", floor: "Térreo" },
      });
      rooms = [created];
    }
    const defaultRoom = rooms[0];

    const shiftConfigs = await ShiftService.getShiftConfigs();
    
    // Resolução segura de userId existente no banco de dados
    let validUserId: string | null = null;
    if (session?.user?.id) {
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
      if (userExists) validUserId = userExists.id;
    }

    if (!validUserId && session?.user?.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (userByEmail) validUserId = userByEmail.id;
    }

    if (!validUserId) {
      const fallbackUser = await prisma.user.findFirst({
        where: { active: true },
        select: { id: true },
      });
      validUserId = fallbackUser?.id || null;
    }

    if (!validUserId) {
      return NextResponse.json(
        { success: false, error: "Nenhum usuário ativo encontrado no banco de dados para registrar os eventos." },
        { status: 500 }
      );
    }
    const userId = validUserId;

    let importedCount = 0;
    let skippedCount = 0;

    for (const evt of events) {
      if (!evt.id) {
        skippedCount++;
        continue;
      }

      const existing = await prisma.request.findFirst({
        where: { googleEventId: evt.id },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Trata data e hora (suporta tanto dateTime quanto date de evento de dia inteiro)
      let startTime: Date;
      let endTime: Date;

      if (evt.start?.dateTime) {
        startTime = new Date(evt.start.dateTime);
        endTime = new Date(evt.end?.dateTime || new Date(startTime.getTime() + 2 * 3600 * 1000));
      } else if (evt.start?.date) {
        const [y, m, d] = evt.start.date.split("-").map(Number);
        startTime = new Date(y, m - 1, d, 8, 0, 0);
        endTime = new Date(y, m - 1, d, 12, 0, 0);
      } else {
        skippedCount++;
        continue;
      }

      const dateOnly = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 0, 0, 0);
      const shift = ShiftService.getShiftFromTime(startTime, shiftConfigs);

      // Heurística de Localização / Sala
      const searchTarget = `${evt.summary || ""} ${evt.location || ""} ${evt.description || ""}`.toLowerCase();
      let matchedRoom = rooms.find((r) => {
        const rName = r.name.toLowerCase();
        return (
          searchTarget.includes(`sala ${rName}`) ||
          searchTarget.includes(`sala: ${rName}`) ||
          searchTarget.includes(`lab ${rName}`) ||
          searchTarget.includes(` ${rName} `) ||
          searchTarget.endsWith(` ${rName}`)
        );
      });

      if (!matchedRoom) {
        // Se a localização do Google tiver um nome de sala explícito, cria ela dinamicamente
        const locClean = (evt.location || "").trim();
        if (locClean && locClean.length <= 20) {
          try {
            matchedRoom = await prisma.room.create({
              data: { name: locClean, floor: "A Definir" },
            });
            rooms.push(matchedRoom);
          } catch {
            matchedRoom = defaultRoom;
          }
        } else {
          matchedRoom = defaultRoom;
        }
      }

      // Extração de Professor
      let professorName: string | null = null;
      const profMatch = searchTarget.match(/(?:prof|profa|professor|professora)\.?\s+([a-zA-ZÀ-ÿ\s]+)/i);
      if (profMatch && profMatch[0]) {
        professorName = profMatch[0].trim().replace(/[\n\r]+/g, " ");
      } else {
        professorName = evt.summary || "Professor a confirmar";
      }

      await prisma.request.create({
        data: {
          date: dateOnly,
          startTime,
          endTime,
          shift,
          roomId: matchedRoom.id,
          professorName,
          discipline: evt.summary || "Atendimento Importado",
          attendanceType: "Google Calendar",
          notes: `[Importado do Google Calendar] "${evt.summary || ""}" | Local: "${evt.location || ""}"`,
          status: RequestStatus.AGENDADO,
          origin: RequestOrigin.IMPORTADO_LEGADO,
          needsReview: true,
          googleEventId: evt.id,
          googleCalendarId: auth.calendarId,
          syncStatus: "SYNCED",
          createdById: userId,
          items: {
            create: [
              {
                label: evt.description ? evt.description.substring(0, 100) : "Equipamento a verificar",
                quantity: 1,
                separated: false,
              },
            ],
          },
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} agendamentos sincronizados do Google Calendar com sucesso! (${skippedCount} já existentes/ignorados)`,
      data: {
        totalFound: events.length,
        imported: importedCount,
        skipped: skippedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao sincronizar agendamentos do Google Calendar." },
      { status: 500 }
    );
  }
}
