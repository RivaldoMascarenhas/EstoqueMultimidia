import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";

export async function GET() {
  try {
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.name.trim()) {
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
