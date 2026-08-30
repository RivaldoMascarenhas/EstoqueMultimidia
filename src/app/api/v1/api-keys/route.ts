import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import crypto from "crypto";

// GET /api/v1/api-keys - Listar chaves de API cadastradas (sem expor o token puro)
export async function GET() {
  try {
    const { error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        role: true,
        active: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao listar chaves de API." },
      { status: 500 }
    );
  }
}

// POST /api/v1/api-keys - Gerar nova chave de API com alta entropia e hash SHA-256
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const body = await req.json();
    const { name, role, permissions, expiresAt } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome descritivo da chave de API é obrigatório." },
        { status: 400 }
      );
    }

    const assignedRole = (role as Role) || Role.OPERADOR;
    if (!Object.values(Role).includes(assignedRole)) {
      return NextResponse.json(
        { success: false, error: "Perfil de permissão (role) inválido." },
        { status: 400 }
      );
    }

    // Regra de segurança institucional: Chaves de API externas NUNCA podem ter papel ADMIN global
    if (assignedRole === Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: "Chaves de API não podem possuir o perfil ADMIN por motivos de segurança e princípio do menor privilégio.",
        },
        { status: 403 }
      );
    }

    // Escopos de permissão padrão por perfil
    const defaultPermissionsByRole: Record<string, string[]> = {
      OPERADOR: ["inventory:read", "loan:create", "loan:return", "maintenance:create", "webhook:test"],
      GESTOR: ["inventory:read", "loan:create", "loan:return", "maintenance:create", "webhook:test"],
      CONSULTA: ["inventory:read"],
      ACADEMIC_SUPPORT: ["inventory:read"],
    };

    const assignedPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions.filter((p) => typeof p === "string")
      : defaultPermissionsByRole[assignedRole] || ["inventory:read"];

    // 1. Gerar token aleatório de alta entropia com prefixo institucional
    const randomHex = crypto.randomBytes(24).toString("hex");
    const rawToken = `unifap_live_${randomHex}`;

    // 2. Extrair prefixo para identificação visual segura
    const keyPrefix = `${rawToken.slice(0, 16)}...`;

    // 3. Gerar hash SHA-256 do token para armazenamento seguro
    const keyHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json(
          { success: false, error: "Data de expiração inválida." },
          { status: 400 }
        );
      }
    }

    // 4. Salvar no banco de dados
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        role: assignedRole,
        permissions: assignedPermissions,
        userId: session.user.id,
        expiresAt: parsedExpiresAt,
        active: true,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        role: true,
        permissions: true,
        active: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // 5. Trilha de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "API_KEY_CREATED",
        entity: "ApiKey",
        entityId: apiKey.id,
        details: {
          name: apiKey.name,
          role: apiKey.role,
          keyPrefix: apiKey.keyPrefix,
          expiresAt: apiKey.expiresAt,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Chave de API gerada com sucesso! Copie o token agora; por segurança, ele não poderá ser visualizado novamente.",
      data: {
        ...apiKey,
        token: rawToken, // Exibido apenas nesta resposta
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao criar chave de API." },
      { status: 500 }
    );
  }
}
