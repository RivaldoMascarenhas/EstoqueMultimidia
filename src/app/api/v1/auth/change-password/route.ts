import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordPolicy } from "@/lib/password-policy";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newPassword } = body;

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
      { success: false, error: error.message || "Erro ao alterar senha." },
      { status: 500 }
    );
  }
}
