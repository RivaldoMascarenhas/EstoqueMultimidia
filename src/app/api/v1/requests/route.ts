import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestCreateSchema } from "@/schemas/request.schema";
import { requireSession } from "@/lib/api-guard";
import { Shift, RequestStatus, RequestOrigin } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const shift = (searchParams.get("shift") as Shift) || undefined;
    const status = (searchParams.get("status") as RequestStatus) || undefined;
    const roomId = searchParams.get("roomId") || undefined;
    const assignedUserId = searchParams.get("assignedUserId") || undefined;
    const needsReview = searchParams.get("needsReview") !== null
      ? searchParams.get("needsReview") === "true"
      : undefined;
    const origin = (searchParams.get("origin") as RequestOrigin) || undefined;
    const search = searchParams.get("search") || undefined;

    const requests = await RequestService.getRequests({
      date,
      shift,
      status,
      roomId,
      assignedUserId,
      needsReview,
      origin,
      search,
    });

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar solicitações." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const validated = requestCreateSchema.parse(body);

    // Se o criador for do setor operacional e não especificou outro técnico, atribui a si mesmo
    if (!validated.assignedUserId && ["ADMIN", "GESTOR", "OPERADOR"].includes(session.user.role)) {
      validated.assignedUserId = session.user.id;
    }

    const request = await RequestService.createRequest(validated, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Solicitação de atendimento cadastrada com sucesso!",
      data: request,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar solicitação." },
      { status: 400 }
    );
  }
}
