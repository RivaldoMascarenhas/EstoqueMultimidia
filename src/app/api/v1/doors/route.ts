import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CabinetService } from "@/services/cabinet.service";
import { doorCreateSchema } from "@/schemas/cabinet.schema";

export async function GET() {
  try {
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "GESTOR") {
      return NextResponse.json(
        { success: false, error: "Apenas ADMIN ou GESTOR podem criar portas." },
        { status: 403 }
      );
    }

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
