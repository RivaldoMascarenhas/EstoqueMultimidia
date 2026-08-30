import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { itemCreateSchema } from "@/schemas/inventory.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const boxId = searchParams.get("boxId") || undefined;
    const statusFilter = (searchParams.get("status") as any) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await InventoryService.getItems({
      search,
      categoryId,
      boxId,
      statusFilter,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao consultar catálogo de itens." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

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
