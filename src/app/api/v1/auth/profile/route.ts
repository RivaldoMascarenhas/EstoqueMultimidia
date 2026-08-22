import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordPolicy } from "@/lib/password-policy";

// GET /api/v1/auth/profile - Obter dados completos do usuário logado
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const searchConditions: any[] = [];
    if (session.user.id) searchConditions.push({ id: session.user.id });
    if (session.user.email) searchConditions.push({ email: session.user.email.toLowerCase().trim() });

    if (searchConditions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sessão inválida." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: searchConditions,
      },
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
        { success: false, error: "Usuário não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    // Se tiver avatar, retornar a URL pública correspondente
    const timestamp = user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now();
    const publicAvatarUrl = user.avatarUrl
      ? user.avatarUrl.startsWith("data:")
        ? `/api/v1/users/${user.id}/avatar?v=${timestamp}`
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

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const searchConditions: any[] = [];
    if (session.user.id) searchConditions.push({ id: session.user.id });
    if (session.user.email) searchConditions.push({ email: session.user.email.toLowerCase().trim() });

    const user = await prisma.user.findFirst({
      where: {
        OR: searchConditions,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, avatarUrl, currentPassword, newPassword } = body;

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Processar foto de perfil (Armazenamento direto no banco de dados com limite de 500KB)
    if (avatarUrl !== undefined) {
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image")) {
        // Validação de tipo de imagem suportado (PNG, JPEG, WebP)
        const mimeMatch = avatarUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
        if (!mimeMatch) {
          return NextResponse.json(
            { success: false, error: "Formato de imagem não suportado. Utilize PNG, JPEG ou WebP." },
            { status: 400 }
          );
        }

        // Validação de tamanho máximo (500KB ~ aprox. 700.000 caracteres base64)
        if (avatarUrl.length > 750000) {
          return NextResponse.json(
            { success: false, error: "A imagem de avatar excede o limite máximo permitido de 500 KB." },
            { status: 400 }
          );
        }

        updateData.avatarUrl = avatarUrl;
      } else if (avatarUrl === null || avatarUrl === "") {
        updateData.avatarUrl = null;
      } else if (typeof avatarUrl === "string" && avatarUrl.startsWith("/uploads/")) {
        // Apenas caminhos de uploads locais estáticos permitidos
        updateData.avatarUrl = avatarUrl;
      }
      // NOTA: Se for a rota da API (/api/v1/users/...), não altera o campo no banco para preservar a foto existente.
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

      const passwordCheck = validatePasswordPolicy(newPassword);
      if (!passwordCheck.isValid) {
        return NextResponse.json(
          { success: false, error: passwordCheck.error || "A nova senha não atende aos requisitos de segurança institucional." },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      updateData.mustChangePassword = false;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
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

    const timestamp = updatedUser.updatedAt ? new Date(updatedUser.updatedAt).getTime() : Date.now();
    const publicAvatarUrl = updatedUser.avatarUrl
      ? updatedUser.avatarUrl.startsWith("data:")
        ? `/api/v1/users/${updatedUser.id}/avatar?v=${timestamp}`
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
