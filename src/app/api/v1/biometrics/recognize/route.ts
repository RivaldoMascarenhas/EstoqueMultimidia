import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { EventService } from "@/services/event.service";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";
import { RateLimiter } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip-utils";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  const clientIp = getClientIp(req);
  const rateLimit = await RateLimiter.consume(`bio:rec:${clientIp}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Limite de requisições biométricas excedido. Aguarde alguns instantes." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const eventId = formData.get("eventId") as string;
    const deviceIdentifier = formData.get("deviceIdentifier") as string | null;
    const crop = formData.get("crop") as Blob;

    if (!eventId || !crop) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'eventId' e 'crop' são obrigatórios." },
        { status: 400 }
      );
    }

    if (crop.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "A imagem excede o limite máximo permitido de 10 MB." },
        { status: 400 }
      );
    }

    // 1. Validação antecipada do evento e janela de check-in
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        status: true,
        date: true,
        time: true,
        checkinOpenMinutesBefore: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, status: "ERROR", message: "Evento não encontrado." },
        { status: 404 }
      );
    }

    const checkinStatus = EventService.isCheckinAllowed(event);
    if (!checkinStatus.isAllowed) {
      return NextResponse.json({
        success: false,
        status: "EVENT_NOT_OPEN",
        message: checkinStatus.message || "O check-in não está aberto para este evento.",
      });
    }

    const result = await BiometricApiService.recognizeFace({
      eventId,
      cropBlob: crop,
      deviceIdentifier: deviceIdentifier || null,
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro ao reconhecer biometria facial:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível processar o reconhecimento biométrico." },
      { status: 500 }
    );
  }
}

