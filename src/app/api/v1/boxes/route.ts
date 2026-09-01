import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { CabinetService } from "@/services/cabinet.service";
import { boxCreateSchema } from "@/schemas/cabinet.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR, Role.CONSULTA]);
    if (error) return error;

    const boxes = await CabinetService.getAllBoxes();
    return NextResponse.json({
      success: true,
      data: boxes,
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
    const validatedData = boxCreateSchema.parse(body);

    const box = await CabinetService.createBox(validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Caixa '${box.code}' cadastrada com sucesso na porta ${box.door.name}!`,
      data: box,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao cadastrar caixa.") },
      { status: 400 }
    );
  }
}
