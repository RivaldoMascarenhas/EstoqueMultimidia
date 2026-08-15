import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loan = await LoanService.getLoanById(params.id);
    return NextResponse.json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar empréstimo." },
      { status: 404 }
    );
  }
}
