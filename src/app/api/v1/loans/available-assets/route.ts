import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";

export async function GET(req: NextRequest) {
  try {
    const assets = await LoanService.getAvailableAssets();
    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar ativos disponíveis." },
      { status: 500 }
    );
  }
}
