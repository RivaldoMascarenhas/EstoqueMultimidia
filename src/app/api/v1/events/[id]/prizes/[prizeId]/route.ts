import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { updatePrizeSchema } from "@/schemas/prize.schema";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canDeletePrize, canEditPrize, EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { assertEventAccess } from "@/lib/event-access";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const { id, prizeId } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRIZES_VIEW,
    });
    if (!access.authorized) return access.errorResponse!;

    const prize = await prisma.prize.findUnique({
      where: { id: prizeId },
      include: { sponsor: true, winners: true },
    });

    if (!prize || prize.eventId !== id) {
      return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, prize });
  } catch (err: any) {
    console.error("Erro ao buscar prêmio:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar prêmio." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const { id, prizeId } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRIZES_EDIT,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const existing = await prisma.prize.findUnique({
      where: { id: prizeId },
    });

    if (!existing || existing.eventId !== id) {
      return NextResponse.json(
        { success: false, error: "Prêmio não encontrado." },
        { status: 404 }
      );
    }

    // Regra RBAC & Estado: prêmios sorteados não podem ser alterados por OPERADOR/EVENTOS
    const userRole = (session?.user?.role || Role.OPERADOR) as Role;
    if (!canEditPrize(userRole, existing)) {
      return NextResponse.json(
        {
          success: false,
          error: "Este prêmio já foi sorteado e não pode ser alterado.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const prize = await EventService.updatePrize(
      prizeId,
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ success: true, prize });
  } catch (err: any) {
    console.error("Erro ao atualizar prêmio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar prêmio." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const { id, prizeId } = await params;
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const access = await assertEventAccess(id, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRIZES_DELETE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const existing = await prisma.prize.findUnique({
      where: { id: prizeId },
    });

    if (!existing || existing.eventId !== id) {
      return NextResponse.json(
        { success: false, error: "Prêmio não encontrado." },
        { status: 404 }
      );
    }

    // Regra Crítica: EVENTOS só pode excluir prêmio se status === "AVAILABLE"
    const userRole = (session?.user?.role || Role.OPERADOR) as Role;
    if (!canDeletePrize(userRole, existing)) {
      return NextResponse.json(
        {
          success: false,
          error: "Este prêmio já foi sorteado e não pode ser excluído.",
        },
        { status: 403 }
      );
    }

    await EventService.deletePrize(prizeId, session?.user?.id);

    return NextResponse.json({ success: true, message: "Prêmio excluído com sucesso." });
  } catch (err: any) {
    console.error("Erro ao excluir prêmio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir prêmio." },
      { status: 400 }
    );
  }
}
