import { NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";

export async function GET() {
  try {
    const assets = await MaintenanceService.getEligibleAssets();
    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar equipamentos elegíveis." },
      { status: 500 }
    );
  }
}
