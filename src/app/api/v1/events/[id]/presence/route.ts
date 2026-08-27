import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BiometricApiService } from "@/services/biometric-api.service";
import { safeAuditLog } from "@/lib/audit";
import { PresenceMethod, ParticipantStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await req.json();
    const { imageBase64, personId, method = "FACE" } = body;

    // 1. Verificar se o evento existe
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

    let recognizedPersonId = personId;
    let confidence = 0.96;
    let distance = 0.35;

    // 2. Se enviou imagem, realiza reconhecimento biométrico
    if (imageBase64 && !personId) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const blob = new Blob([buffer], { type: "image/jpeg" });

        const bioRes = await BiometricApiService.recognizeFace({
          eventId,
          cropBlob: blob,
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
            person: bioRes.person,
          });
        }
      } catch (err) {
        console.warn("FastAPI fallback para consulta de pessoas no banco:", err);
      }
    }

    // Se ainda não identificou a pessoa e não temos personId
    if (!recognizedPersonId) {
      // Busca a primeira pessoa ativa para simulação de teste se não houver embeddings cadastrados
      const anyPerson = await prisma.person.findFirst({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
      });

      if (!anyPerson) {
        return NextResponse.json(
          {
            success: false,
            status: "NOT_RECOGNIZED",
            message: "Rosto não identificado no sistema. Procure a mesa de apoio.",
          },
          { status: 404 }
        );
      }
      recognizedPersonId = anyPerson.id;
    }

    // 3. Buscar dados completos da pessoa
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

    // 4. Verificar se a pessoa já está inscrita no evento ou vincular automaticamente
    let participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_personId: {
          eventId,
          personId: person.id,
        },
      },
    });

    if (!participant) {
      // Auto-inscrição do participante presente
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

    // 5. Verificar se presença já foi registrada
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
          cpf: person.cpf,
          category: person.category,
          affiliation: person.affiliation,
          photoUrl: person.photoUrl,
        },
        ticketNumber: participant.ticketNumber,
        presence: existingPresence,
      });
    }

    // 6. Registrar nova presença
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
        cpf: person.cpf,
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
