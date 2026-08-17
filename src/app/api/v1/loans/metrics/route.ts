import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { requireSession } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

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
