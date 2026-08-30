import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import { DrawType, PrizeStatus } from "@prisma/client";
import crypto from "crypto";
import { DrawEligibilityService, EligibleCandidate } from "./draw-eligibility.service";

export interface ExecuteDrawParams {
  eventId: string;
  prizeId: string;
  drawType?: DrawType;
  requireRegistration?: boolean;
  requirePresence?: boolean;
  requireFacialPresenceOnly?: boolean;
  allowRepeatWinners?: boolean;
  categoryFilter?: string | null;
  minNumber?: number;
  maxNumber?: number;
  operatorUserId?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface DrawExecutionResult {
  drawId: string;
  drawnNumber?: number | null;
  drawnName: string;
  drawType: DrawType;
  timestamp: Date;
  winner: {
    personId: string;
    participantId: string;
    name: string;
    ticketNumber: number;
    registration?: string | null;
    category?: string | null;
    email?: string | null;
  };
  prize: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    sponsor?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
  totalEligible: number;
}

export class DrawService {
  /**
   * Cryptographically secure random integer selection in [0, max - 1]
   */
  public static getRandomIndex(max: number): number {
    if (max <= 0) throw new Error("Intervalo inválido para sorteio.");
    return crypto.randomInt(0, max);
  }

  /**
   * Executes a draw with atomic locking, duplicate protection and audit trail
   */
  public static async executeDraw(params: ExecuteDrawParams): Promise<DrawExecutionResult> {
    const {
      eventId,
      prizeId,
      drawType = DrawType.PERSON,
      requireRegistration = true,
      requirePresence = true,
      requireFacialPresenceOnly = false,
      allowRepeatWinners,
      categoryFilter,
      minNumber = 1,
      maxNumber = 100,
      operatorUserId,
      notes,
      idempotencyKey,
      ipAddress,
      userAgent,
    } = params;

    // 0. Idempotency check
    if (idempotencyKey) {
      const cached = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (cached && cached.result) {
        return JSON.parse(cached.result) as DrawExecutionResult;
      }
    }

    // 1. Calculate eligible candidates before locking
    let eligibleCandidates: EligibleCandidate[] = [];
    if (drawType === DrawType.PERSON) {
      eligibleCandidates = await DrawEligibilityService.getEligibleParticipants({
        eventId,
        requireRegistration,
        requirePresence,
        requireFacialPresenceOnly,
        allowRepeatWinners,
        categoryFilter,
      });

      if (eligibleCandidates.length === 0) {
        throw new Error(
          "Nenhum participante elegível encontrado com os critérios selecionados (verifique inscrição e presença)."
        );
      }
    }

    // 2. Transactionally lock prize and execute draw
    const result = await prisma.$transaction(async (tx) => {
      // Optimistic lock on Prize against concurrent draws
      const lockResult = await tx.prize.updateMany({
        where: {
          id: prizeId,
          eventId,
          status: PrizeStatus.AVAILABLE,
        },
        data: {
          status: PrizeStatus.DRAWN,
        },
      });

      if (lockResult.count !== 1) {
        const currentPrize = await tx.prize.findUnique({ where: { id: prizeId } });
        if (!currentPrize) throw new Error("Prêmio não encontrado.");
        if (currentPrize.status === PrizeStatus.DRAWN) {
          throw new Error("Este prêmio já foi sorteado anteriormente.");
        }
        if (currentPrize.status === PrizeStatus.CANCELLED) {
          throw new Error("Este prêmio foi cancelado.");
        }
        throw new Error("Prêmio indisponível para sorteio.");
      }

      const prize = await tx.prize.findUniqueOrThrow({
        where: { id: prizeId },
        include: { sponsor: true },
      });

      let chosenCandidate: EligibleCandidate;
      let drawnNumber: number = 0;
      let drawnName: string = "";

      if (drawType === DrawType.PERSON) {
        const selectedIndex = this.getRandomIndex(eligibleCandidates.length);
        chosenCandidate = eligibleCandidates[selectedIndex];
        drawnNumber = chosenCandidate.ticketNumber;
        drawnName = chosenCandidate.name;
      } else {
        // Range mode (e.g. 1 to N)
        const min = Math.min(minNumber, maxNumber);
        const max = Math.max(minNumber, maxNumber);
        const rangeSize = max - min + 1;
        drawnNumber = min + this.getRandomIndex(rangeSize);
        drawnName = `Número #${drawnNumber}`;

        // Find participant with this ticket if exists
        const participant = await tx.eventParticipant.findFirst({
          where: { eventId, ticketNumber: drawnNumber },
          include: { person: true },
        });

        if (!participant) {
          throw new Error(`O número sorteado (#${drawnNumber}) não está associado a nenhum participante inscrito neste evento. Por favor, tente novamente.`);
        }

        chosenCandidate = {
          personId: participant.personId,
          participantId: participant.id,
          ticketNumber: drawnNumber,
          name: participant.person.name,
          registration: participant.person.registration || null,
          email: participant.person.email || null,
        };
      }

      // Validate operatorUserId to prevent Foreign Key constraint error if session is stale
      let validOperatorUserId: string | null = null;
      if (operatorUserId) {
        const userExists = await tx.user.findUnique({
          where: { id: operatorUserId },
          select: { id: true },
        });
        if (userExists) validOperatorUserId = userExists.id;
      }

      // Create Draw
      const draw = await tx.draw.create({
        data: {
          eventId,
          prizeId,
          drawType,
          winnerPersonId: chosenCandidate.personId || null,
          drawnNumber,
          drawnName,
          operatorUserId: validOperatorUserId,
          notes: notes || null,
          status: "COMPLETED",
        },
      });

      // Create Winner if we have a valid Person
      if (chosenCandidate.personId) {
        await tx.winner.create({
          data: {
            eventId,
            prizeId,
            personId: chosenCandidate.personId,
            drawId: draw.id,
            delivered: false,
          },
        });

        // Mark participant as winner if repeat winners are disabled
        if (!allowRepeatWinners && chosenCandidate.participantId) {
          await tx.eventParticipant.update({
            where: { id: chosenCandidate.participantId },
            data: { isWinner: true },
          });
        }
      }

      // Audit log (using validOperatorUserId inside transaction)
      await tx.auditLog.create({
        data: {
          userId: validOperatorUserId,
          action: "EXECUTE_DRAW",
          entity: "Draw",
          entityId: draw.id,
          details: {
            eventId,
            prizeId,
            prizeName: prize.name,
            winnerPersonId: chosenCandidate.personId,
            winnerName: drawnName,
            drawnNumber,
            totalEligible: eligibleCandidates.length,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      const payload: DrawExecutionResult = {
        drawId: draw.id,
        drawnNumber,
        drawnName,
        drawType,
        timestamp: draw.timestamp,
        winner: {
          personId: chosenCandidate.personId,
          participantId: chosenCandidate.participantId,
          name: chosenCandidate.name,
          ticketNumber: chosenCandidate.ticketNumber,
          registration: chosenCandidate.registration,
          category: chosenCandidate.category,
          email: chosenCandidate.email,
        },
        prize: {
          id: prize.id,
          name: prize.name,
          description: prize.description,
          imageUrl: prize.imageUrl,
          sponsor: prize.sponsor
            ? {
                id: prize.sponsor.id,
                name: prize.sponsor.name,
                logoUrl: prize.sponsor.logoUrl,
              }
            : null,
        },
        totalEligible: eligibleCandidates.length,
      };

      // Save Idempotency Record if key present
      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            eventId,
            result: JSON.stringify(payload),
          },
        });
      }

      return payload;
    });

    return result;
  }

