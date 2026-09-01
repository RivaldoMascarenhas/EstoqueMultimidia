import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { updateEventSchema } from "@/schemas/event.schema";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { canDeleteEventByRoleAndTime } from "@/lib/event-time";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.EVENTS_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const event = await EventService.getEventById(id);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error("Erro ao buscar evento:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar evento." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.EVENTS_EDIT,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const updated = await EventService.updateEvent(
      id,
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("Erro ao atualizar evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar evento." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) {
    return NextResponse.json(
      { success: false, error: "Acesso não autorizado para excluir eventos." },
      { status: 403 }
    );
  }

  try {
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.EVENTS_DELETE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const event = access.event;

    // Regra de tempo: Operador/Gestor só pode excluir se faltar mais de 30 minutos para o início do evento.
    // O Administrador pode excluir a qualquer momento.
    const timeCheck = canDeleteEventByRoleAndTime(session.user.role, event);
    if (!timeCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: timeCheck.reason || "Exclusão não permitida a menos de 30 minutos do início do evento.",
        },
        { status: 403 }
      );
    }

    await EventService.deleteEvent(id, session?.user?.id);
    return NextResponse.json({ success: true, message: "Evento excluído com sucesso." });
  } catch (err: any) {
    console.error("Erro ao excluir evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir evento." },
      { status: 400 }
    );
  }
}
