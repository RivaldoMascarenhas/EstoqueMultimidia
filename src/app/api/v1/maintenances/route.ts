import { NextRequest, NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCreateSchema } from "@/schemas/maintenance.schema";
import { requireSession } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const priority = searchParams.get("priority") || undefined;
    const maintenanceType = searchParams.get("maintenanceType") || undefined;
    const assetId = searchParams.get("assetId") || undefined;

    const maintenances = await MaintenanceService.getMaintenances({
      search,
      status,
      priority,
      maintenanceType,
      assetId,
    });

    return NextResponse.json({
      success: true,
      data: maintenances,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar ordens de serviço." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const validatedData = maintenanceCreateSchema.parse(body);

    const maintenance = await MaintenanceService.createMaintenance(
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Ordem de Serviço ${maintenance.orderNumber} aberta com sucesso!`,
      data: maintenance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao abrir ordem de serviço." },
      { status: 400 }
    );
  }
}
