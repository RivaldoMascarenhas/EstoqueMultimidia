import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestUpdateSchema } from "@/schemas/request.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.CONSULTA,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const request = await RequestService.getRequestById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

    // Isolamento server-side para Apoio Acadêmico
    if (session.user.role === Role.ACADEMIC_SUPPORT && request.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestUpdateSchema.parse(body);

    const updated = await RequestService.updateRequest(
      id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "cancel") {
      const cancelled = await RequestService.cancelRequest(id, session.user);
      return NextResponse.json({
        success: true,
        message: "Solicitação cancelada com sucesso!",
        data: cancelled,
      });
    }

    const deleted = await RequestService.deleteRequest(id, session.user);

    return NextResponse.json({
      success: true,
      message: "Agendamento excluído da grade com sucesso!",
      data: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar exclusão do agendamento." },
      { status: 400 }
    );
  }
}
