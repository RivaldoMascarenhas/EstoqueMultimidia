import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AssetService } from "@/services/asset.service";
import { assetStatusUpdateSchema } from "@/schemas/asset.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await AssetService.getAssetByIdOrTag(params.id);

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
      { success: false, error: error.message || "Erro ao consultar equipamento." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    if (session.user.role === "CONSULTA") {
      return NextResponse.json(
        { success: false, error: "Perfil de consulta não pode alterar status de equipamentos." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = assetStatusUpdateSchema.parse(body);

    const asset = await AssetService.updateAssetStatus(
      params.id,
      validatedData,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Status do equipamento #${asset.assetTag} atualizado para ${asset.status}.`,
      data: asset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar status do equipamento." },
      { status: 400 }
    );
  }
}
