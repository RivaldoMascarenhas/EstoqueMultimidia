import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";

// GET /api/v1/users - Listar todos os usuários com contagens (apenas ADMIN)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            loansCreated: true,
            movements: true,
            maintenances: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const sanitizedUsers = users.map((u) => ({
      ...u,
      avatarUrl: u.avatarUrl
        ? u.avatarUrl.startsWith("data:")
          ? `/api/v1/users/${u.id}/avatar`
          : u.avatarUrl
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar usuários." },
      { status: 500 }
    );
  }
}

// POST /api/v1/users - Cadastrar novo usuário (apenas ADMIN)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const body = await req.json();
    const { name, email, password, role, mustChangePassword } = body;

    if (!name || typeof name !== "string" || !email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: nome, e-mail e senha." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "A senha deve possuir pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validar formato de e-mail básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    // Validar role permitido
    const assignedRole = (role as Role) || Role.OPERADOR;
    if (!Object.values(Role).includes(assignedRole)) {
      return NextResponse.json(
        { success: false, error: "Perfil de usuário (role) inválido." },
        { status: 400 }
      );
    }

    // Verificar e-mail duplicado
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `O e-mail "${cleanEmail}" já está cadastrado no sistema.` },
        { status: 400 }
      );
    }

    // Gerar hash de senha seguro
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
        active: true,
        mustChangePassword: typeof mustChangePassword === "boolean" ? mustChangePassword : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        details: { name: user.name, email: user.email, role: user.role },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: user,
      message: "Usuário cadastrado com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar usuário." },
      { status: 500 }
    );
  }
}
