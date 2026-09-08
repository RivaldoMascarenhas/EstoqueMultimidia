import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().max(750000).nullable().optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().max(128).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession(undefined, { allowPendingPasswordChange: true });
    if (error) return error;

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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/v1/auth/profile - Atualizar dados do próprio usuário (nome, avatar, senha)
export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireSession(undefined, { req });
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados de perfil inválidos." }, { status: 400 });
    }
    const { name, avatarUrl, currentPassword, newPassword } = parsed.data;

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
      } else if (typeof avatarUrl === "string" && avatarUrl.startsWith("/api/v1/users/")) {
        // Preserva o avatar existente sem alteração
      } else {
        return NextResponse.json(
          { success: false, error: "Formato de imagem de avatar inválido." },
          { status: 400 }
        );
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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
