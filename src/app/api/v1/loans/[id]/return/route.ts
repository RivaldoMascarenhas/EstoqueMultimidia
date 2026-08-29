import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { loanReturnSchema } from "@/schemas/loan.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do empréstimo obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = loanReturnSchema.parse(body);

    const updatedLoan = await LoanService.returnLoan(
      id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    const conditionText =
      validatedData.condition === "DAMAGED"
        ? "registrada com registro de avaria/defeito"
        : "concluída com sucesso";

    return NextResponse.json({
      success: true,
      message: `Devolução ${conditionText}!`,
      data: updatedLoan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar devolução." },
      { status: 400 }
    );
  }
}
