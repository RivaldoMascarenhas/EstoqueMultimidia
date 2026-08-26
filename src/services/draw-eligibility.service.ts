import { prisma } from "@/lib/prisma";
import { ParticipantStatus, PresenceMethod } from "@prisma/client";

export interface DrawEligibilityCriteria {
  eventId: string;
  requireRegistration?: boolean;
  requirePresence?: boolean;
  requireFacialPresenceOnly?: boolean;
  allowRepeatWinners?: boolean;
  categoryFilter?: string | null;
}

export interface EligibleCandidate {
  personId: string;
  participantId: string;
  ticketNumber: number;
  name: string;
  registration?: string | null;
  category?: string | null;
  email?: string | null;
  presenceMethod?: PresenceMethod | null;
  presenceConfidence?: number | null;
}

export class DrawEligibilityService {
  /**
   * Evaluates and computes the list of eligible participants for a draw
   */
  public static async getEligibleParticipants(
    criteria: DrawEligibilityCriteria
  ): Promise<EligibleCandidate[]> {
    const {
      eventId,
      requirePresence = true,
      requireFacialPresenceOnly = false,
      allowRepeatWinners = false,
      categoryFilter,
    } = criteria;

    // 1. Fetch Event configuration
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { allowRepeatWinners: true },
    });

    if (!event) {
      throw new Error("Evento não encontrado para verificação de elegibilidade.");
    }

    const shouldAllowRepeat =
      criteria.allowRepeatWinners !== undefined
        ? criteria.allowRepeatWinners
        : event.allowRepeatWinners;

    // 2. Fetch all participants with Person and Presences
    const participants = await prisma.eventParticipant.findMany({
      where: {
        eventId,
        status: {
          notIn: [ParticipantStatus.INACTIVE, ParticipantStatus.CANCELLED],
        },
        category: categoryFilter || undefined,
        ...(shouldAllowRepeat ? {} : { isWinner: false }),
      },
      include: {
        person: {
          include: {
            presences: {
              where: { eventId },
              select: { method: true, confidence: true, status: true },
            },
          },
        },
      },
      orderBy: { ticketNumber: "asc" },
    });

    // 3. Filter candidates strictly by attendance criteria
    const eligible: EligibleCandidate[] = [];

    for (const p of participants) {
      if (!p.person || !p.person.active) continue;

      const presence = p.person.presences?.[0] || null;

      if (requirePresence) {
        if (!presence) continue;
        if (
          presence.status &&
          !["REGISTERED", "VALIDATED", "PRESENT", "CONFIRMED"].includes(
            presence.status.toUpperCase()
          )
        ) {
          continue;
        }

        if (requireFacialPresenceOnly && presence.method !== PresenceMethod.FACE) {
          continue;
        }
      }

      eligible.push({
        personId: p.personId,
        participantId: p.id,
        ticketNumber: p.ticketNumber,
        name: p.person.name,
        registration: p.person.registration,
        category: p.category || p.person.category || "Geral",
        email: p.person.email,
        presenceMethod: presence?.method || null,
        presenceConfidence: presence?.confidence || null,
      });
    }

    return eligible;
  }
}
