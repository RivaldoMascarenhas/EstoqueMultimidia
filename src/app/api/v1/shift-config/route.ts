import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/services/shift.service";
import { updateShiftConfigsSchema } from "@/schemas/shift.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const configs = await ShiftService.getShiftConfigs();
    const currentShift = await ShiftService.getCurrentShift();

    return NextResponse.json({
      success: true,
      data: {
        configs,
        currentShift,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao obter configurações de turnos." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const body = await req.json();
    const validated = updateShiftConfigsSchema.parse(body);

    const updated = await ShiftService.updateShiftConfigs(
      validated.configs,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Horários dos turnos atualizados com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar horários dos turnos." },
      { status: 400 }
    );
  }
}
