import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { AssetService } from "@/services/asset.service";
import { assetStatusUpdateSchema } from "@/schemas/asset.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await requireSession();
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do equipamento obrigatório." },
        { status: 400 }
      );
    }

    const asset = await AssetService.getAssetByIdOrTag(id);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Equipamento não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: asset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do equipamento obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = assetStatusUpdateSchema.parse(body);

    const asset = await AssetService.updateAssetStatus(
      id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Status do equipamento #${asset.assetTag} atualizado para ${asset.status}.`,
      data: asset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao atualizar status do equipamento.") },
      { status: 400 }
    );
  }
}
