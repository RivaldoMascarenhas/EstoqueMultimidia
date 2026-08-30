import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { PersonService } from "@/services/person.service";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const categories = await PersonService.getCategoriesWithStats();
    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro ao buscar categorias." },
      { status: 500 }
    );
  }
}
