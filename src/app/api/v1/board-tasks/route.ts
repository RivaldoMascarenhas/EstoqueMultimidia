import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role, BoardTaskStatus, BoardTaskPriority } from "@prisma/client";
import { boardTaskCreateSchema } from "@/schemas/board-task.schema";
import { BoardTaskService } from "@/services/board-task.service";
import { formatZodError } from "@/lib/utils";
import { getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as BoardTaskStatus | null;
    const priorityParam = searchParams.get("priority") as BoardTaskPriority | null;
    const assignedToId = searchParams.get("assignedToId") || undefined;
    const search = searchParams.get("search") || undefined;

    const items = await BoardTaskService.list({
      status: statusParam && Object.values(BoardTaskStatus).includes(statusParam) ? statusParam : undefined,
      priority: priorityParam && Object.values(BoardTaskPriority).includes(priorityParam) ? priorityParam : undefined,
      assignedToId,
      search,
    });

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao listar tarefas do quadro." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(
    [Role.ADMIN, Role.GESTOR],
    { req }
  );
  if (error) return error;

  try {
    const body = await req.json();
    const validatedData = boardTaskCreateSchema.parse(body);

    const task = await BoardTaskService.create(
      validatedData,
      session!.user.id,
      getClientIp(req)
    );

    return NextResponse.json({ success: true, item: task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(err, "Erro ao criar tarefa no quadro.") },
      { status: 400 }
    );
  }
}
