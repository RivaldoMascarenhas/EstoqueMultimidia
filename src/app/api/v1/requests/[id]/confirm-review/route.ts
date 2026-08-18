import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestLegacyConfirmSchema } from "@/schemas/request.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestLegacyConfirmSchema.parse(body);

    const confirmed = await RequestService.confirmReview(
      params.id,
      validated,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Solicitação revisada e confirmada na agenda com sucesso!",
      data: confirmed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao confirmar revisão da solicitação." },
      { status: 400 }
    );
  }
}
