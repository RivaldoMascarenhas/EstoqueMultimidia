import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { stockExitSchema } from "@/schemas/inventory.schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    // Role check: CONSULTA cannot register exits
    if (session.user.role === "CONSULTA") {
      return NextResponse.json(
        { success: false, error: "Seu perfil de acesso (CONSULTA) não tem permissão para registrar saídas/baixas." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = stockExitSchema.parse(body);

    const movement = await InventoryService.registerExit(
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Baixa de ${validatedData.quantity} unidade(s) registrada com sucesso!`,
      data: movement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar saída de estoque." },
      { status: 400 }
    );
  }
}
