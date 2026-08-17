import { NextRequest, NextResponse } from "next/server";
import { CabinetService } from "@/services/cabinet.service";
import { doorCreateSchema } from "@/schemas/cabinet.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const doors = await CabinetService.getDoorsWithBoxes();
    return NextResponse.json({
      success: true,
      data: doors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar portas do armário." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();
    const validatedData = doorCreateSchema.parse(body);

    const door = await CabinetService.createDoor(validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Porta '${door.name}' cadastrada com sucesso!`,
      data: door,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar porta." },
      { status: 400 }
    );
  }
}
