import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestUpdateSchema } from "@/schemas/request.schema";
import { requireSession } from "@/lib/api-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const request = await RequestService.getRequestById(params.id);
    return NextResponse.json({ success: true, data: request });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Solicitação não encontrada." },
      { status: 404 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const validated = requestUpdateSchema.parse(body);

    const updated = await RequestService.updateRequest(
      params.id,
      validated,
      session.user
    );

    return NextResponse.json({
      success: true,
      message: "Solicitação atualizada com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar solicitação." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const cancelled = await RequestService.cancelRequest(params.id, session.user);

    return NextResponse.json({
      success: true,
      message: "Solicitação cancelada com sucesso!",
      data: cancelled,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cancelar solicitação." },
      { status: 400 }
    );
  }
}
