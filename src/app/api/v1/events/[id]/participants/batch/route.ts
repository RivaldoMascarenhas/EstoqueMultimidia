import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

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
    const { personIds = [] } = body;

    if (!Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma pessoa selecionada." },
        { status: 400 }
      );
    }

    const result = await EventService.enrollBatch({
      eventId: params.id,
      personIds,
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao inscrever participantes em lote." },
      { status: 400 }
    );
  }
}
