import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function POST(
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
    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const { personIds = [] } = body;

    if (!Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma pessoa selecionada." },
        { status: 400 }
      );
    }

    const result = await EventService.enrollBatch({
      eventId: id,
      personIds,
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao inscrever participantes em lote." },
      { status: 400 }
    );
  }
}
