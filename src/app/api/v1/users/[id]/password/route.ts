import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PATCH /api/v1/users/[id]/password - Redefinir senha de acesso
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { newPassword, mustChangePassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "A nova senha deve possuir pelo menos 6 caracteres." },
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

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { 
        passwordHash,
        mustChangePassword: typeof mustChangePassword === "boolean" ? mustChangePassword : true,
      },
    });

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
