import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { updatePrizeSchema } from "@/schemas/prize.schema";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; prizeId: string } }
) {
  const { error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.CONSULTA,
  ]);
  if (error) return error;

  try {
    const prize = await prisma.prize.findUnique({
      where: { id: params.prizeId },
      include: { sponsor: true, winners: true },
    });

    if (!prize || prize.eventId !== params.id) {
      return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, prize });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar prêmio." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; prizeId: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const existing = await prisma.prize.findUnique({
      where: { id: params.prizeId },
    });

    if (!existing || existing.eventId !== params.id) {
      return NextResponse.json(
        { success: false, error: "Prêmio não encontrado." },
        { status: 404 }
      );
    }

    // RBAC Rule: Only ADMIN can edit already drawn/delivered prizes
    if (existing.status !== "AVAILABLE" && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: "Apenas administradores podem alterar prêmios que já foram sorteados.",
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
      params.prizeId,
      parsed.data,
      session.user.id
    );

    return NextResponse.json({ success: true, prize });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar prêmio." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; prizeId: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const existing = await prisma.prize.findUnique({
      where: { id: params.prizeId },
    });

    if (!existing || existing.eventId !== params.id) {
      return NextResponse.json(
        { success: false, error: "Prêmio não encontrado." },
        { status: 404 }
      );
    }

    // RBAC Rule: Only ADMIN can delete already drawn/delivered prizes
    if (existing.status !== "AVAILABLE" && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: "Apenas administradores podem excluir prêmios que já foram sorteados.",
        },
        { status: 403 }
      );
    }

    await EventService.deletePrize(params.prizeId, session.user.id);

    return NextResponse.json({ success: true, message: "Prêmio excluído com sucesso." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao excluir prêmio." },
      { status: 400 }
    );
  }
}
