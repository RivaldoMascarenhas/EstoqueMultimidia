import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

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
      { success: false, error: err.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
