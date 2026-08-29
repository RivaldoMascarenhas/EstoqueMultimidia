import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { updateEventSchema } from "@/schemas/event.schema";
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
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    const event = await EventService.getEventById(id);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error("Erro ao buscar evento:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar evento." },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const updated = await EventService.updateEvent(
      id,
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("Erro ao atualizar evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar evento." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
  ]);
  if (error) {
    return NextResponse.json(
      { success: false, error: "Apenas administradores e gestores podem excluir eventos do sistema." },
      { status: 403 }
    );
  }

  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do evento ausente." },
        { status: 400 }
      );
    }

    await EventService.deleteEvent(id, session?.user?.id);
    return NextResponse.json({ success: true, message: "Evento excluído com sucesso." });
  } catch (err: any) {
    console.error("Erro ao excluir evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir evento." },
      { status: 400 }
    );
  }
}
