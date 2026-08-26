import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { prizes: true } },
      },
    });
    return NextResponse.json({ success: true, sponsors });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar patrocinadores." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, logoUrl, description, website, instagram, phone, email, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome do patrocinador é obrigatório." },
        { status: 400 }
      );
    }

    const sponsor = await prisma.sponsor.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl || null,
        description: description || null,
        website: website || null,
        instagram: instagram || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await safeAuditLog({
      userId: session?.user?.id,
      action: "CREATE_SPONSOR",
      entity: "Sponsor",
      entityId: sponsor.id,
      details: { name: sponsor.name },
      ipAddress,
    });

    return NextResponse.json({ success: true, sponsor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar patrocinador." },
      { status: 400 }
    );
  }
}
