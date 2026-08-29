import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { ExportService } from "@/services/export.service";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.REPORTS_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "participants"; // participants | presences | winners
    const format = searchParams.get("format") || "csv"; // csv | xlsx | html

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Evento não encontrado." }, { status: 404 });
    }

    if (type === "winners") {
      const winners = await prisma.winner.findMany({
        where: { eventId: id },
        orderBy: { drawDate: "asc" },
        include: { person: true, prize: true, draw: true },
      });

      const formatted = winners.map((w) => ({
        "Prêmio": w.prize.name,
        "Ganhador": w.person.name,
        "Matrícula": w.person.registration || "",
        "CPF": w.person.cpf || "",
        "Bilhete": w.draw.drawnNumber ? `#${w.draw.drawnNumber}` : "",
        "Status Entrega": w.delivered ? "Entregue" : "Pendente",
        "Data do Sorteio": w.drawDate.toISOString(),
      }));

      if (format === "html") {
        const html = ExportService.generateWinnersReportHtml({
          eventName: event.name,
          eventDate: event.date ? event.date.toLocaleDateString("pt-BR") : null,
          winners: winners.map((w) => ({
            prizeName: w.prize.name,
            winnerName: w.person.name,
            registration: w.person.registration,
            drawnNumber: w.draw.drawnNumber,
            delivered: w.delivered,
            deliveredAt: w.deliveredAt ? w.deliveredAt.toISOString() : null,
            drawDate: w.drawDate.toISOString(),
          })),
        });
        return new NextResponse(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (format === "xlsx" || format === "excel") {
        const buf = await ExportService.toXlsx(formatted, "Ganhadores");
        return new NextResponse(new Uint8Array(buf), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="ganhadores-${event.slug}.xlsx"`,
          },
        });
      }

      const csv = ExportService.toCsv(formatted);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ganhadores-${event.slug}.csv"`,
        },
      });
    }

    // Default: participants export
    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: id },
      orderBy: { ticketNumber: "asc" },
      include: {
        person: {
          include: {
            presences: { where: { eventId: id } },
            faceEmbeddings: { where: { active: true } },
          },
        },
      },
    });

    const filteredParticipants = type === "presences"
      ? participants.filter((p) => p.person.presences.length > 0)
      : type === "absent"
      ? participants.filter((p) => p.person.presences.length === 0)
      : participants;

    const data = filteredParticipants.map((p) => {
      const pres = p.person.presences[0];
      return {
        "Número Bilhete": p.ticketNumber,
        "Nome": p.person.name,
        "Matrícula": p.person.registration || "",
        "CPF": p.person.cpf || "",
        "Email": p.person.email || "",
        "Telefone": p.person.phone || "",
        "Categoria": p.category || p.person.category || "",
        "Biometria Cadastrada": p.person.faceEmbeddings.length > 0 ? "Sim" : "Não",
        "Presença": pres ? "Presente" : "Ausente",
        "Método Presença": pres ? pres.method : "—",
        "Horário Presença": pres ? pres.capturedAt.toISOString() : "—",
      };
    });

    if (format === "html") {
      const html = ExportService.generateParticipantsReportHtml({
        eventName: event.name,
        eventDate: event.date ? event.date.toLocaleDateString("pt-BR") : null,
        eventTime: event.time || null,
        eventLocation: event.location || null,
        filterLabel: type === "presences" ? "Lista de Presenças Confirmadas" : type === "absent" ? "Lista de Ausentes" : "Lista Oficial de Inscritos",
        participants: filteredParticipants.map((p) => {
          const pres = p.person.presences[0];
          return {
            ticketNumber: p.ticketNumber,
            name: p.person.name,
            registration: p.person.registration,
            category: p.category || p.person.category,
            isPresent: Boolean(pres),
            capturedAt: pres?.capturedAt ? pres.capturedAt.toISOString() : null,
          };
        }),
      });
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (format === "xlsx" || format === "excel") {
      const buf = await ExportService.toXlsx(data, "Participantes");
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="participantes-${event.slug}.xlsx"`,
        },
      });
    }

    const csv = ExportService.toCsv(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="participantes-${event.slug}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao exportar dados." },
      { status: 500 }
    );
  }
}
