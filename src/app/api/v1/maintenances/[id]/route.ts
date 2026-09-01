import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceUpdateSchema } from "@/schemas/maintenance.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await requireSession();
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da ordem de serviço obrigatório." },
        { status: 400 }
      );
    }

    const maintenance = await MaintenanceService.getMaintenanceById(id);
    return NextResponse.json({
      success: true,
      data: maintenance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao buscar ordem de serviço.") },
      { status: 404 }
    );
  }
}

export async function PATCH(
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
    const validatedData = maintenanceUpdateSchema.parse(body);

    const updated = await MaintenanceService.updateMaintenance(
      id,
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
      { success: false, error: formatZodError(error, "Erro ao atualizar ordem de serviço.") },
      { status: 400 }
    );
  }
}
