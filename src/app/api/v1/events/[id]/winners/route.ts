import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { deliverPrizeSchema } from "@/schemas/draw.schema";
import { Role } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const winners = await DrawService.listEventWinners(params.id);
    return NextResponse.json({ success: true, winners });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar vencedores." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = deliverPrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;

    const winner = await DrawService.deliverPrize({
      winnerId: parsed.data.winnerId,
      delivered: parsed.data.delivered,
      notes: parsed.data.notes,
      operatorUserId: session?.user?.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, winner });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar entrega de prêmio." },
      { status: 400 }
    );
  }
}
