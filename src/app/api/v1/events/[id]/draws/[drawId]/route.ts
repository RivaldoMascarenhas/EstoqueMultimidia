import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; drawId: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
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
      reason,
      disqualifyParticipant,
      operatorUserId: session?.user?.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Sorteio anulado e prêmio devolvido para a fila com sucesso!",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao anular sorteio." },
      { status: 400 }
    );
  }
}
