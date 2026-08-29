import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BiometricApiService } from "@/services/biometric-api.service";
import { safeAuditLog } from "@/lib/audit";
import { requireSession } from "@/lib/api-guard";
import { maskCpf } from "@/lib/maskData";
import { PresenceMethod, ParticipantStatus, Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // 1. Exigir autenticação obrigatória de operador/gestor/admin/eventos
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENCE_REGISTER,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const { imageBase64, personId, method = "FACE" } = body;

    // 2. Verificar se o evento existe e está ativo
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { participants: true, presences: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      );
    }

    if (event.status === "COMPLETED" || event.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          status: "EVENT_CLOSED",
          message: "Este evento já foi encerrado ou cancelado.",
        },
        { status: 400 }
      );
    }

    let recognizedPersonId: string | null = null;
    let confidence = 0.95;
    let distance = 0.38;

    // 3. Se enviou imagem, realiza reconhecimento biométrico estrito
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: "image/jpeg" });

      const bioRes = await BiometricApiService.recognizeFace({
        eventId,
        cropBlob: blob,
        operatorUserId: session?.user?.id,
      });

      if (bioRes.success && bioRes.person) {
        recognizedPersonId = bioRes.person.id;
        confidence = bioRes.confidence || 0.95;
        distance = bioRes.distance || 0.38;
      } else if (bioRes.status === "ALREADY_REGISTERED" && bioRes.person) {
        return NextResponse.json({
          success: false,
          status: "ALREADY_REGISTERED",
          message: bioRes.message || "Presença já confirmada anteriormente.",
          person: {
            ...bioRes.person,
            cpf: maskCpf(bioRes.person.cpf),
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            status: "NOT_RECOGNIZED",
            message: bioRes.message || "Rosto não identificado no sistema. Procure a mesa de apoio.",
          },
          { status: 404 }
        );
      }
    } else if (personId && (session.user.role === Role.ADMIN || session.user.role === Role.GESTOR || session.user.role === Role.OPERADOR || session.user.role === Role.EVENTOS)) {
      // Registro manual explícito por operador autenticado
      recognizedPersonId = personId;
    } else {
      return NextResponse.json(
        {
          success: false,
          status: "BAD_REQUEST",
          message: "É necessário fornecer a imagem biométrica ou efetuar o registro manual por operador.",
        },
        { status: 400 }
      );
    }

    if (!recognizedPersonId) {
      return NextResponse.json(
        {
          success: false,
          status: "BAD_REQUEST",
          message: "Identificador da pessoa não reconhecido.",
        },
        { status: 400 }
      );
    }

    // 4. Buscar dados completos da pessoa
    const person = await prisma.person.findUnique({
      where: { id: recognizedPersonId },
    });

    if (!person || !person.active) {
      return NextResponse.json(
        {
          success: false,
          status: "NOT_FOUND",
          message: "Pessoa não cadastrada ou inativa.",
        },
        { status: 404 }
      );
    }

    // 5. Verificar se a pessoa já está inscrita no evento ou vincular
    let participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_personId: {
          eventId,
          personId: person.id,
        },
      },
    });

    if (!participant) {
      const lastTicket = await prisma.eventParticipant.findFirst({
        where: { eventId },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });
      const nextTicket = (lastTicket?.ticketNumber || 0) + 1;

      participant = await prisma.eventParticipant.create({
        data: {
          eventId,
          personId: person.id,
          ticketNumber: nextTicket,
          category: person.category || "Geral",
          status: ParticipantStatus.ACTIVE,
          isEligible: true,
        },
      });
    }

    // 6. Verificar se presença já foi registrada
    const existingPresence = await prisma.presence.findUnique({
      where: {
        eventId_personId: {
          eventId,
          personId: person.id,
        },
      },
    });

    if (existingPresence) {
      const capturedTime = new Date(existingPresence.capturedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return NextResponse.json({
        success: true,
        status: "ALREADY_REGISTERED",
        message: `Presença já registrada hoje às ${capturedTime}. Você já está concorrendo aos sorteios!`,
        person: {
          id: person.id,
          name: person.name,
          registration: person.registration,
          cpf: maskCpf(person.cpf), // LGPD: CPF mascarado
          category: person.category,
          affiliation: person.affiliation,
          photoUrl: person.photoUrl,
        },
        ticketNumber: participant.ticketNumber,
        presence: existingPresence,
      });
    }

    // 7. Registrar nova presença
    const newPresence = await prisma.presence.create({
      data: {
        eventId,
        personId: person.id,
        method: method === "FACE" ? PresenceMethod.FACE : PresenceMethod.MANUAL,
        confidence,
        distance,
        status: "REGISTERED",
      },
    });

    // Marca participante como elegível para sorteios
    await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { isEligible: true },
    });

    await safeAuditLog({
      action: "PRESENCE_REGISTERED",
      entity: "Presence",
      entityId: newPresence.id,
      details: {
        eventId,
        personName: person.name,
        method,
        ticketNumber: participant.ticketNumber,
        registeredBy: session?.user?.id,
      },
    });

    return NextResponse.json({
      success: true,
      status: "REGISTERED",
      message: "Presença confirmada com sucesso! Boa sorte no evento.",
      person: {
        id: person.id,
        name: person.name,
        registration: person.registration,
        cpf: maskCpf(person.cpf), // LGPD: CPF mascarado
        category: person.category,
        affiliation: person.affiliation,
        photoUrl: person.photoUrl,
      },
      ticketNumber: participant.ticketNumber,
      presence: newPresence,
    });
  } catch (err: any) {
    console.error("Erro ao registrar presença:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno ao registrar presença." },
      { status: 500 }
    );
  }
}
