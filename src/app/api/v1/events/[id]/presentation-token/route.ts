import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente" }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENTATION_MANAGE,
    });
    if (!access.authorized) return access.errorResponse!;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, slug: true, presentationToken: true },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Evento não encontrado" }, { status: 404 });
    }

    // If no token exists yet, generate one automatically with cryptographic security
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
    console.error("Erro ao buscar token de apresentação:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar token de apresentação." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente" }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENTATION_MANAGE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

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
    console.error("Erro ao regenerar token de apresentação:", error);
    return NextResponse.json({ success: false, error: "Erro ao regenerar token de apresentação." }, { status: 400 });
  }
}
