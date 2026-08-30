import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { PersonService } from "@/services/person.service";
import { createPersonSchema } from "@/schemas/person.schema";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;
    const hasFaceParam = searchParams.get("hasFace");
    const hasFace = hasFaceParam !== null ? hasFaceParam === "true" : undefined;
    const activeParam = searchParams.get("active");
    const active = activeParam !== null ? activeParam === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await PersonService.listPersons({
      query,
      category,
      hasFace,
      active,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createPersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const person = await PersonService.createPerson(
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, person }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar pessoa." },
      { status: 400 }
    );
  }
}
