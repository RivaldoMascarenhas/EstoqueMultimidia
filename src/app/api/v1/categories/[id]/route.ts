import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/v1/categories/[id] - Atualizar Categoria
export async function PUT(
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

    const { id } = params;
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    const slug = body.slug?.trim()
      ? body.slug.trim().toLowerCase()
      : body.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: body.name.trim(),
        slug: slug || `cat-${Date.now()}`,
        description: body.description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Categoria '${updatedCategory.name}' atualizada com sucesso!`,
      data: updatedCategory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar categoria." },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/categories/[id] - Excluir / Desativar Categoria
export async function DELETE(
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

    const { id } = params;

    // Verificar se existem itens vinculados
    const itemsCount = await prisma.item.count({
      where: { categoryId: id },
    });

    if (itemsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Não é possível excluir esta categoria pois ela possui ${itemsCount} item(ns) vinculado(s) no catálogo.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Categoria excluída com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao excluir categoria." },
      { status: 500 }
    );
  }
}
