import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { loanCreateSchema } from "@/schemas/loan.schema";
import { requireSession } from "@/lib/api-guard";

import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.OPERADOR, Role.GESTOR]);
    if (error) return error;

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
