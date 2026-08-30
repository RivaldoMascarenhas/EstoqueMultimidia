import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

// PATCH /api/v1/api-keys/[id] - Ativar/Desativar ou revogar chave de API
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da chave de API é obrigatório." },
        { status: 400 }
      );
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Chave de API não encontrada." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const active = typeof body.active === "boolean" ? body.active : !apiKey.active;

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        role: true,
        active: true,
        expiresAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: active ? "API_KEY_ACTIVATED" : "API_KEY_REVOKED",
        entity: "ApiKey",
        entityId: id,
        details: { name: apiKey.name, active },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Chave de API '${apiKey.name}' foi ${active ? "ativada" : "revogada/desativada"} com sucesso.`,
      data: updatedKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao atualizar chave de API." },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/api-keys/[id] - Excluir definitivamente chave de API
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da chave de API é obrigatório." },
        { status: 400 }
      );
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Chave de API não encontrada." },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "API_KEY_DELETED",
        entity: "ApiKey",
        entityId: id,
        details: { name: apiKey.name, keyPrefix: apiKey.keyPrefix },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Chave de API '${apiKey.name}' excluída com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao excluir chave de API." },
      { status: 500 }
    );
  }
}
