import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { DrawService } from "@/services/draw.service";
import { executeDrawSchema } from "@/schemas/draw.schema";
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
    const draws = await DrawService.listEventDraws(params.id);
    return NextResponse.json({ success: true, draws });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao listar sorteios." },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = executeDrawSchema.safeParse({ ...body, eventId: params.id });

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
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao executar sorteio." },
      { status: 400 }
    );
  }
}
