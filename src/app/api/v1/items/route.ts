import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { itemCreateSchema } from "@/schemas/inventory.schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const boxId = searchParams.get("boxId") || undefined;
    const statusFilter = (searchParams.get("status") as any) || undefined;

    const items = await InventoryService.getItems({
      search,
      categoryId,
      boxId,
      statusFilter,
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar catálogo de itens." },
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
        { success: false, error: "Apenas ADMIN ou GESTOR podem cadastrar novos itens." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = itemCreateSchema.parse(body);

    const item = await InventoryService.createItem(validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Item '${item.name}' cadastrado com sucesso!`,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar novo item." },
      { status: 400 }
    );
  }
}
