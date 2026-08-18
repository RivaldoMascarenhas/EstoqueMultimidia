import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
    ]);
    if (error) return error;

    const body = await req.json();
    const separated = Boolean(body.separated);

    const updated = await RequestService.toggleItemSeparated(
      params.id,
      params.itemId,
      separated,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar item de preparo." },
      { status: 400 }
    );
  }
}
