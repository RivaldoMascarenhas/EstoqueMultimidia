import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoanService } from "@/services/loan.service";
import { loanRenewSchema } from "@/schemas/loan.schema";

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
    const validatedData = loanRenewSchema.parse(body);

    const updatedLoan = await LoanService.renewLoan(
      params.id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Prazo de devolução prorrogado com sucesso!",
      data: updatedLoan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao renovar empréstimo." },
      { status: 400 }
    );
  }
}
