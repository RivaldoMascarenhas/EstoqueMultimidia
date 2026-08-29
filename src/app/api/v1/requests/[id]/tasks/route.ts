import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestTaskCreateSchema } from "@/schemas/request.schema";
import { requireSession, requireRole } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestTaskCreateSchema.parse(body);

    const updated = await RequestService.addTask(
      params.id,
      validated,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Tarefa adicionada com sucesso ao atendimento!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao adicionar tarefa." },
      { status: 400 }
    );
  }
}
