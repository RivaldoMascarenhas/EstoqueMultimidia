import { prisma } from "@/lib/prisma";

export type PresentationStageState =
  | "IDLE"
  | "SHOWING_QR_CODE"
  | "SHOWING_EVENT_LOGO"
  | "SHOWING_LOGO_FULLSCREEN"
  | "SHOWING_PRIZE"
  | "DRAWING"
  | "RESULT"
  | "SPONSORS_SLIDESHOW";

export interface RealtimePayload {
  type:
    | "state:sync"
    | "qr:show"
    | "logo:show"
    | "logo:fullscreen"
    | "idle:show"
    | "prize:show"
    | "draw:start"
    | "draw:result"
    | "draw:cancel"
    | "sponsors:show"
    | "audio:config"
    | "participant:registered";
  eventId: string;
  state?: PresentationStageState;
  prizeId?: string | null;
  prize?: any;
  drawId?: string | null;
  winner?: any;
  sponsors?: any[];
  soundEnabled?: boolean;
  volume?: number;
  participantCount?: number;
  timestamp: number;
}

interface EventChannel {
  state: PresentationStageState;
  currentPrizeId: string | null;
  currentPrize: any | null;
  currentWinner: any | null;
  sponsors: any[] | null;
  soundEnabled: boolean;
  volume: number;
  subscribers: Set<(payload: RealtimePayload) => void>;
}

class RealtimeService {
  private channels = new Map<string, EventChannel>();

  private getChannel(eventId: string): EventChannel {
    if (!this.channels.has(eventId)) {
      this.channels.set(eventId, {
        state: "IDLE",
        currentPrizeId: null,
        currentPrize: null,
        currentWinner: null,
        sponsors: null,
        soundEnabled: true,
        volume: 0.85,
        subscribers: new Set(),
      });
    }
    return this.channels.get(eventId)!;
  }

  public subscribe(eventId: string, callback: (payload: RealtimePayload) => void): () => void {
    const channel = this.getChannel(eventId);
    channel.subscribers.add(callback);

    // Send immediate snapshot
    callback({
      type: "state:sync",
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      sponsors: channel.sponsors || undefined,
      soundEnabled: channel.soundEnabled,
      volume: channel.volume,
      timestamp: Date.now(),
    });

    return () => {
      channel.subscribers.delete(callback);
    };
  }

  public async publish(eventId: string, event: Partial<RealtimePayload>) {
    const channel = this.getChannel(eventId);
    const eventTimestamp = event.timestamp || Date.now();

    if (event.type === "participant:registered") {
      const payload: RealtimePayload = {
        type: "participant:registered",
        eventId,
        participantCount: event.participantCount,
        timestamp: eventTimestamp,
      };

      channel.subscribers.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error("[RealtimeService] Error dispatching to subscriber:", err);
        }
      });
      return;
    }

    // Hydrate if cold
    if (channel.state === "IDLE" && !event.state) {
      try {
        const persisted = await prisma.idempotencyRecord.findUnique({
          where: { key: `presentation_state:${eventId}` },
        });
        if (persisted && persisted.result) {
          const parsed = JSON.parse(persisted.result);
          if (parsed.state) channel.state = parsed.state;
          if (parsed.prizeId) channel.currentPrizeId = parsed.prizeId;
          if (parsed.prize) channel.currentPrize = parsed.prize;
          if (parsed.winner) channel.currentWinner = parsed.winner;
        }
      } catch {}
    }

    if (event.state && event.type !== "audio:config") {
      channel.state = event.state;
    }
    if (
      event.type === "qr:show" ||
      event.type === "logo:show" ||
      event.type === "logo:fullscreen" ||
      event.type === "idle:show" ||
      event.type === "sponsors:show" ||
      event.type === "draw:cancel" ||
      event.type === "draw:start"
    ) {
      channel.currentWinner = null;
    }
    if (event.prize !== undefined) channel.currentPrize = event.prize;
    if (event.prizeId !== undefined) channel.currentPrizeId = event.prizeId;
    if (event.winner !== undefined) channel.currentWinner = event.winner;
    if (event.sponsors !== undefined) channel.sponsors = event.sponsors;
    if (event.soundEnabled !== undefined) channel.soundEnabled = event.soundEnabled;
    if (event.volume !== undefined) channel.volume = event.volume;

    const payload: RealtimePayload = {
      type: event.type || "state:sync",
      eventId,
      ...event,
      state: channel.state,
      sponsors: channel.sponsors || undefined,
      soundEnabled: channel.soundEnabled,
      volume: channel.volume,
      timestamp: eventTimestamp,
    };

    const snapshotPayload: RealtimePayload = {
      type: "state:sync",
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      sponsors: channel.sponsors || undefined,
      soundEnabled: channel.soundEnabled,
      volume: channel.volume,
      timestamp: eventTimestamp,
    };

    // Dispatch to all connected SSE clients
    channel.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error("[RealtimeService] Error dispatching to subscriber:", err);
      }
    });

    // Persist in DB
    try {
      await prisma.idempotencyRecord.upsert({
        where: { key: `presentation_state:${eventId}` },
        update: {
          result: JSON.stringify(snapshotPayload),
        },
        create: {
          key: `presentation_state:${eventId}`,
          eventId,
          result: JSON.stringify(snapshotPayload),
        },
      });
    } catch (dbErr) {
      console.warn("[RealtimeService] Could not persist state in DB:", dbErr);
    }
  }

  public async getPersistentState(eventId: string): Promise<RealtimePayload> {
    try {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key: `presentation_state:${eventId}` },
      });

      if (record && record.result) {
        return JSON.parse(record.result);
      }
    } catch {}

    const channel = this.getChannel(eventId);
    return {
      type: "state:sync",
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      timestamp: Date.now(),
    };
  }

  public getState(eventId: string) {
    const channel = this.getChannel(eventId);
    return {
      eventId,
      state: channel.state,
      prizeId: channel.currentPrizeId,
      prize: channel.currentPrize,
      winner: channel.currentWinner,
      activeListeners: channel.subscribers.size,
    };
  }
}

const globalForRealtime = globalThis as unknown as {
  realtimeService: RealtimeService | undefined;
};

export const realtimeService = globalForRealtime.realtimeService ?? new RealtimeService();
if (process.env.NODE_ENV !== "production") globalForRealtime.realtimeService = realtimeService;
