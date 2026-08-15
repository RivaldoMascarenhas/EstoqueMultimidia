import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// PUT /api/v1/users/[id] - Atualizar usuário
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, role, active } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (email && email.trim().toLowerCase() !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: "Este e-mail já está em uso por outro usuário." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        email: email ? email.trim().toLowerCase() : existing.email,
        role: role ? (role as Role) : existing.role,
        active: typeof active === "boolean" ? active : existing.active,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Usuário atualizado com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar usuário." },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/users/[id] - Desativar ou Excluir usuário
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loansCreated: true,
            movements: true,
            maintenances: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const hasHistory = 
      user._count.loansCreated > 0 || 
      user._count.movements > 0 || 
      user._count.maintenances > 0;

    if (hasHistory) {
      // Soft delete / desativar para preservar a auditoria
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
        message: "Usuário possui registros vinculados no histórico. Sua conta foi desativada com sucesso.",
        action: "DEACTIVATED",
      });
    }

    // Exclusão definitiva
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Usuário excluído definitivamente com sucesso.",
      action: "DELETED",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao remover usuário." },
      { status: 500 }
    );
  }
}
