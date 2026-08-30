import { NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { requireSession } from "@/lib/api-guard";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const assets = await MaintenanceService.getEligibleAssets();
    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
