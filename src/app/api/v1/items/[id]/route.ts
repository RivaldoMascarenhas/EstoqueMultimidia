import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { itemUpdateSchema } from "@/schemas/inventory.schema";
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
        { success: false, error: "Identificador do item obrigatório." },
        { status: 400 }
      );
    }

    const item = await InventoryService.getItemById(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do item obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = itemUpdateSchema.parse(body);

    const updated = await InventoryService.updateItem(id, validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Item '${updated.name}' atualizado com sucesso!`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao atualizar item do catálogo.") },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do item obrigatório." },
        { status: 400 }
      );
    }

    const deleted = await InventoryService.deleteItem(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Item '${deleted.name}' desativado com sucesso!`,
      data: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao excluir item." },
      { status: 400 }
    );
  }
}
