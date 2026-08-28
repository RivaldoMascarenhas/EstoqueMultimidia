import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

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
      { success: false, error: err.message || "Erro ao calcular elegibilidade." },
      { status: 500 }
    );
  }
}
