import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarService } from "@/services/google-calendar.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const auth = await GoogleCalendarService.getActiveAuth();
    if (!auth.accessToken) {
      return NextResponse.json({
        success: false,
        error: "Nenhuma conta Google conectada via OAuth.",
        data: [],
      });
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
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
    const calendars = (json.items || []).map((c: any) => ({
      id: c.id,
      name: c.summary || c.id,
      description: c.description || null,
      primary: Boolean(c.primary),
      accessRole: c.accessRole, // "owner", "writer", "reader"
    }));

    // Inclui agendas institucionais FAPCE se ainda não estiverem na lista
    const institutionalCals = [
      { id: "academico.engenharias@fapce.edu.br", name: "Acadêmico - Engenharias", primary: false, accessRole: "writer" },
      { id: "academico.administracao@fapce.edu.br", name: "Acadêmico - Administração", primary: false, accessRole: "writer" },
      { id: "academico.direito@fapce.edu.br", name: "Acadêmico - Direito", primary: false, accessRole: "writer" },
      { id: "academico.sistemas@fapce.edu.br", name: "Acadêmico - Sistemas de Informação", primary: false, accessRole: "writer" },
    ];

    for (const inst of institutionalCals) {
      if (!calendars.some((c: any) => c.id.toLowerCase() === inst.id.toLowerCase())) {
        calendars.push(inst);
      }
    }

    return NextResponse.json({
      success: true,
      data: calendars,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao listar agendas do Google." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();
    const { calendarId, calendarName } = body;

    if (!calendarId) {
      return NextResponse.json(
        { success: false, error: "ID do calendário é obrigatório." },
        { status: 400 }
      );
    }

    await prisma.googleIntegration.upsert({
      where: { id: "default" },
      update: {
        calendarId,
        calendarName: calendarName || calendarId,
      },
      create: {
        id: "default",
        calendarId,
        calendarName: calendarName || calendarId,
        connected: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Calendário ativo alterado para "${calendarName || calendarId}" com sucesso!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao salvar calendário ativo." },
      { status: 500 }
    );
  }
}
