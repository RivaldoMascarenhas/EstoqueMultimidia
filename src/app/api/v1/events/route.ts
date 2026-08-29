import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { createEventSchema } from "@/schemas/event.schema";
import { EventStatus, Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const status = (searchParams.get("status") as EventStatus) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await EventService.listEvents({
      query,
      status,
      page,
      limit,
      userId: session?.user?.id,
      role: session?.user?.role as Role,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Erro ao listar eventos:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao listar eventos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const event = await EventService.createEvent(
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao criar evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar evento." },
      { status: 400 }
    );
  }
}
