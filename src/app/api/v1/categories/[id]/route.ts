import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

// PUT /api/v1/categories/[id] - Atualizar Categoria
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da categoria é obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/categories/[id] - Excluir / Desativar Categoria
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da categoria é obrigatório." },
        { status: 400 }
      );
    }

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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
