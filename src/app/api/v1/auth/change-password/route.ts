import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordPolicy } from "@/lib/password-policy";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession(undefined, { req, allowPendingPasswordChange: true });
    if (error) return error;

    if (!session.user.mustChangePassword) {
      return NextResponse.json(
        { success: false, error: "Use a alteração de senha do perfil, informando a senha atual." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { newPassword, currentPassword } = body || {};
    if (typeof newPassword !== "string" || newPassword.length > 128 ||
        (currentPassword !== undefined && (typeof currentPassword !== "string" || currentPassword.length > 128))) {
      return NextResponse.json({ success: false, error: "Senha inválida." }, { status: 400 });
    }

    const validation = validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 401 }
      );
    }

    // A dispensa da senha atual vale somente para a troca obrigatória vigente no banco.
    if (!user.mustChangePassword && (!currentPassword || !await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ success: false, error: "Informe a senha atual correta para alterar sua senha." }, { status: 400 });
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
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PASSWORD_CHANGED",
        entity: "User",
        entityId: session.user.id,
        details: { reason: "User self password change" },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Sua senha pessoal foi alterada com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
