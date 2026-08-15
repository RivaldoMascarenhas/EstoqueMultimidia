import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance.service";
import { maintenanceCompleteSchema } from "@/schemas/maintenance.schema";

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
    const validatedData = maintenanceCompleteSchema.parse(body);

    const completed = await MaintenanceService.completeMaintenance(
      params.id,
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
