import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: params.id },
      include: {
        prizes: {
          include: { event: { select: { id: true, name: true } } },
        },
      },
    });

    if (!sponsor) {
      return NextResponse.json(
        { success: false, error: "Patrocinador não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, sponsor });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar patrocinador." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, logoUrl, description, website, instagram, phone, email, notes } = body;

    const sponsor = await prisma.sponsor.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        website: website !== undefined ? (website || null) : undefined,
        instagram: instagram !== undefined ? (instagram || null) : undefined,
        phone: phone !== undefined ? (phone || null) : undefined,
        email: email !== undefined ? (email || null) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
      },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await safeAuditLog({
      userId: session?.user?.id,
      action: "UPDATE_SPONSOR",
      entity: "Sponsor",
      entityId: sponsor.id,
      details: { name: sponsor.name },
      ipAddress,
    });

    return NextResponse.json({ success: true, sponsor });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar patrocinador." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
  ]);
  if (error) return error;

  try {
    const sponsor = await prisma.sponsor.delete({
      where: { id: params.id },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    await safeAuditLog({
      userId: session?.user?.id,
      action: "DELETE_SPONSOR",
      entity: "Sponsor",
      entityId: params.id,
      details: { name: sponsor.name },
      ipAddress,
    });

    return NextResponse.json({ success: true, message: "Patrocinador excluído com sucesso." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir patrocinador." },
      { status: 400 }
    );
  }
}
