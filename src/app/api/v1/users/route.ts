import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// GET /api/v1/users - Listar todos os usuários com contagens
export async function GET(req: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar usuários." },
      { status: 500 }
    );
  }
}

// POST /api/v1/users - Cadastrar novo usuário
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, mustChangePassword } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: nome, e-mail e senha." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

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
        role: (role as Role) || Role.OPERADOR,
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
