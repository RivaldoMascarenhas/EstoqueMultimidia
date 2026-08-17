import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { stockTransferSchema } from "@/schemas/inventory.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const body = await req.json();
    const validatedData = stockTransferSchema.parse(body);

    const movement = await InventoryService.registerTransfer(
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Transferência de ${validatedData.quantity} unidade(s) concluída com sucesso!`,
      data: movement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar transferência entre caixas." },
      { status: 400 }
    );
  }
}
