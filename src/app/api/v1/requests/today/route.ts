import { NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const { error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.CONSULTA,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const data = await RequestService.getRequestsByShift(new Date());

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
