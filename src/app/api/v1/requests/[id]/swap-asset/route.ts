import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestSwapAssetSchema } from "@/schemas/request.schema";
import { requireSession, requireRole } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const roleError = requireRole(session.user.role, [
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (roleError) return roleError;

    const body = await req.json();
    const validated = requestSwapAssetSchema.parse(body);

    const updated = await RequestService.swapAsset(
      params.id,
      validated.itemId,
      validated.newAssetId,
      validated.reason,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Substituição de patrimônio registrada com sucesso no histórico!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao substituir patrimônio." },
      { status: 400 }
    );
  }
}
