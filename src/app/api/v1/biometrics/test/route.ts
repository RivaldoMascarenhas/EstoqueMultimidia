import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

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
    return NextResponse.json(
      { success: false, error: err.message || "Erro no teste biométrico." },
      { status: 500 }
    );
  }
}
