import { NextRequest, NextResponse } from "next/server";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCompleteSchema } from "@/schemas/maintenance.schema";
import { requireSession } from "@/lib/api-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da ordem de serviço obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = maintenanceCompleteSchema.parse(body);

    const completed = await MaintenanceService.completeMaintenance(
      id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Ordem de Serviço ${completed.orderNumber || ""} concluída com sucesso!`,
      data: completed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao concluir ordem de serviço." },
      { status: 400 }
    );
  }
}
