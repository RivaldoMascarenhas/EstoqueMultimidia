import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { BoardTaskService } from "@/services/board-task.service";

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
    const history = await BoardTaskService.getHistory(id);
    return NextResponse.json({ success: true, items: history });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao consultar histórico da tarefa." },
      { status: 500 }
    );
  }
}
