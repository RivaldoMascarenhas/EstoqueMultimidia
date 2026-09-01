import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";

// PUT /api/v1/users/[id] - Atualizar usuário (apenas ADMIN)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

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

    if (email && email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailInUse) {
        return NextResponse.json(
          { success: false, error: "Este endereço de e-mail já está sendo utilizado por outro usuário." },
          { status: 409 }
        );
      }
    }

    if (role && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { success: false, error: "Perfil de usuário (role) inválido." },
        { status: 400 }
      );
    }

    // Execução Atômica via Transação com Proteção Concorrente contra TOCTOU
    const updated = await prisma.$transaction(async (tx) => {
      // Trava de segurança: impedir desativação ou rebaixamento do último administrador ativo
      if (existing.role === Role.ADMIN && (active === false || (role && role !== Role.ADMIN))) {
        const adminCount = await tx.user.count({
          where: {
            role: Role.ADMIN,
            active: true,
          },
        });

        if (adminCount <= 1) {
          throw new Error("LAST_ADMIN_PROTECTION");
        }
      }

      const up = await tx.user.update({
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

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "USER_UPDATED",
          entity: "User",
          entityId: id,
          details: {
            updatedFields: Object.keys(body),
            name: up.name,
            email: up.email,
            role: up.role,
            active: up.active,
          },
        },
      });

      return up;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Usuário atualizado com sucesso!",
    });
  } catch (error: any) {
    if (error.message === "LAST_ADMIN_PROTECTION") {
      return NextResponse.json(
        {
          success: false,
          error: "Não é permitido desativar ou rebaixar o único administrador ativo do sistema.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao atualizar usuário." },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/users/[id] - Desativar ou Excluir usuário (apenas ADMIN)
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

    // Execução Atômica via Transação
    const result = await prisma.$transaction(async (tx) => {
      if (user.role === Role.ADMIN) {
        const adminCount = await tx.user.count({
          where: {
            role: Role.ADMIN,
            active: true,
          },
        });

        if (adminCount <= 1) {
          throw new Error("LAST_ADMIN_PROTECTION");
        }
      }

      if (hasHistory) {
        // Soft delete / desativar para preservar a auditoria
        await tx.user.update({
          where: { id },
          data: { active: false },
        });

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "USER_DEACTIVATED",
            entity: "User",
            entityId: id,
            details: { name: user.name, email: user.email, reason: "Possui registros vinculados no histórico" },
          },
        });

        return {
          action: "DEACTIVATED",
          message: "Usuário possui registros vinculados no histórico. Sua conta foi desativada com sucesso.",
        };
      }

      // Exclusão definitiva
      await tx.user.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "USER_DELETED",
          entity: "User",
          entityId: id,
          details: { name: user.name, email: user.email },
        },
      });

      return {
        action: "DELETED",
        message: "Usuário excluído definitivamente com sucesso.",
      };
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      action: result.action,
    });
  } catch (error: any) {
    if (error.message === "LAST_ADMIN_PROTECTION") {
      return NextResponse.json(
        {
          success: false,
          error: "Não é possível desativar ou excluir o único administrador ativo do sistema.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao excluir usuário." },
      { status: 500 }
    );
  }
}
