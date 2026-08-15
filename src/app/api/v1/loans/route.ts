import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoanService } from "@/services/loan.service";
import { loanCreateSchema } from "@/schemas/loan.schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const assetId = searchParams.get("assetId") || undefined;
    const borrowerName = searchParams.get("borrowerName") || undefined;

    const loans = await LoanService.getLoans({
      search,
      status,
      assetId,
      borrowerName,
    });

    return NextResponse.json({
      success: true,
      data: loans,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar empréstimos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = loanCreateSchema.parse(body);

    const loan = await LoanService.createLoan(
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Empréstimo registrado com sucesso para ${loan.borrowerName}!`,
      data: loan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar empréstimo." },
      { status: 400 }
    );
  }
}
