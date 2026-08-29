import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { executeDrawSchema } from "@/schemas/draw.schema";
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
      requiredPermission: EVENT_PERMISSIONS.DRAW_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const draws = await DrawService.listEventDraws(eventId);
    return NextResponse.json({ success: true, draws });
  } catch (err: any) {
    console.error("Erro ao listar sorteios:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao listar sorteios." },
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
      requiredPermission: EVENT_PERMISSIONS.DRAW_OPERATE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = executeDrawSchema.safeParse({ ...body, eventId });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos para o sorteio." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await DrawService.executeDraw({
      ...parsed.data,
      operatorUserId: session?.user?.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao executar sorteio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao executar sorteio." },
      { status: 400 }
    );
  }
}
