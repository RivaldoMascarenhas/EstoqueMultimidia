import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
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
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.DRAW_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const { searchParams } = new URL(req.url);
    const requireRegistration = searchParams.get("requireRegistration") !== "false";
    const requirePresence = searchParams.get("requirePresence") !== "false";
    const requireFacialPresenceOnly = searchParams.get("requireFacialPresenceOnly") === "true";
    const allowRepeatWinners = searchParams.get("allowRepeatWinners") === "true";
    const categoryFilter = searchParams.get("category") || null;

    const eligible = await DrawEligibilityService.getEligibleParticipants({
      eventId,
      requireRegistration,
      requirePresence,
      requireFacialPresenceOnly,
      allowRepeatWinners,
      categoryFilter,
    });

    return NextResponse.json({
      success: true,
      totalEligible: eligible.length,
      eligible,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao calcular elegibilidade." },
      { status: 500 }
    );
  }
}
