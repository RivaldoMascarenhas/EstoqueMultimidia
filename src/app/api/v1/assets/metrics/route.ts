import { NextResponse } from "next/server";
import { AssetService } from "@/services/asset.service";

export async function GET() {
  try {
    const metrics = await AssetService.getAssetMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar métricas de patrimônio." },
      { status: 500 }
    );
  }
}
