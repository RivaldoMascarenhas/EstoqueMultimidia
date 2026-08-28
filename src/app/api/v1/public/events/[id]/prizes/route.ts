import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const { isAuthorized, errorResponse } = await requirePresentationToken(req, eventId);
    if (!isAuthorized || errorResponse) return errorResponse;

    const prizes = await prisma.prize.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            website: true,
          },
        },
        winners: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedPrizes = prizes.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      quantity: p.quantity,
      order: p.order,
      status: p.status,
      sponsor: p.sponsor,
      winners: p.winners.map((w) => ({
        id: w.id,
        drawDate: w.drawDate,
        person: {
          name: w.person.name,
        },
      })),
    }));

    return NextResponse.json({
      success: true,
      prizes: formattedPrizes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar prêmios públicos." },
      { status: 500 }
    );
  }
}
