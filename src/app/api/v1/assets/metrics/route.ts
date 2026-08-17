import { NextResponse } from "next/server";
import { AssetService } from "@/services/asset.service";
import { requireSession } from "@/lib/api-guard";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

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
