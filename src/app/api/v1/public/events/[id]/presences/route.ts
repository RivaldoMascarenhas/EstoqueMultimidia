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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);

    const [total, presences] = await Promise.all([
      prisma.presence.count({ where: { eventId } }),
      prisma.presence.findMany({
        where: { eventId },
        orderBy: { capturedAt: "desc" },
        take: limit,
        include: {
          person: {
            select: {
              name: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    // Sanitização estrita: apenas dados visuais públicos essenciais
    const items = presences.map((p) => ({
      id: p.id,
      name: p.person.name,
      photoUrl: p.person.photoUrl,
      confidence: p.confidence ? Number(p.confidence) : 1.0,
      capturedAt: p.capturedAt,
    }));

    return NextResponse.json({
      success: true,
      total,
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar presenças públicas." },
      { status: 500 }
    );
  }
}
