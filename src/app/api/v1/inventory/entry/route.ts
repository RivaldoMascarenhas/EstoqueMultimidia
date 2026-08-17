import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { stockEntrySchema } from "@/schemas/inventory.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

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
