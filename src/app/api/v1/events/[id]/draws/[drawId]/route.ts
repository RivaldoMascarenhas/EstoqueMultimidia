import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { realtimeService } from "@/services/realtime.service";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; drawId: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
  ]);
  if (error) {
    return NextResponse.json(
      { success: false, error: "Apenas administradores e gestores podem anular ou invalidar sorteios realizados." },
      { status: 403 }
    );
  }

  try {
    const access = await assertEventAccess(params.id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.DRAW_INVALIDATE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    let reason = "Ausente no momento do sorteio";
    let disqualifyParticipant = true;

    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
      if (body.disqualifyParticipant !== undefined) {
        disqualifyParticipant = Boolean(body.disqualifyParticipant);
      }
    } catch {
      // JSON body might be empty on direct DELETE request
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;

    const result = await DrawService.cancelDraw({
      drawId: params.drawId,
      eventId: params.id,
      reason,
      disqualifyParticipant,
      operatorUserId: session?.user?.id,
      ipAddress,
    });

    // Notificar telões e operadores imediatamente em tempo real
    await realtimeService.publish(params.id, {
      type: "draw:cancel",
      state: "IDLE",
      winner: null,
    });

    return NextResponse.json({
      message: "Sorteio anulado e prêmio devolvido para a fila com sucesso!",
      ...result,
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao anular sorteio." },
      { status: 400 }
    );
  }
}
