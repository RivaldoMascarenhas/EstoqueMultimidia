import { NextRequest, NextResponse } from "next/server";
import { AssetService } from "@/services/asset.service";
import { assetBatchCreateSchema } from "@/schemas/asset.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const body = await req.json();
    const validatedData = assetBatchCreateSchema.parse(body);

    const result = await AssetService.createBatchAssets(
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: `✓ ${result.count} equipamentos cadastrados com sucesso (de ${result.firstTag} a ${result.lastTag})!`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar equipamentos em lote." },
      { status: 400 }
    );
  }
}
