import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.CONSULTA,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || undefined;

    const data = await RequestService.getRequestsByShift(dateParam || new Date());

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao carregar atendimentos por turno." },
      { status: 500 }
    );
  }
}