  /**
   * Confirms or updates delivery of a prize to a winner
   */
  public static async deliverPrize(params: {
    winnerId: string;
    eventId?: string;
    delivered?: boolean;
    notes?: string | null;
    operatorUserId?: string | null;
    ipAddress?: string | null;
  }) {
    const { winnerId, eventId, delivered = true, notes, operatorUserId, ipAddress } = params;

    const existing = await prisma.winner.findUnique({
      where: { id: winnerId },
    });

    if (!existing || (eventId && existing.eventId !== eventId)) {
      throw new Error("Registro de premiação não encontrado.");
    }

    let validOperatorUserId: string | null = null;
    if (operatorUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: operatorUserId },
        select: { id: true },
      });
      if (userExists) validOperatorUserId = userExists.id;
    }

    const winner = await prisma.winner.update({
      where: { id: winnerId },
      data: {
        delivered,
        deliveredAt: delivered ? new Date() : null,
        deliveryNotes: notes || null,
        deliveredByUserId: validOperatorUserId,
      },
      include: {
        person: true,
        prize: true,
      },
    });

    await safeAuditLog({
      userId: validOperatorUserId,
      action: delivered ? "PRIZE_DELIVERED" : "PRIZE_DELIVERY_REVOKED",
      entity: "Winner",
      entityId: winner.id,
      details: {
        personName: winner.person.name,
        prizeName: winner.prize.name,
        notes,
      },
      ipAddress,
    });

    return winner;
  }

  /**
   * Lists all executed Draws for an Event
   */
  public static async listEventDraws(eventId: string) {
    return await prisma.draw.findMany({
      where: { eventId },
      orderBy: { timestamp: "desc" },
      include: {
        prize: { include: { sponsor: true } },
        operatorUser: { select: { id: true, name: true, email: true } },
        winners: {
          include: {
            person: true,
            deliveredByUser: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * Lists all Winners for an Event
   */
  public static async listEventWinners(eventId: string) {
    return await prisma.winner.findMany({
      where: { eventId },
      orderBy: { drawDate: "desc" },
      include: {
        person: true,
        prize: { include: { sponsor: true } },
        draw: true,
        deliveredByUser: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Cancels/Invalidates a draw, restores Prize status to AVAILABLE,
   * resets winner status on participant, and optionally disqualifies absent person.
   */
  public static async cancelDraw(params: {
    drawId: string;
    eventId?: string;
    reason?: string;
    disqualifyParticipant?: boolean;
    operatorUserId?: string;
    ipAddress?: string;
  }) {
    const { drawId, eventId, reason, disqualifyParticipant, operatorUserId, ipAddress } = params;

    const draw = await prisma.draw.findUnique({
      where: { id: drawId },
      include: {
        prize: true,
        winners: {
          include: { person: true },
        },
      },
    });

    if (!draw || (eventId && draw.eventId !== eventId)) {
      throw new Error("Sorteio não encontrado.");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete associated winners
      await tx.winner.deleteMany({
        where: { drawId },
      });

      // 2. Delete the draw record
      await tx.draw.delete({
        where: { id: drawId },
      });

      // 3. Check remaining active draws for this prize
      const remainingDraws = await tx.winner.count({
        where: { prizeId: draw.prizeId },
      });

      if (remainingDraws < draw.prize.quantity) {
        await tx.prize.update({
          where: { id: draw.prizeId },
          data: { status: PrizeStatus.AVAILABLE },
        });
      }

      // 4. Reset winner flag on participant if they have no other prizes
      if (draw.winnerPersonId) {
        const otherWins = await tx.winner.count({
          where: {
            personId: draw.winnerPersonId,
            eventId: draw.eventId,
          },
        });

        if (otherWins === 0) {
          await tx.eventParticipant.updateMany({
            where: {
              eventId: draw.eventId,
              personId: draw.winnerPersonId,
            },
            data: { isWinner: false },
          });
        }

        // 5. If disqualifyParticipant is true (person went away / absent), remove presence
        if (disqualifyParticipant) {
          await tx.presence.deleteMany({
            where: {
              eventId: draw.eventId,
              personId: draw.winnerPersonId,
            },
          });

          await tx.eventParticipant.updateMany({
            where: {
              eventId: draw.eventId,
              personId: draw.winnerPersonId,
            },
            data: { isEligible: false },
          });
        }
      }

      // 6. Safe audit log
      await safeAuditLog(
        {
          userId: operatorUserId,
          action: "CANCEL_DRAW",
          entity: "Draw",
          entityId: drawId,
          details: {
            eventId: draw.eventId,
            prizeId: draw.prizeId,
            prizeName: draw.prize.name,
            winnerPersonId: draw.winnerPersonId,
            winnerName: draw.drawnName,
            reason: reason || "Ausente no momento do sorteio",
            disqualified: Boolean(disqualifyParticipant),
          },
          ipAddress,
        },
        tx
      );

      return {
        success: true,
        prizeRestored: true,
        prizeId: draw.prizeId,
        disqualified: Boolean(disqualifyParticipant),
      };
    });
  }
}
