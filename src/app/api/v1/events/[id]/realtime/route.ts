import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { realtimeService, RealtimePayload } from "@/services/realtime.service";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const eventId = params.id;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const isPoll = searchParams.get("poll") === "true";

  // Validate presentation access via token OR session
  let isAuthorized = false;

  if (token && token.trim().length > 0) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, presentationToken: token.trim() },
    });
    if (event) isAuthorized = true;
  }

  if (!isAuthorized) {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const access = await assertEventAccess(eventId, session.user as any, {
        requiredPermission: EVENT_PERMISSIONS.EVENTS_VIEW,
      });
      if (access.authorized) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Token de apresentação inválido ou não autorizado" },
      { status: 401 }
    );
  }

  // If poll mode requested (or standard JSON fetch for state snapshot)
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

  // Set up SSE Stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (payload: RealtimePayload) => {
    try {
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch {
      // Connection closed by client
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

import { z } from "zod";

const realtimePublishSchema = z.object({
  type: z.enum([
    "state:sync",
    "qr:show",
    "logo:show",
    "idle:show",
    "prize:show",
    "draw:start",
    "draw:result",
    "draw:cancel",
    "sponsors:show",
    "audio:config",
    "participant:registered",
  ]),
  state: z.enum([
    "IDLE",
    "SHOWING_QR_CODE",
    "SHOWING_EVENT_LOGO",
    "SHOWING_PRIZE",
    "DRAWING",
    "RESULT",
    "SPONSORS_SLIDESHOW",
  ]).optional(),
  prizeId: z.string().optional(),
  prize: z.any().optional(),
  winner: z.any().optional(),
  sponsors: z.array(z.any()).optional(),
  soundEnabled: z.boolean().optional(),
  volume: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.EVENTOS,
    ]);
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams?.id;
    if (!eventId) {
      return NextResponse.json({ success: false, error: "ID do evento ausente." }, { status: 400 });
    }

    const access = await assertEventAccess(eventId, session.user, {
      requiredPermission: EVENT_PERMISSIONS.PRESENTATION_MANAGE,
      isMutation: true,
    });
    if (!access.authorized) return access.errorResponse!;

    const body = await req.json();
    const parsed = realtimePublishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Payload de transmissão realtime inválido." },
        { status: 400 }
      );
    }

    const { type, state, prizeId, prize, winner, soundEnabled, volume, sponsors } = parsed.data;

    await realtimeService.publish(eventId, {
      type,
      eventId,
      state: state || (type === "audio:config" ? undefined : "IDLE"),
      prizeId,
      prize,
      winner,
      sponsors,
      soundEnabled,
      volume,
    });

    return NextResponse.json({ success: true, state: realtimeService.getState(eventId) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no realtime" }, { status: 400 });
  }
}
