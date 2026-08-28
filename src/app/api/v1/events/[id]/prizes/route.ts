import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { createPrizeSchema, updatePrizeSchema } from "@/schemas/prize.schema";
import { Role } from "@prisma/client";

export async function GET(
  _req: NextRequest,
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

    const prizes = await EventService.getPrizes(eventId);
    return NextResponse.json({ success: true, prizes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar prêmios." },
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
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createPrizeSchema.safeParse({ ...body, eventId });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const prize = await EventService.createPrize(
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, prize }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar prêmio." },
      { status: 400 }
    );
  }
}
