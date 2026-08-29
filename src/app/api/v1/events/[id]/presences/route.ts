import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { manualPresenceSchema } from "@/schemas/event.schema";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
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
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENCE_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const result = await EventService.getRecentPresences(eventId, limit);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Erro ao listar presenças recentes:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao listar presenças recentes." },
      { status: 500 }
    );
  }
}

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
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENCE_REGISTER,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = manualPresenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const result = await EventService.registerManualPresence(
      eventId,
      parsed.data.personId,
      session?.user?.id
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro ao registrar presença manual:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao registrar presença manual." },
      { status: 400 }
    );
  }
}
