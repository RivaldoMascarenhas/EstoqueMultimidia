import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestTaskToggleSchema } from "@/schemas/request.schema";
import { requireSession, requireRole } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestTaskToggleSchema.parse(body);

    const updated = await RequestService.toggleTask(
      id,
      taskId,
      validated.completed,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: validated.completed ? "Tarefa marcada como concluída!" : "Tarefa desmarcada.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao atualizar tarefa operacional.") },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (error) return error;

    const updated = await RequestService.deleteTask(
      id,
      taskId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Tarefa removida com sucesso.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao remover tarefa.") },
      { status: 400 }
    );
  }
}
