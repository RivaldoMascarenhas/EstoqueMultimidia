import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCancelSchema } from "@/schemas/maintenance.schema";

export async function POST(
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
    const validatedData = maintenanceCancelSchema.parse(body);

    const cancelled = await MaintenanceService.cancelMaintenance(
      params.id,
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
