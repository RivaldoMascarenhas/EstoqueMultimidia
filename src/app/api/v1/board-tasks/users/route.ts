import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { BoardTaskService } from "@/services/board-task.service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const users = await BoardTaskService.listAssignableUsers();
    return NextResponse.json({ success: true, items: users });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao carregar usuários elegíveis." },
      { status: 500 }
    );
  }
}
