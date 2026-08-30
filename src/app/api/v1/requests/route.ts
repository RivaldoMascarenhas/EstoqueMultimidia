import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requestCreateSchema } from "@/schemas/request.schema";
import { requireSession } from "@/lib/api-guard";
import { Shift, RequestStatus, RequestOrigin, Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.CONSULTA,
      Role.ACADEMIC_SUPPORT,
    ]);
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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Escopo server-side: Apoio Acadêmico só visualiza solicitações criadas por si mesmo
    const createdById = session.user.role === Role.ACADEMIC_SUPPORT ? session.user.id : undefined;

    const result = await RequestService.getRequests({
      date,
      shift,
      status,
      roomId,
      assignedUserId,
      createdById,
      needsReview,
      origin,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }
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
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.ACADEMIC_SUPPORT,
    ]);
    if (error) return error;

    const body = await req.json();
    const validated = requestCreateSchema.parse(body);

    // Se for Apoio Acadêmico, impede a atribuição manual de técnico
    if (session.user.role === Role.ACADEMIC_SUPPORT) {
      validated.assignedUserId = undefined;
    } else if (!validated.assignedUserId && ([Role.ADMIN, Role.GESTOR, Role.OPERADOR] as Role[]).includes(session.user.role)) {
      // Se o criador for do setor operacional e não especificou outro técnico, atribui a si mesmo
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
