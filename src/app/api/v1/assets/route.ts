import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AssetService } from "@/services/asset.service";
import { assetCreateSchema } from "@/schemas/asset.schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const boxId = searchParams.get("boxId") || undefined;

    const assets = await AssetService.getAssets({
      search,
      status,
      categoryId,
      boxId,
    });

    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar patrimônio." },
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
        { success: false, error: "Apenas ADMIN ou GESTOR podem cadastrar novos equipamentos patrimoniais." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = assetCreateSchema.parse(body);

    const asset = await AssetService.createAsset(validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Equipamento patrimônio #${asset.assetTag} cadastrado com sucesso!`,
      data: asset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar patrimônio." },
      { status: 400 }
    );
  }
}
