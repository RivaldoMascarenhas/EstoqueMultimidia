import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const devices = await prisma.device.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { presences: true },
        },
      },
    });

    return NextResponse.json({ success: true, devices });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao listar dispositivos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await req.json();
    const { identifier, name, location, notes } = body;

    if (!identifier || !name) {
      return NextResponse.json(
        { success: false, error: "Identificador e nome são obrigatórios." },
        { status: 400 }
      );
    }

    const device = await prisma.device.upsert({
      where: { identifier },
      update: {
        name,
        location: location || null,
        notes: notes || null,
        active: true,
      },
      create: {
        identifier,
        name,
        location: location || null,
        notes: notes || null,
        status: "ACTIVE",
        active: true,
      },
    });

    return NextResponse.json({ success: true, device }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao salvar dispositivo." },
      { status: 400 }
    );
  }
}
