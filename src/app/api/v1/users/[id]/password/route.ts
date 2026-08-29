import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";
import { validatePasswordPolicy } from "@/lib/password-policy";

// PATCH /api/v1/users/[id]/password - Redefinir senha de acesso
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession(undefined, { allowPendingPasswordChange: true });
    if (error) return error;

    

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Apenas ADMIN ou o próprio usuário autenticado podem alterar a senha
    const isAdmin = session.user.role === Role.ADMIN;
    const isSelf = session.user.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: "Permissão insuficiente para alterar a senha deste usuário." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, mustChangePassword } = body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Se for o próprio usuário (e não um administrador redefinindo), exigir a senha atual se não for primeiro acesso obrigatório
    if (!isAdmin && !user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Informe sua senha atual para continuar." },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, error: "A senha atual informada está incorreta." },
          { status: 400 }
        );
      }
    }

    const validation = validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Verificar se a nova senha é igual à senha anterior
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: "A nova senha não pode ser igual à senha anterior. Por favor, escolha uma senha diferente." 
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { 
        passwordHash,
        mustChangePassword: typeof mustChangePassword === "boolean" ? mustChangePassword : false,
      },
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: id,
        details: {
          resetByUserId: session.user.id,
          resetByUserRole: session.user.role,
          targetEmail: user.email,
          selfReset: session.user.id === id,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Senha do usuário ${user.name} redefinida com sucesso!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao redefinir senha." },
      { status: 500 }
    );
  }
}
