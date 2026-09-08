import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { itemCreateSchema } from "@/schemas/inventory.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().max(100).optional(),
  boxId: z.string().max(100).optional(),
  status: z.enum(["ALL", "CRITICAL", "LOW", "NORMAL"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession(["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"]);
    if (error) return error;

    const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) {
      return NextResponse.json({ success: false, error: "Filtros ou paginação inválidos." }, { status: 400 });
    }
    const { search, categoryId, boxId, status: statusFilter, page, limit } = query.data;

    const result = await InventoryService.getItems({
      search,
      categoryId,
      boxId,
      statusFilter,
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
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR], { req: req });
    if (error) return error;

    const body = await req.json();
    const validatedData = itemCreateSchema.parse(body);

    const item = await InventoryService.createItem(validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Item '${item.name}' cadastrado com sucesso!`,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatZodError(error, "Erro ao cadastrar novo item.") },
      { status: 400 }
    );
  }
}
