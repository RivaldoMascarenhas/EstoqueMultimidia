import { NextRequest, NextResponse } from "next/server";
import { CabinetService } from "@/services/cabinet.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { error } = await requireSession();
    if (error) return error;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Código da caixa não fornecido." },
        { status: 400 }
      );
    }

    const box = await CabinetService.getBoxByCode(code);

    if (!box) {
      return NextResponse.json(
        { success: false, error: `Caixa com código '${code}' não encontrada.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: box,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ], { req });
    if (error) return error;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Código da caixa não fornecido." },
        { status: 400 }
      );
    }

    const deleted = await CabinetService.deleteBox(code, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Caixa '${deleted.code}' excluída com sucesso!`,
      data: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao excluir caixa." },
      { status: 400 }
    );
  }
}
