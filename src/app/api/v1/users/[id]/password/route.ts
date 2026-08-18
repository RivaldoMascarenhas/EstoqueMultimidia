import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";
import { validatePasswordPolicy } from "@/lib/password-policy";

// PATCH /api/v1/users/[id]/password - Redefinir senha de acesso
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Apenas ADMIN ou o próprio usuário autenticado podem alterar a senha
    if (session.user.role !== Role.ADMIN && session.user.id !== id) {
      return NextResponse.json(
        { success: false, error: "Permissão insuficiente para alterar a senha deste usuário." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { newPassword, mustChangePassword } = body;

    const validation = validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
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
