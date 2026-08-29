import { NextRequest, NextResponse } from "next/server";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { prisma } from "@/lib/prisma";
import { realtimeService, RealtimePayload } from "@/services/realtime.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const eventId = id;
  if (!eventId) {
    return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
  }

  const { isAuthorized, errorResponse } = await requirePresentationToken(req, eventId);
  if (!isAuthorized || errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const isPoll = searchParams.get("poll") === "true";

  // Se modo poll ou JSON snapshot
  if (isPoll || req.headers.get("accept")?.includes("application/json")) {
    const state = await realtimeService.getPersistentState(eventId);
    const participantCount = await prisma.eventParticipant.count({ where: { eventId } });
    return NextResponse.json(
      { ...state, participantCount },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  // SSE Stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (payload: RealtimePayload) => {
    try {
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch {
      // Cliente encerrou conexão
    }
  };

  const unsubscribe = realtimeService.subscribe(eventId, sendEvent);

  req.signal.addEventListener("abort", () => {
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
