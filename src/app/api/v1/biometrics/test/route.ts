import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";
import { RateLimiter } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip-utils";

export async function POST(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
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
    const targetPersonId = formData.get("targetPersonId") as string | null;
    const crop = formData.get("crop") as Blob;

    if (!crop) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'crop' é obrigatório." },
        { status: 400 }
      );
    }

    if (crop.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "A imagem excede o limite máximo permitido de 10 MB." },
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

