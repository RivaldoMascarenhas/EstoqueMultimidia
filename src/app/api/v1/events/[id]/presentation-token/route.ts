import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
      return NextResponse.json({ success: false, error: "Apenas administradores e gestores podem visualizar tokens de apresentação." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, slug: true, presentationToken: true },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Evento não encontrado" }, { status: 404 });
    }

    // If no token exists yet, generate one automatically
    let token = event.presentationToken;
    if (!token) {
      token = crypto.randomBytes(32).toString("base64url");
      await prisma.event.update({
        where: { id: eventId },
        data: { presentationToken: token },
      });
    }

    const presentationUrl = `/presentation/${event.id}?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      presentationUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Erro ao buscar token" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
      return NextResponse.json(
        { success: false, error: "Apenas administradores e gestores podem revogar ou regenerar tokens de apresentação" },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente" }, { status: 400 });
    }
    const newToken = crypto.randomBytes(32).toString("base64url");

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { presentationToken: newToken },
    });

    const presentationUrl = `/presentation/${updated.id}?token=${newToken}`;

    return NextResponse.json({
      success: true,
      token: newToken,
      presentationUrl,
      message: "Token de apresentação regenerado com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao regenerar token" }, { status: 400 });
  }
}
