import { NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const createdById = session.user.role === Role.ACADEMIC_SUPPORT ? session.user.id : undefined;

    const pendingReview = await RequestService.getRequests({
      needsReview: true,
      createdById,
    });

    return NextResponse.json({
      success: true,
      data: pendingReview,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
