import { NextRequest, NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCancelSchema } from "@/schemas/maintenance.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da ordem de serviço obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = maintenanceCancelSchema.parse(body);

    const cancelled = await MaintenanceService.cancelMaintenance(
      id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço cancelada com sucesso.",
      data: cancelled,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cancelar ordem de serviço." },
      { status: 400 }
    );
  }
}
