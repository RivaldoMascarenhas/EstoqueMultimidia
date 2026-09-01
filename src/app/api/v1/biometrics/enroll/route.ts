import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
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
  const rateLimit = await RateLimiter.consume(`bio:enroll:${clientIp}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Limite de cadastros biométricos por minuto atingido. Aguarde antes de continuar." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const personId = formData.get("personId") as string;
    const isCrop = formData.get("isCrop") === "true";
    const image = formData.get("image") as Blob;

    if (!personId || !image) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'personId' e 'image' são obrigatórios." },
        { status: 400 }
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "A imagem excede o limite máximo permitido de 10 MB." },
        { status: 400 }
      );
    }

    const result = await BiometricApiService.enrollFace({
      personId,
      imageBlob: image,
      isCrop,
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro ao cadastrar biometria facial:", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível cadastrar a biometria facial." },
      { status: 500 }
    );
  }
}

