import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { deliverPrizeSchema } from "@/schemas/draw.schema";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { getClientIp } from "@/lib/audit";

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
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.WINNERS_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const winners = await DrawService.listEventWinners(eventId);
    return NextResponse.json({ success: true, winners });
  } catch (err: any) {
    console.error("Erro ao buscar vencedores:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar vencedores." },
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
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.WINNERS_DELIVER,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = deliverPrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(req);

    const winner = await DrawService.deliverPrize({
      winnerId: parsed.data.winnerId,
      eventId,
      delivered: parsed.data.delivered,
      notes: parsed.data.notes,
      operatorUserId: session?.user?.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, winner });
  } catch (err: any) {
    console.error("Erro ao atualizar entrega de prêmio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar entrega de prêmio." },
      { status: 400 }
    );
  }
}
