import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { PersonService } from "@/services/person.service";
import { updatePersonSchema } from "@/schemas/person.schema";
import { BiometricApiService } from "@/services/biometric-api.service";
import { Role } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const person = await PersonService.getPersonById(id);
    if (!person) {
      return NextResponse.json(
        { success: false, error: "Pessoa não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, person });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = updatePersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const updated = await PersonService.updatePerson(
      id,
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, person: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar pessoa." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireSession([Role.ADMIN]);
  if (error) return error;

  try {
    await BiometricApiService.deleteFace({
      personId: id,
      operatorUserId: session?.user?.id,
    }).catch(() => {});

    const deleted = await PersonService.deletePerson(id, session?.user?.id);
    return NextResponse.json({ success: true, person: deleted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao desativar pessoa." },
      { status: 400 }
    );
  }
}
