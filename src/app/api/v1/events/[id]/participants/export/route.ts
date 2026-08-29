import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const eventId = params.id;
    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.REPORTS_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const presenceOnly = searchParams.get("presenceOnly") === "true";

    // 1. Fetch Event Info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true, location: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      );
    }

    // 2. Fetch all participants with their presence and draw winner info
    const participants = await prisma.eventParticipant.findMany({
      where: {
        eventId,
        ...(presenceOnly
          ? {
              person: {
                presences: {
                  some: { eventId },
                },
              },
            }
          : {}),
      },
      orderBy: { ticketNumber: "asc" },
      include: {
        person: {
          include: {
            presences: {
              where: { eventId },
              select: { method: true, capturedAt: true, confidence: true },
            },
            drawsWon: {
              where: { eventId },
              include: {
                prize: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // 3. Build CSV string with UTF-8 BOM
    const header = [
      "Nº Ticket",
      "Nome Completo",
      "Matrícula / ID",
      "Categoria",
      "E-mail",
      "Telefone",
      "Presença Validada",
      "Data e Hora do Check-in",
      "Método de Validação",
      "Status no Sorteio",
      "Prêmio Ganho",
    ];

    const rows = participants.map((p) => {
      const presence = p.person.presences?.[0];
      const hasPresence = Boolean(presence);
      const winner = p.person.drawsWon?.[0];

      let formattedDate = "";
      if (presence?.capturedAt) {
        const d = new Date(presence.capturedAt);
        formattedDate = d.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
      }

      let methodLabel = "Nenhum";
      if (hasPresence) {
        methodLabel = presence?.method === "FACE" ? "Biometria Facial" : "Manual / Operador";
      }

      const drawStatus = winner ? "CONTEMPLADO" : "NÃO SORTEADO";
      const prizeName = winner?.prize?.name || "—";

      // Escape quotes for CSV
      const escape = (str: string | number | null | undefined) => {
        if (str === null || str === undefined) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      return [
        p.ticketNumber ? String(p.ticketNumber).padStart(3, "0") : "—",
        escape(p.person.name),
        escape(p.person.registration || "—"),
        escape(p.person.category || p.category || "Participante"),
        escape(p.person.email || "—"),
        escape(p.person.phone || "—"),
        hasPresence ? "SIM" : "NÃO",
        escape(formattedDate || "—"),
        escape(methodLabel),
        drawStatus,
        escape(prizeName),
      ].join(";");
    });

    // UTF-8 BOM (\uFEFF) ensures Excel opens special characters and accents seamlessly
    const csvContent = "\uFEFF" + [header.join(";"), ...rows].join("\r\n");

    const sanitizedEventName = event.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 30);
    const filename = `presencas_${sanitizedEventName}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao exportar lista." },
      { status: 500 }
    );
  }
}
