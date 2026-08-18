import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role, RequestOrigin, RequestStatus } from "@prisma/client";
import { ShiftService } from "@/services/shift.service";

interface LegacyEventImportItem {
  summary?: string;
  location?: string;
  description?: string;
  startTime: string;
  endTime: string;
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();
    const events: LegacyEventImportItem[] = body.events || [];

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum evento legado fornecido para importação." },
        { status: 400 }
      );
    }

    const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
    const shiftConfigs = await ShiftService.getShiftConfigs();

    // Resolução segura de userId existente no banco
    let validUserId: string | null = session?.user?.id || null;
    if (validUserId) {
      const exists = await prisma.user.findUnique({ where: { id: validUserId }, select: { id: true } });
      if (!exists) validUserId = null;
    }
    if (!validUserId && session?.user?.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (byEmail) validUserId = byEmail.id;
    }
    if (!validUserId) {
      const fallback = await prisma.user.findFirst({ select: { id: true } });
      validUserId = fallback?.id || session.user.id;
    }
    const resolvedUserId: string = validUserId;

    const importedRequests = [];

    for (const evt of events) {
      const start = new Date(evt.startTime);
      const end = new Date(evt.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      const dateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const shift = ShiftService.getShiftFromTime(start, shiftConfigs);

      // Heurística de localização para encontrar a Sala correspondente
      const locationText = (evt.location || "").toLowerCase().trim();
      const matchedRoom = rooms.find((r) =>
        locationText.includes(r.name.toLowerCase()) ||
        locationText.includes(`sala ${r.name.toLowerCase()}`)
      ) || rooms[0]; // fallback na primeira sala se não achar

      // Heurística de descrição para extrair professor e equipamento
      const desc = evt.description || evt.summary || "";
      let professorName: string | null = null;
      if (desc.toLowerCase().includes("prof")) {
        const profMatch = desc.match(/(?:prof|profa|professor|professora)\.?\s+([a-zA-ZÀ-ÿ\s]+)/i);
        if (profMatch && profMatch[1]) {
          professorName = profMatch[0].trim();
        }
      }

      const created = await prisma.request.create({
        data: {
          date: dateOnly,
          startTime: start,
          endTime: end,
          shift,
          roomId: matchedRoom.id,
          professorName: professorName || (evt.summary || "Professor a confirmar"),
          discipline: "Reserva Histórica (Google Calendar)",
          attendanceType: "Atendimento Presencial",
          notes: `[Importado de legado] Título: "${evt.summary || ""}" | Local: "${evt.location || ""}" | Descrição: "${desc}"`,
          status: RequestStatus.AGENDADO,
          origin: RequestOrigin.IMPORTADO_LEGADO,
          needsReview: true,
          createdById: resolvedUserId,
          items: {
            create: [
              {
                label: desc ? desc.substring(0, 100) : "Equipamento a confirmar",
                quantity: 1,
                separated: false,
              },
            ],
          },
        },
      });

      importedRequests.push(created);
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "IMPORT_LEGACY_REQUEST",
        entity: "Request",
        details: { count: importedRequests.length },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${importedRequests.length} eventos legados importados com sucesso para a fila de revisão!`,
      data: {
        importedCount: importedRequests.length,
        items: importedRequests,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao importar eventos legados." },
      { status: 500 }
    );
  }
}
