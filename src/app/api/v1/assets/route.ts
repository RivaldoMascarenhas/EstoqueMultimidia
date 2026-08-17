import { NextRequest, NextResponse } from "next/server";
import { AssetService } from "@/services/asset.service";
import { assetCreateSchema } from "@/schemas/asset.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

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
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

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
