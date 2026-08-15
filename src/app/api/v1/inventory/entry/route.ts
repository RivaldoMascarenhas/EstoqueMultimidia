import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { stockEntrySchema } from "@/schemas/inventory.schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    if (session.user.role === "CONSULTA") {
      return NextResponse.json(
        { success: false, error: "Perfil de consulta não possui permissão para registrar entradas." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = stockEntrySchema.parse(body);

    const movement = await InventoryService.registerEntry(
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Entrada de ${validatedData.quantity} unidade(s) registrada com sucesso!`,
      data: movement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar entrada de estoque." },
      { status: 400 }
    );
  }
}
