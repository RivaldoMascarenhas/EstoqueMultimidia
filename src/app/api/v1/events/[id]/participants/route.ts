import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { addParticipantSchema } from "@/schemas/event.schema";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canDeleteParticipant, EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { assertEventAccess } from "@/lib/event-access";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PARTICIPANTS_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;
    const isEligibleParam = searchParams.get("isEligible");
    const isEligible = isEligibleParam !== null ? isEligibleParam === "true" : undefined;
    const hasPresenceParam = searchParams.get("hasPresence");
    const hasPresence = hasPresenceParam !== null ? hasPresenceParam === "true" : undefined;
    const hasFaceParam = searchParams.get("hasFace");
    const hasFace = hasFaceParam !== null ? hasFaceParam === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await EventService.listEventParticipants(eventId, {
      query,
      category,
      isEligible,
      hasPresence,
      hasFace,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Erro ao listar participantes:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao listar participantes." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = addParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const participant = await EventService.addParticipant(
      eventId,
      parsed.data.personId,
      parsed.data.category,
      parsed.data.ticketNumber,
      session?.user?.id
    );

    return NextResponse.json({ success: true, participant }, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao adicionar participante:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao adicionar participante." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PARTICIPANTS_DELETE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    if (!personId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'personId' é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Consultar participante e presenças no banco de dados
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_personId: { eventId, personId },
      },
      include: {
        person: {
          include: {
            presences: {
              where: { eventId },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "Inscrição do participante não encontrada." },
        { status: 404 }
      );
    }

    const hasPresence = participant.person.presences.length > 0;

    // 2. Aplicar regra de estado e RBAC
    const userRole = (session?.user?.role || Role.OPERADOR) as Role;
    if (!canDeleteParticipant(userRole, { hasPresence })) {
      return NextResponse.json(
        {
          success: false,
          error: "Este participante já possui presença confirmada e não pode ser removido.",
        },
        { status: 403 }
      );
    }

    await EventService.removeParticipant(eventId, personId, session?.user?.id);
    return NextResponse.json({ success: true, message: "Participante removido do evento com sucesso." });
  } catch (err: any) {
    console.error("Erro ao remover participante:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao remover participante." },
      { status: 400 }
    );
  }
}
