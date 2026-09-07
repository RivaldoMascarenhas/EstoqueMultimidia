import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { BoardTaskService } from "@/services/board-task.service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
  if (error) return error;

  try {
    await BoardTaskService.ensureSchema();
    return NextResponse.json({
      success: true,
      message: "Tabelas e enums do Quadro de Tarefas verificados e sincronizados com sucesso no PostgreSQL!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao sincronizar migração." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR], { req });
  if (error) return error;

  try {
    await BoardTaskService.ensureSchema();
    return NextResponse.json({
      success: true,
      message: "Tabelas e enums do Quadro de Tarefas verificados e sincronizados com sucesso no PostgreSQL!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao sincronizar migração." },
      { status: 500 }
    );
  }
}
