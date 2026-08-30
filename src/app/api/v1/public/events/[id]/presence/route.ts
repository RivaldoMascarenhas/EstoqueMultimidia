import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { prisma } from "@/lib/prisma";
import { EventService } from "@/services/event.service";
import { BiometricApiService } from "@/services/biometric-api.service";
import { verifyParticipantQrToken } from "@/lib/qr-token";
import { PresenceMethod } from "@prisma/client";
import { safeAuditLog, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Registro de Presença no Totem Público
 * Segurança:
 * 1. Exige presentationToken do evento.
 * 2. Método FACE: OBRIGATÓRIO envio de captura facial (crop). A autoridade biométrica
 *    (FastAPI + pgvector) é a ÚNICA que determina a identidade (personId) e a confiança (confidence).
 *    O cliente NÃO tem permissão de forjar identidade ou método FACE sem prova biométrica.
 * 3. Método QR_CODE: OBRIGATÓRIO envio de token assinado digitalmente (HMAC-SHA256).
 * 4. Método MANUAL: Estritamente PROIBIDO no totem público (restrito a operadores autenticados).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    
    const eventId = id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    // 1. Validação de Token de Apresentação (timing-safe)
    const { isAuthorized, event, errorResponse } = await requirePresentationToken(req, eventId);
    if (!isAuthorized || errorResponse) return errorResponse;

    // 2. Validação da janela de check-in do evento
    const checkinStatus = EventService.isCheckinAllowed(event);
    if (!checkinStatus.isAllowed) {
      return NextResponse.json(
        { success: false, error: checkinStatus.message || "Check-in não liberado para este evento." },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    // 3. FLUXO 1: Requisição via multipart/form-data (captura de câmera do Totem com imagem crop)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const crop = formData.get("crop") as Blob | null;
      const deviceIdentifier = (formData.get("deviceIdentifier") as string) || null;

      if (!crop) {
        return NextResponse.json(
          {
            success: false,
            error: "Envio de captura biométrica facial ('crop') é obrigatório para registrar presença facial.",
          },
          { status: 400 }
        );
      }

      if (crop.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "A imagem excede o limite máximo permitido de 10 MB." },
          { status: 400 }
        );
      }

      // Delegação para a Autoridade Biométrica do Servidor (FastAPI / pgvector)
      const result = await BiometricApiService.recognizeFace({
        eventId,
        cropBlob: crop,
        deviceIdentifier,
      });

      if (result.status === "REGISTERED" || result.status === "ALREADY_REGISTERED") {
        await safeAuditLog({
          action: "PRESENCE_REGISTERED_PUBLIC_TOTEM_FACE",
          entity: "Presence",
          details: {
            eventId,
            personId: result.person?.id,
            personName: result.person?.name,
            confidence: result.confidence,
            distance: result.distance,
            method: "FACE",
          },
          ipAddress: getClientIp(req),
        });
      }

      return NextResponse.json(result);
    }

    // 4. FLUXO 2: Requisição via JSON
    const body = await req.json().catch(() => ({}));
    const { method, cropBase64, imageBase64, qrToken, deviceIdentifier } = body;

    // A) FACE via JSON (Base64)
    if (method === "FACE" || cropBase64 || imageBase64) {
      const base64Data = cropBase64 || imageBase64;
      if (!base64Data || typeof base64Data !== "string") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Registro de presença FACE exige o envio da imagem facial capturada ('cropBase64') para validação biométrica no servidor.",
          },
          { status: 400 }
        );
      }

      // Converte base64 para Blob binário seguro
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const cropBlob = new Blob([buffer], { type: "image/jpeg" });

      const result = await BiometricApiService.recognizeFace({
        eventId,
        cropBlob,
        deviceIdentifier: deviceIdentifier || null,
      });

      if (result.status === "REGISTERED" || result.status === "ALREADY_REGISTERED") {
        await safeAuditLog({
          action: "PRESENCE_REGISTERED_PUBLIC_TOTEM_FACE",
          entity: "Presence",
          details: {
            eventId,
            personId: result.person?.id,
            personName: result.person?.name,
            confidence: result.confidence,
            distance: result.distance,
            method: "FACE",
          },
          ipAddress: getClientIp(req),
        });
      }

      return NextResponse.json(result);
    }

    // B) QR CODE com Prova Criptográfica Assinada
    if (method === "QR_CODE") {
      if (!qrToken || typeof qrToken !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Token de validação de QR Code ('qrToken') assinado é obrigatório.",
          },
          { status: 400 }
        );
      }

      const qrValidation = verifyParticipantQrToken(eventId, qrToken);
      if (!qrValidation.isValid || !qrValidation.personId) {
        return NextResponse.json(
          { success: false, error: qrValidation.error || "QR Code inválido ou expirado." },
          { status: 401 }
        );
      }

      const verifiedPersonId = qrValidation.personId;

      // Verificar se a pessoa é participante ativa do evento
      const participant = await prisma.eventParticipant.findUnique({
        where: { eventId_personId: { eventId, personId: verifiedPersonId } },
        include: { person: true },
      });

      if (!participant || !participant.person.active) {
        return NextResponse.json(
          { success: false, error: "Participante não encontrado ou inativo neste evento." },
          { status: 404 }
        );
      }

      // Verificar se já possui presença registrada
      const existing = await prisma.presence.findUnique({
        where: { eventId_personId: { eventId, personId: verifiedPersonId } },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          status: "ALREADY_REGISTERED",
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
          personId: verifiedPersonId,
          method: PresenceMethod.QR_CODE,
          confidence: 1.0,
          status: "REGISTERED",
        },
      });

      await safeAuditLog({
        action: "PRESENCE_REGISTERED_PUBLIC_TOTEM_QR",
        entity: "Presence",
        entityId: presence.id,
        details: { eventId, personId: verifiedPersonId, personName: participant.person.name, method: "QR_CODE" },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({
        success: true,
        status: "REGISTERED",
        alreadyRegistered: false,
        message: "Presença confirmada via QR Code com sucesso!",
        person: {
          id: participant.person.id,
          name: participant.person.name,
          category: participant.person.category,
        },
      });
    }

    // C) Tentativa de envio de MANUAL ou parâmetros arbitrários sem prova
    return NextResponse.json(
      {
        success: false,
        error:
          "Registro manual de presença é estritamente proibido no totem público (restrito a operadores autenticados). Para registrar presença pública, forneça captura biométrica facial ou QR Code assinado.",
      },
      { status: 403 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
