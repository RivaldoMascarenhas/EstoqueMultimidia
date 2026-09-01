import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCreateSchema } from "@/schemas/maintenance.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const priority = searchParams.get("priority") || undefined;
    const maintenanceType = searchParams.get("maintenanceType") || undefined;
    const assetId = searchParams.get("assetId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await MaintenanceService.getMaintenances({
      search,
      status,
      priority,
      maintenanceType,
      assetId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
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
      { success: false, error: formatZodError(error, "Erro ao abrir ordem de serviço.") },
      { status: 400 }
    );
  }
}
