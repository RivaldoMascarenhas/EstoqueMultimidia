import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";
import { RateLimiter } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip-utils";
import { validateBiometricImage } from "@/lib/biometric-upload";

export async function POST(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ], { req: req });
  if (error) return error;

  const clientIp = getClientIp(req);
  const rateLimit = await RateLimiter.consume(`bio:test:${clientIp}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Limite de testes biométricos por minuto atingido. Aguarde antes de tentar novamente." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const targetPersonId = formData.get("targetPersonId");
    const crop = formData.get("crop");

    if (!(crop instanceof Blob) || (targetPersonId !== null && (typeof targetPersonId !== "string" || targetPersonId.length > 128))) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'crop' é obrigatório." },
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

    const result = await BiometricApiService.testBiometrics({
      cropBlob: crop,
      targetPersonId: targetPersonId || null,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro no teste biométrico:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível processar o teste biométrico." },
      { status: 500 }
    );
  }
}

