import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import { CreateEventInput, UpdateEventInput } from "@/schemas/event.schema";
import { CreatePrizeInput, UpdatePrizeInput } from "@/schemas/prize.schema";
import { EventStatus, ParticipantStatus, PresenceMethod, PrizeStatus, Prisma } from "@prisma/client";

export class EventService {
  /**
   * Generates a URL-friendly slug from string
   */
  public static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  }

  /**
   * Creates a new Event
   */
  public static async createEvent(
    data: CreateEventInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    let slug = data.slug || this.slugify(data.name);

    // Ensure unique slug
    let counter = 1;
    let finalSlug = slug;
    while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const event = await prisma.event.create({
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description || null,
        date: data.date ? new Date(data.date) : null,
        time: data.time || null,
        location: data.location || null,
        logoUrl: data.logoUrl || null,
        coverUrl: data.coverUrl || null,
        status: data.status || EventStatus.DRAFT,
        primaryColor: data.primaryColor || "#002B49",
        secondaryColor: data.secondaryColor || "#EAA023",
        allowRepeatWinners: data.allowRepeatWinners ?? false,
        maxParticipants: data.maxParticipants || null,
        presentationToken: `${finalSlug}-${Date.now().toString(36)}`,
      },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "CREATE_EVENT",
      entity: "Event",
      entityId: event.id,
      details: { name: event.name, slug: event.slug },
      ipAddress,
    });

    return event;
  }

  /**
   * Updates an existing Event
   */
  public static async updateEvent(
    id: string,
    data: UpdateEventInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Evento não encontrado.");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description !== undefined ? data.description : undefined,
        date: data.date !== undefined ? (data.date ? new Date(data.date) : null) : undefined,
        time: data.time !== undefined ? data.time : undefined,
        location: data.location !== undefined ? data.location : undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
        coverUrl: data.coverUrl !== undefined ? data.coverUrl : undefined,
        status: data.status ?? undefined,
        primaryColor: data.primaryColor ?? undefined,
        secondaryColor: data.secondaryColor ?? undefined,
        allowRepeatWinners: data.allowRepeatWinners ?? undefined,
        maxParticipants: data.maxParticipants !== undefined ? data.maxParticipants : undefined,
      },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "UPDATE_EVENT",
      entity: "Event",
      entityId: updated.id,
      details: { diff: data },
      ipAddress,
    });

    return updated;
  }

  /**
   * Retrieves an Event by ID with full summary counts
   */
  public static async getEventById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        theme: true,
        soundConfig: true,
        _count: {
          select: {
            participants: true,
            presences: true,
            prizes: true,
            draws: true,
            winners: true,
          },
        },
      },
    });

    if (!event) return null;

    // Presences breakdown (Face vs Manual)
    const [faceCount, manualCount] = await Promise.all([
      prisma.presence.count({ where: { eventId: id, method: PresenceMethod.FACE } }),
      prisma.presence.count({ where: { eventId: id, method: PresenceMethod.MANUAL } }),
    ]);

    return {
      ...event,
      stats: {
        participantsCount: event._count.participants,
        presencesTotal: event._count.presences,
        presencesFace: faceCount,
        presencesManual: manualCount,
        prizesCount: event._count.prizes,
        drawsCount: event._count.draws,
        winnersCount: event._count.winners,
      },
    };
  }

  /**
   * Lists Events with filters and pagination
   */
  public static async listEvents(params: {
    status?: EventStatus;
    query?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.query) {
      const q = params.query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              participants: true,
              presences: true,
              prizes: true,
              draws: true,
              winners: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        description: e.description,
        date: e.date,
        time: e.time,
        location: e.location,
        logoUrl: e.logoUrl,
        coverUrl: e.coverUrl,
        status: e.status,
        primaryColor: e.primaryColor,
        secondaryColor: e.secondaryColor,
        allowRepeatWinners: e.allowRepeatWinners,
        maxParticipants: e.maxParticipants,
        presentationToken: e.presentationToken,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        participantsCount: e._count.participants,
        presencesCount: e._count.presences,
        prizesCount: e._count.prizes,
        drawsCount: e._count.draws,
        winnersCount: e._count.winners,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Adds or links a Person to an Event as a Participant
   */
  public static async addParticipant(
    eventId: string,
    personId: string,
    category?: string | null,
    ticketNumber?: number,
    operatorUserId?: string
  ) {
    // Check if already in event
    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_personId: { eventId, personId },
      },
    });

    if (existing) {
      throw new Error("Esta pessoa já está inscrita neste evento.");
    }

    // Allocate next ticket number if not provided
    let nextTicket = ticketNumber;
    if (!nextTicket) {
      const highest = await prisma.eventParticipant.findFirst({
        where: { eventId },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });
      nextTicket = (highest?.ticketNumber || 0) + 1;
    }

    const participant = await prisma.eventParticipant.create({
      data: {
        eventId,
        personId,
        ticketNumber: nextTicket,
        category: category || null,
        status: ParticipantStatus.ACTIVE,
        isEligible: true,
      },
      include: {
        person: {
          include: {
            faceEmbeddings: {
              where: { active: true },
              select: { id: true },
            },
          },
        },
      },
    });

    return {
      ...participant,
      hasFaceEnrolled: participant.person.faceEmbeddings.length > 0,
    };
  }

  /**
   * Enrolls people into an event by Categories with optional biometric requirement
   */
  public static async enrollByCategory(params: {
    eventId: string;
    categories: string[];
    requireBiometricsOnly?: boolean;
    operatorUserId?: string;
  }) {
    const { eventId, categories, requireBiometricsOnly, operatorUserId } = params;

    // 1. Fetch people matching the categories
    const people = await prisma.person.findMany({
      where: {
        active: true,
        ...(categories.length > 0 ? { category: { in: categories } } : {}),
        ...(requireBiometricsOnly
          ? {
              faceEmbeddings: {
                some: { active: true },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    if (people.length === 0) {
      return {
        totalFound: 0,
        enrolledCount: 0,
        alreadyEnrolledCount: 0,
      };
    }

    // 2. Fetch already enrolled in this event
    const alreadyEnrolled = await prisma.eventParticipant.findMany({
      where: {
        eventId,
        personId: { in: people.map((p) => p.id) },
      },
      select: { personId: true },
    });

    const enrolledSet = new Set(alreadyEnrolled.map((a) => a.personId));
    const toEnroll = people.filter((p) => !enrolledSet.has(p.id));

    if (toEnroll.length === 0) {
      return {
        totalFound: people.length,
        enrolledCount: 0,
        alreadyEnrolledCount: people.length,
      };
    }

    // 3. Get highest ticket number
    const highest = await prisma.eventParticipant.findFirst({
      where: { eventId },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    let nextTicket = (highest?.ticketNumber || 0) + 1;

    // 4. Batch create EventParticipants
    const records = toEnroll.map((p) => ({
      eventId,
      personId: p.id,
      ticketNumber: nextTicket++,
      category: p.category || null,
      status: ParticipantStatus.ACTIVE,
      isEligible: true,
    }));

    await prisma.eventParticipant.createMany({
      data: records,
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "BATCH_ENROLL_BY_CATEGORY",
      entity: "Event",
      entityId: eventId,
      details: {
        categories,
        requireBiometricsOnly,
        enrolledCount: toEnroll.length,
        alreadyEnrolledCount: alreadyEnrolled.length,
      },
    });

    return {
      totalFound: people.length,
      enrolledCount: toEnroll.length,
      alreadyEnrolledCount: alreadyEnrolled.length,
    };
  }

  /**
   * Enrolls specific person IDs into an event in batch
   */
  public static async enrollBatch(params: {
    eventId: string;
    personIds: string[];
    operatorUserId?: string;
  }) {
    const { eventId, personIds, operatorUserId } = params;

    const people = await prisma.person.findMany({
      where: {
        id: { in: personIds },
        active: true,
      },
      select: { id: true, category: true },
    });

    const alreadyEnrolled = await prisma.eventParticipant.findMany({
      where: {
        eventId,
        personId: { in: personIds },
      },
      select: { personId: true },
    });

    const enrolledSet = new Set(alreadyEnrolled.map((a) => a.personId));
    const toEnroll = people.filter((p) => !enrolledSet.has(p.id));

    if (toEnroll.length === 0) {
      return {
        enrolledCount: 0,
        alreadyEnrolledCount: alreadyEnrolled.length,
      };
    }

    const highest = await prisma.eventParticipant.findFirst({
      where: { eventId },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    let nextTicket = (highest?.ticketNumber || 0) + 1;

    const records = toEnroll.map((p) => ({
      eventId,
      personId: p.id,
      ticketNumber: nextTicket++,
      category: p.category || null,
      status: ParticipantStatus.ACTIVE,
      isEligible: true,
    }));

    await prisma.eventParticipant.createMany({
      data: records,
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "BATCH_ENROLL_PERSONS",
      entity: "Event",
      entityId: eventId,
      details: {
        personIdsCount: personIds.length,
        enrolledCount: toEnroll.length,
      },
    });

    return {
      enrolledCount: toEnroll.length,
      alreadyEnrolledCount: alreadyEnrolled.length,
    };
  }

  /**
   * Removes participant from event
   */
  public static async removeParticipant(
    eventId: string,
    personId: string,
    operatorUserId?: string
  ) {
    return await prisma.eventParticipant.delete({
      where: {
        eventId_personId: { eventId, personId },
      },
    });
  }

  /**
   * Lists Participants of an Event with attendance and biometric info
   */
  public static async listEventParticipants(
    eventId: string,
    params: {
      query?: string;
      isEligible?: boolean;
      hasPresence?: boolean;
      hasFace?: boolean;
      category?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.EventParticipantWhereInput = {
      eventId,
    };

    if (params.isEligible !== undefined) {
      where.isEligible = params.isEligible;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.query) {
      const q = params.query.trim();
      where.person = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { registration: { contains: q, mode: "insensitive" } },
          { cpf: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      prisma.eventParticipant.count({ where }),
      prisma.eventParticipant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ticketNumber: "asc" },
        include: {
          person: {
            include: {
              faceEmbeddings: {
                where: { active: true },
                select: { id: true, updatedAt: true },
              },
              presences: {
                where: { eventId },
                select: { id: true, method: true, confidence: true, capturedAt: true },
              },
            },
          },
        },
      }),
    ]);

    const formatted = items.map((p) => {
      const presence = p.person.presences[0] || null;
      return {
        id: p.id,
        eventId: p.eventId,
        personId: p.personId,
        name: p.person.name,
        cpf: p.person.cpf,
        registration: p.person.registration,
        email: p.person.email,
        phone: p.person.phone,
        ticketNumber: p.ticketNumber,
        category: p.category || p.person.category,
        status: p.status,
        isEligible: p.isEligible,
        isWinner: p.isWinner,
        registeredAt: p.registeredAt,
        hasFaceEnrolled: p.person.faceEmbeddings.length > 0,
        hasPresence: !!presence,
        presenceMethod: presence?.method || null,
        presenceConfidence: presence?.confidence || null,
        presenceCapturedAt: presence?.capturedAt || null,
      };
    });

    let filtered = formatted;
    if (params.hasPresence !== undefined) {
      filtered = filtered.filter((x) => x.hasPresence === params.hasPresence);
    }
    if (params.hasFace !== undefined) {
      filtered = filtered.filter((x) => x.hasFaceEnrolled === params.hasFace);
    }

    return {
      items: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Registers a manual attendance presence for a participant
   */
  public static async registerManualPresence(
    eventId: string,
    personId: string,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    // 1. Check if person is participant in this event
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_personId: { eventId, personId } },
      include: { person: true },
    });

    if (!participant) {
      throw new Error("Esta pessoa não está inscrita neste evento.");
    }

    // 2. Check if already present
    const existing = await prisma.presence.findUnique({
      where: { eventId_personId: { eventId, personId } },
    });

    if (existing) {
      return {
        success: true,
        alreadyRegistered: true,
        message: "Presença já confirmada anteriormente.",
        presence: existing,
      };
    }

    // Validate operatorUserId to prevent Foreign Key constraint error if session is stale
    let validOperatorUserId: string | null = null;
    if (operatorUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: operatorUserId },
        select: { id: true },
      });
      if (userExists) validOperatorUserId = userExists.id;
    }

    const presence = await prisma.presence.create({
      data: {
        eventId,
        personId,
        method: PresenceMethod.MANUAL,
        operatorUserId: validOperatorUserId,
        status: "REGISTERED",
      },
      include: {
        person: true,
      },
    });

    await safeAuditLog({
      userId: validOperatorUserId,
      action: "PRESENCE_REGISTERED_MANUAL",
      entity: "Presence",
      entityId: presence.id,
      details: { eventId, personId, personName: participant.person.name },
      ipAddress,
    });

    return {
      success: true,
      alreadyRegistered: false,
      message: "Presença manual registrada com sucesso!",
      presence,
    };
  }

  /**
   * PRIZES: Lists prizes for an Event
   */
  public static async getPrizes(eventId: string) {
    return await prisma.prize.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      include: {
        sponsor: true,
        winners: {
          include: {
            person: {
              select: { id: true, name: true, registration: true, email: true },
            },
          },
        },
      },
    });
  }

  /**
   * PRIZES: Creates a new Prize
   */
  public static async createPrize(
    data: CreatePrizeInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    const prize = await prisma.prize.create({
      data: {
        eventId: data.eventId,
        sponsorId: data.sponsorId || null,
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        quantity: data.quantity || 1,
        estimatedValue: data.estimatedValue !== undefined && data.estimatedValue !== null ? new Prisma.Decimal(data.estimatedValue) : null,
        order: data.order || 0,
        status: data.status || PrizeStatus.AVAILABLE,
      },
      include: { sponsor: true },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "CREATE_PRIZE",
      entity: "Prize",
      entityId: prize.id,
      details: { eventId: data.eventId, name: prize.name, quantity: prize.quantity },
      ipAddress,
    });

    return prize;
  }

  /**
   * PRIZES: Updates an existing Prize
   */
  public static async updatePrize(
    id: string,
    data: UpdatePrizeInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    const prize = await prisma.prize.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description !== undefined ? data.description : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        quantity: data.quantity ?? undefined,
        estimatedValue: data.estimatedValue !== undefined ? (data.estimatedValue !== null ? new Prisma.Decimal(data.estimatedValue) : null) : undefined,
        order: data.order ?? undefined,
        status: data.status ?? undefined,
        sponsorId: data.sponsorId !== undefined ? data.sponsorId : undefined,
      },
      include: { sponsor: true },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "UPDATE_PRIZE",
      entity: "Prize",
      entityId: id,
      details: { diff: data },
      ipAddress,
    });

    return prize;
  }

  /**
   * PRIZES: Deletes a prize
   */
  public static async deletePrize(id: string, operatorUserId?: string, ipAddress?: string) {
    const prize = await prisma.prize.delete({ where: { id } });

    await safeAuditLog({
      userId: operatorUserId,
      action: "DELETE_PRIZE",
      entity: "Prize",
      entityId: id,
      details: { name: prize.name, eventId: prize.eventId },
      ipAddress,
    });

    return prize;
  }
}
