import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { boardTaskUpdateSchema } from "@/schemas/board-task.schema";
import { BoardTaskService } from "@/services/board-task.service";
import { formatZodError } from "@/lib/utils";
import { getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const { id } = await params;
    const task = await BoardTaskService.getById(id);
    return NextResponse.json({ success: true, item: task });
  } catch (err: any) {
    const status = err.message === "Tarefa não encontrada" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar tarefa." },
      { status }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(
    [Role.ADMIN, Role.GESTOR, Role.OPERADOR],
    { req }
  );
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = boardTaskUpdateSchema.parse(body);

    const task = await BoardTaskService.moveOrUpdate(
      id,
      validatedData,
      session!.user.id,
      getClientIp(req)
    );

    return NextResponse.json({ success: true, item: task });
  } catch (err: any) {
    if (err.message === "Tarefa não encontrada") {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: formatZodError(err, "Erro ao atualizar tarefa.") },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(
    [Role.ADMIN, Role.GESTOR],
    { req }
  );
  if (error) return error;

  try {
    const { id } = await params;
    await BoardTaskService.remove(id, session!.user.id, getClientIp(req));
    return NextResponse.json({ success: true, message: "Tarefa excluída com sucesso." });
  } catch (err: any) {
    const status = err.message === "Tarefa não encontrada" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir tarefa." },
      { status }
    );
  }
}
