import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const categories = await InventoryService.getCategories();
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar categorias." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    const category = await InventoryService.createCategory(
      body.name.trim(),
      body.description
    );

    return NextResponse.json({
      success: true,
      message: `Categoria '${category.name}' criada com sucesso!`,
      data: category,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar categoria." },
      { status: 500 }
    );
  }
}
