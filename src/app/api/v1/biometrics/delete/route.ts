import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { PersonService } from "@/services/person.service";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'personId' é obrigatório." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;

    const result = await PersonService.deleteBiometrics(
      personId,
      session?.user?.id,
      ipAddress
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao revogar biometria." },
      { status: 400 }
    );
  }
}
