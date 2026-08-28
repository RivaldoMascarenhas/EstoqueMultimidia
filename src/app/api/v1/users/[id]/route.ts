import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";

// PUT /api/v1/users/[id] - Atualizar usuário (apenas ADMIN)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

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
      const cleanEmail = email.trim().toLowerCase();
      const emailTaken = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: "Este e-mail já está em uso por outro usuário." },
          { status: 400 }
        );
      }
    }

    if (role && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { success: false, error: "Perfil de usuário (role) inválido." },
        { status: 400 }
      );
    }

    // Trava de segurança: impedir desativação ou rebaixamento do último administrador ativo
    if (existing.role === Role.ADMIN && (active === false || (role && role !== Role.ADMIN))) {
      const adminCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          active: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Não é permitido desativar ou rebaixar o único administrador ativo do sistema.",
          },
          { status: 409 }
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

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_UPDATED",
        entity: "User",
        entityId: id,
        details: {
          updatedFields: Object.keys(body),
          name: updated.name,
          email: updated.email,
          role: updated.role,
          active: updated.active,
        },
      },
    }).catch(() => {});

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

// DELETE /api/v1/users/[id] - Desativar ou Excluir usuário (apenas ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Impedir auto-exclusão
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: "Você não pode excluir ou desativar sua própria conta de administrador." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loansCreated: true,
            loansReceived: true,
            movements: true,
            maintenances: true,
            maintenancesClosed: true,
            requestsCreated: true,
            requestsAssigned: true,
            tasksCompleted: true,
            auditLogs: true,
            apiKeys: true,
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

    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          active: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Não é possível desativar ou excluir o único administrador ativo do sistema.",
          },
          { status: 409 }
        );
      }
    }

    const hasHistory = 
      user._count.loansCreated > 0 || 
      user._count.loansReceived > 0 ||
      user._count.movements > 0 || 
      user._count.maintenances > 0 ||
      user._count.maintenancesClosed > 0 ||
      user._count.requestsCreated > 0 ||
      user._count.requestsAssigned > 0 ||
      user._count.tasksCompleted > 0 ||
      user._count.auditLogs > 0 ||
      user._count.apiKeys > 0;

    if (hasHistory) {
      // Soft delete / desativar para preservar a auditoria
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "USER_DEACTIVATED",
          entity: "User",
          entityId: id,
          details: { name: user.name, email: user.email, reason: "Possui registros vinculados no histórico" },
        },
      }).catch(() => {});

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

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_DELETED",
        entity: "User",
        entityId: id,
        details: { name: user.name, email: user.email },
      },
    }).catch(() => {});

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
