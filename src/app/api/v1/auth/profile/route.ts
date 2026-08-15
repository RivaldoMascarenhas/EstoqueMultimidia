import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/v1/auth/profile - Obter dados completos do usuário logado
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loansCreated: true,
            loansReceived: true,
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

    // Se tiver avatar, retornar a URL pública correspondente
    const publicAvatarUrl = user.avatarUrl
      ? user.avatarUrl.startsWith("data:")
        ? `/api/v1/users/${user.id}/avatar?v=${user.updatedAt.getTime()}`
        : user.avatarUrl
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        avatarUrl: publicAvatarUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao carregar perfil." },
      { status: 500 }
    );
  }
}

// PUT /api/v1/auth/profile - Atualizar dados do próprio usuário (nome, avatar, senha)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, avatarUrl, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Processar foto de perfil (Armazenamento direto no banco de dados sem dependência de disco/EROFS)
    if (avatarUrl !== undefined) {
      if (avatarUrl && avatarUrl.startsWith("data:image")) {
        updateData.avatarUrl = avatarUrl;
      } else if (avatarUrl === null || avatarUrl === "") {
        updateData.avatarUrl = null;
      } else {
        updateData.avatarUrl = avatarUrl;
      }
    }

    // Se estiver alterando a senha
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Informe a senha atual para definir uma nova senha." },
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

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "A nova senha deve possuir no mínimo 6 caracteres." },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      updateData.mustChangePassword = false;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        active: true,
        updatedAt: true,
      },
    });

    const publicAvatarUrl = updatedUser.avatarUrl
      ? updatedUser.avatarUrl.startsWith("data:")
        ? `/api/v1/users/${updatedUser.id}/avatar?v=${Date.now()}`
        : updatedUser.avatarUrl
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        avatarUrl: publicAvatarUrl,
      },
      message: "Perfil atualizado com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar perfil." },
      { status: 500 }
    );
  }
}
