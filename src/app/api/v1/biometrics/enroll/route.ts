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
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
