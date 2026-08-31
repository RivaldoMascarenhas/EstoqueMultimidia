import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { prisma } from "@/lib/prisma";
import { maskName } from "@/lib/maskData";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    
    const eventId = id;
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
              registration: true,
              category: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    // Sanitização estrita: dados públicos anonimizados (LGPD Art. 6º, III)
    const items = presences.map((p) => ({
      id: p.id,
      name: maskName(p.person.name),
      registration: p.person.registration || undefined,
      category: p.person.category || undefined,
      fullNameMasked: true,
      confidence: p.confidence ? Number(p.confidence) : 1.0,
      capturedAt: p.capturedAt,
    }));

    return NextResponse.json({
      success: true,
      total,
      items,
    });
} catch (error: any) {
  console.error("Erro em public presences:", error);
  return NextResponse.json(
    { success: false, error: "Erro ao consultar presenças do evento." },
    { status: 500 }
  );
}
}
