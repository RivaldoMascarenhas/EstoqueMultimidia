import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { validateBiometricImage } from "@/lib/biometric-upload";
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
  ], { req: req });
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
    const eventId = formData.get("eventId");
    const deviceIdentifier = formData.get("deviceIdentifier");
    const crop = formData.get("crop");

    if (typeof eventId !== "string" || !eventId.trim() || eventId.length > 128 ||
        (deviceIdentifier !== null && (typeof deviceIdentifier !== "string" || deviceIdentifier.length > 200)) || !(crop instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'eventId' e 'crop' são obrigatórios." },
        { status: 400 }
      );
    }

    const imageError = await validateBiometricImage(crop);
    if (imageError) {
      return NextResponse.json(
        { success: false, error: imageError },
        { status: 400 }
      );
    }

    // 1. Validação antecipada do evento e janela de check-in
    const access = await assertEventAccess(eventId, session.user, {
      isMutation: true,
      requiredPermission: EVENT_PERMISSIONS.PRESENCE_REGISTER,
    });
    if (!access.authorized) return access.errorResponse!;
    const event = access.event;

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

