import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceUpdateSchema } from "@/schemas/maintenance.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const maintenance = await MaintenanceService.getMaintenanceById(params.id);
    return NextResponse.json({
      success: true,
      data: maintenance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar ordem de serviço." },
      { status: 404 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = maintenanceUpdateSchema.parse(body);

    const updated = await MaintenanceService.updateMaintenance(
      params.id,
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço atualizada com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar ordem de serviço." },
      { status: 400 }
    );
  }
}
