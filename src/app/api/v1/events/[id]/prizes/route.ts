import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { createPrizeSchema, updatePrizeSchema } from "@/schemas/prize.schema";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRIZES_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const prizes = await EventService.getPrizes(eventId);
    return NextResponse.json({ success: true, prizes });
  } catch (err: any) {
    console.error("Erro ao buscar prêmios:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar prêmios." },
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
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRIZES_CREATE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

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
    console.error("Erro ao criar prêmio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar prêmio." },
      { status: 400 }
    );
  }
}
