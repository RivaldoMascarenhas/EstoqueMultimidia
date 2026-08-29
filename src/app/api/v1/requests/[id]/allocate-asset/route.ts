import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestAllocateAssetSchema } from "@/schemas/request.schema";
import { requireSession, requireRole } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestAllocateAssetSchema.parse(body);

    const updated = await RequestService.allocateAsset(
      params.id,
      validated.itemId,
      validated.assetId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Patrimônio alocado com sucesso ao atendimento!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao alocar patrimônio." },
      { status: 400 }
    );
  }
}
