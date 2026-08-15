import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";

export async function GET(req: NextRequest) {
  try {
    const metrics = await LoanService.getLoanMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter métricas de empréstimos." },
      { status: 500 }
    );
  }
}
