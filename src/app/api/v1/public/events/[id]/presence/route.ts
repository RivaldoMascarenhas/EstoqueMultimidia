import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { prisma } from "@/lib/prisma";
import { EventService } from "@/services/event.service";
import { PresenceMethod } from "@prisma/client";
import { safeAuditLog } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const publicPresenceSchema = z.object({
  personId: z.string().min(1, "ID da pessoa é obrigatório"),
  method: z.enum(["FACE", "MANUAL", "QR_CODE"]).default("FACE"),
  confidence: z.number().min(0).max(1).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const { isAuthorized, event, errorResponse } = await requirePresentationToken(req, eventId);
    if (!isAuthorized || errorResponse) return errorResponse;

    const checkinStatus = EventService.isCheckinAllowed(event);
    if (!checkinStatus.isAllowed) {
      return NextResponse.json(
        { success: false, error: checkinStatus.message || "Check-in não liberado para este evento." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = publicPresenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const { personId, method, confidence } = parsed.data;

    // Verificar se pessoa é participante
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_personId: { eventId, personId } },
      include: { person: true },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "Esta pessoa não está inscrita neste evento." },
        { status: 404 }
      );
    }

    // Verificar se já tem presença registrada
    const existing = await prisma.presence.findUnique({
      where: { eventId_personId: { eventId, personId } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        message: "Presença já confirmada anteriormente.",
        person: {
          id: participant.person.id,
          name: participant.person.name,
          category: participant.person.category,
        },
      });
    }

    const presence = await prisma.presence.create({
      data: {
        eventId,
        personId,
        method: method === "FACE" ? PresenceMethod.FACE : method === "QR_CODE" ? PresenceMethod.QR_CODE : PresenceMethod.MANUAL,
        confidence: confidence !== undefined ? confidence : 1.0,
        status: "REGISTERED",
      },
    });

    await safeAuditLog({
      action: "PRESENCE_REGISTERED_PUBLIC_TOTEM",
      entity: "Presence",
      entityId: presence.id,
      details: { eventId, personId, personName: participant.person.name, method },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      alreadyRegistered: false,
      message: "Presença confirmada com sucesso!",
      person: {
        id: participant.person.id,
        name: participant.person.name,
        category: participant.person.category,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao registrar presença pública." },
      { status: 500 }
    );
  }
}
