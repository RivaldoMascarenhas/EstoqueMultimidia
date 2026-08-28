import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { EventService } from "@/services/event.service";

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

    const { isAuthorized, event, errorResponse } = await requirePresentationToken(req, eventId);
    if (!isAuthorized || errorResponse) return errorResponse;

    const checkinStatus = EventService.isCheckinAllowed(event);

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        logoUrl: event.logoUrl,
        coverUrl: event.coverUrl,
        status: event.status,
        primaryColor: event.primaryColor,
        secondaryColor: event.secondaryColor,
        allowRepeatWinners: event.allowRepeatWinners,
        theme: event.theme,
        soundConfig: event.soundConfig,
        checkinStatus,
        _count: event._count,
        stats: {
          participantsCount: event._count?.participants || 0,
          presencesTotal: event._count?.presences || 0,
          prizesCount: event._count?.prizes || 0,
          winnersCount: event._count?.winners || 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar evento público." },
      { status: 500 }
    );
  }
}
