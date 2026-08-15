import { NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";

export async function GET() {
  try {
    const metrics = await MaintenanceService.getMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar métricas de manutenção." },
      { status: 500 }
    );
  }
}
