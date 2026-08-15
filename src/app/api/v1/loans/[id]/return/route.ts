import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoanService } from "@/services/loan.service";
import { loanReturnSchema } from "@/schemas/loan.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = loanReturnSchema.parse(body);

    const updatedLoan = await LoanService.returnLoan(
      params.id,
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
