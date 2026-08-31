import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventService } from "@/services/event.service";
import { DrawService } from "@/services/draw.service";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { prisma } from "@/lib/prisma";
import { EventStatus, ParticipantStatus, PresenceMethod, PrizeStatus, DrawType, Prisma } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    eventParticipant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    presence: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    prize: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    draw: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    winner: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    idempotencyRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => (typeof cb === "function" ? cb(prisma) : Promise.all(cb))),
  },
}));

describe("Bateria de Testes Exaustivos - Módulo de Eventos & Sorteios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) =>
      typeof cb === "function" ? cb(prisma) : Promise.all(cb)
    );
  });

  // =========================================================================
  // 1. SLUGIFY & CRIAÇÃO / GESTÃO DE EVENTOS
  // =========================================================================
  describe("1. Gestão e Ciclo de Vida do Evento (EventService)", () => {
    it("deve normalizar e gerar slugs válidos com acentuação e caracteres especiais", () => {
      expect(EventService.slugify("Semana Acadêmica de TI 2026!")).toBe("semana-academica-de-ti-2026");
      expect(EventService.slugify("   Sorteio de Natal & Ano Novo   ")).toBe("sorteio-de-natal-ano-novo");
      expect(EventService.slugify("ENGENHARIA / SAÚDE - UNIFAP")).toBe("engenharia-saude-unifap");
    });

    it("deve criar um evento com tema institucional UniFAP, token de apresentação e slug único", async () => {
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce({ id: "ev-existing" } as any) // primeiro slug já existe
        .mockResolvedValueOnce(null); // segundo slug livre

      const mockCreatedEvent = {
        id: "ev-123",
        name: "Semana Acadêmica de TI",
        slug: "semana-academica-de-ti-1",
        description: "Palestras e sorteios",
        date: new Date("2026-09-10T19:00:00Z"),
        time: "19:00",
        location: "Auditório Central",
        status: EventStatus.OPEN,
        primaryColor: "#002B49",
        secondaryColor: "#EAA023",
        allowRepeatWinners: false,
        maxParticipants: 300,
        presentationToken: "semana-academica-de-ti-1-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.event.create).mockResolvedValue(mockCreatedEvent as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-admin" } as any);

      const event = await EventService.createEvent(
        {
          name: "Semana Acadêmica de TI",
          description: "Palestras e sorteios",
          date: "2026-09-10T19:00:00Z",
          time: "19:00",
          location: "Auditório Central",
          status: EventStatus.OPEN,
          primaryColor: "#002B49",
          secondaryColor: "#EAA023",
          allowRepeatWinners: false,
          maxParticipants: 300,
        },
        "user-admin"
      );

      expect(event.id).toBe("ev-123");
      expect(event.slug).toBe("semana-academica-de-ti-1");
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Semana Acadêmica de TI",
            primaryColor: "#002B49",
            secondaryColor: "#EAA023",
            allowRepeatWinners: false,
            maxParticipants: 300,
          }),
        })
      );
    });

    it("deve bloquear a criação de evento com data no passado", async () => {
      await expect(
        EventService.createEvent(
          {
            name: "Evento no Passado",
            date: "2020-01-01T19:00:00Z",
            time: "19:00",
          },
          "user-admin"
        )
      ).rejects.toThrowError(/Não é permitido agendar eventos para datas passadas/);
    });

    it("deve bloquear a alteração de evento para uma data no passado", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-future",
        name: "Evento Futuro",
        date: new Date("2026-12-01T19:00:00Z"),
        time: "19:00",
      } as any);

      await expect(
        EventService.updateEvent(
          "ev-future",
          {
            date: "2020-05-10T19:00:00Z",
          },
          "user-admin"
        )
      ).rejects.toThrowError(/Não é permitido alterar evento para datas passadas/);
    });

    it("deve obter detalhes do evento com agregações de presenças biométricas vs manuais", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-123",
        name: "Semana Acadêmica",
        _count: {
          participants: 150,
          presences: 120,
          prizes: 5,
          draws: 2,
          winners: 2,
        },
      } as any);

      vi.mocked(prisma.presence.count)
        .mockResolvedValueOnce(95) // Biometria Facial
        .mockResolvedValueOnce(25); // Manual

      const result = await EventService.getEventById("ev-123");

      expect(result).not.toBeNull();
      expect(result?.stats.participantsCount).toBe(150);
      expect(result?.stats.presencesTotal).toBe(120);
      expect(result?.stats.presencesFace).toBe(95);
      expect(result?.stats.presencesManual).toBe(25);
      expect(result?.stats.prizesCount).toBe(5);
    });

    it("deve listar eventos com filtros de status e busca textual com paginação", async () => {
      vi.mocked(prisma.event.count).mockResolvedValue(1);
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        {
          id: "ev-1",
          name: "Congresso de Engenharia",
          slug: "congresso-engenharia",
          status: EventStatus.OPEN,
          _count: { participants: 80, presences: 60, prizes: 3, draws: 1, winners: 1 },
        } as any,
      ]);

      const res = await EventService.listEvents({
        status: EventStatus.OPEN,
        query: "Engenharia",
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.items[0].name).toBe("Congresso de Engenharia");
      expect(res.items[0].participantsCount).toBe(80);
      expect(res.totalPages).toBe(1);
    });

    it("deve atualizar configurações do evento e regras de sorteio", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "ev-1" } as any);
      vi.mocked(prisma.event.update).mockResolvedValue({
        id: "ev-1",
        name: "Semana de TI Atualizada",
        allowRepeatWinners: true,
      } as any);

      const updated = await EventService.updateEvent("ev-1", {
        name: "Semana de TI Atualizada",
        allowRepeatWinners: true,
      });

      expect(updated.name).toBe("Semana de TI Atualizada");
      expect(updated.allowRepeatWinners).toBe(true);
    });
  });

  // =========================================================================
  // 2. INSCRIÇÃO & GESTÃO DE PARTICIPANTES
  // =========================================================================
  describe("2. Inscrições de Participantes (EventService)", () => {
    it("deve inscrever um participante com geração de ticket sequencial", async () => {
      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.eventParticipant.findFirst).mockResolvedValue({ ticketNumber: 42 } as any);
      vi.mocked(prisma.eventParticipant.create).mockResolvedValue({
        id: "part-1",
        eventId: "ev-1",
        personId: "p-100",
        ticketNumber: 43,
        category: "Aluno",
        status: ParticipantStatus.ACTIVE,
        isEligible: true,
        person: {
          id: "p-100",
          name: "Carlos Silva",
          faceEmbeddings: [{ id: "emb-1" }],
        },
      } as any);

      const participant = await EventService.addParticipant("ev-1", "p-100", "Aluno");

      expect(participant.ticketNumber).toBe(43);
      expect(participant.hasFaceEnrolled).toBe(true);
      expect(prisma.eventParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: "ev-1",
            personId: "p-100",
            ticketNumber: 43,
          }),
        })
      );
    });

    it("deve rejeitar inscrição duplicada da mesma pessoa no mesmo evento", async () => {
      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({ id: "part-existente" } as any);

      await expect(EventService.addParticipant("ev-1", "p-100")).rejects.toThrow(
        "Esta pessoa já está inscrita neste evento."
      );
    });

    it("deve realizar inscrição em lote por categoria ignorando pessoas já inscritas", async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: "p-1", name: "Lucas", category: "Aluno" },
        { id: "p-2", name: "Mariana", category: "Aluno" },
        { id: "p-3", name: "Felipe", category: "Aluno" },
      ] as any);

      vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
        { personId: "p-1" } as any, // p-1 já inscrito
      ]);

      vi.mocked(prisma.eventParticipant.findFirst).mockResolvedValue({ ticketNumber: 10 } as any);
      vi.mocked(prisma.eventParticipant.createMany).mockResolvedValue({ count: 2 } as any);

      const result = await EventService.enrollByCategory({
        eventId: "ev-1",
        categories: ["Aluno"],
      });

      expect(result.totalFound).toBe(3);
      expect(result.enrolledCount).toBe(2);
      expect(result.alreadyEnrolledCount).toBe(1);
      expect(prisma.eventParticipant.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ personId: "p-2", ticketNumber: 11 }),
            expect.objectContaining({ personId: "p-3", ticketNumber: 12 }),
          ]),
        })
      );
    });

    it("deve listar participantes com status de presença e biometria vinculados", async () => {
      vi.mocked(prisma.eventParticipant.count).mockResolvedValue(1);
      vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
        {
          id: "part-1",
          eventId: "ev-1",
          personId: "p-1",
          ticketNumber: 1,
          category: "Aluno",
          status: ParticipantStatus.ACTIVE,
          isEligible: true,
          isWinner: false,
          registeredAt: new Date(),
          person: {
            name: "Rivaldo Mascarenhas",
            cpf: "12345678900",
            registration: "486519",
            email: "rivaldo@unifap.br",
            faceEmbeddings: [{ id: "emb-1" }],
            presences: [
              {
                id: "pres-1",
                method: PresenceMethod.FACE,
                confidence: 0.96,
                capturedAt: new Date(),
              },
            ],
          },
        } as any,
      ]);

      const list = await EventService.listEventParticipants("ev-1", {
        hasPresence: true,
        hasFace: true,
      });

      expect(list.items.length).toBe(1);
      expect(list.items[0].hasPresence).toBe(true);
      expect(list.items[0].hasFaceEnrolled).toBe(true);
      expect(list.items[0].presenceMethod).toBe(PresenceMethod.FACE);
      expect(list.items[0].registration).toBe("486519");
    });

    it("deve remover participante do evento e limpar registros de presença associados", async () => {
      const mockTx = {
        presence: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        eventParticipant: {
          delete: vi.fn().mockResolvedValue({
            id: "part-1",
            eventId: "ev-1",
            personId: "p-1",
            person: { name: "Rivaldo Mascarenhas" },
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return await cb(mockTx);
      });

      const deleted = await EventService.removeParticipant("ev-1", "p-1", "user-admin");

      expect(deleted.id).toBe("part-1");
      expect(mockTx.presence.deleteMany).toHaveBeenCalledWith({
        where: { eventId: "ev-1", personId: "p-1" },
      });
      expect(mockTx.eventParticipant.delete).toHaveBeenCalledWith({
        where: { eventId_personId: { eventId: "ev-1", personId: "p-1" } },
        include: { person: true },
      });
    });
  });

  // =========================================================================
  // 3. CHECK-IN & REGISTRO DE PRESENÇAS E JANELA DE AGENDAMENTO
  // =========================================================================
  describe("3. Confirmação de Presença e Check-in (EventService)", () => {
    it("deve validar corretamente a regra de liberação de horário (isCheckinAllowed)", () => {
      // 1. Rascunho / Cancelado / Finalizado
      expect(EventService.isCheckinAllowed({ status: EventStatus.DRAFT }).isAllowed).toBe(false);
      expect(EventService.isCheckinAllowed({ status: EventStatus.CANCELLED }).isAllowed).toBe(false);
      expect(EventService.isCheckinAllowed({ status: EventStatus.COMPLETED }).isAllowed).toBe(false);

      // 2. Aberto / Em Andamento (liberação imediata)
      expect(EventService.isCheckinAllowed({ status: EventStatus.OPEN }).isAllowed).toBe(true);
      expect(EventService.isCheckinAllowed({ status: EventStatus.IN_PROGRESS }).isAllowed).toBe(true);

      // 3. Agendado (PUBLISHED) - Futuro (fora da janela de 1h)
      const futureDate = new Date(Date.now() + 5 * 3600 * 1000); // Daqui a 5 horas
      const futureRes = EventService.isCheckinAllowed({
        status: EventStatus.PUBLISHED,
        date: futureDate,
        time: `${String(futureDate.getHours()).padStart(2, "0")}:${String(futureDate.getMinutes()).padStart(2, "0")}`,
        checkinOpenMinutesBefore: 60,
      });
      expect(futureRes.isAllowed).toBe(false);
      expect(futureRes.reason).toBe("CHECKIN_NOT_OPEN_YET");

      // 4. Agendado (PUBLISHED) - Dentro da janela de 1h (ex: daqui a 30 min)
      const nearFuture = new Date(Date.now() + 30 * 60 * 1000); // Daqui a 30 min
      const nearRes = EventService.isCheckinAllowed({
        status: EventStatus.PUBLISHED,
        date: nearFuture,
        time: `${String(nearFuture.getHours()).padStart(2, "0")}:${String(nearFuture.getMinutes()).padStart(2, "0")}`,
        checkinOpenMinutesBefore: 60,
      });
      expect(nearRes.isAllowed).toBe(true);
    });

    it("deve registrar presença manual com sucesso para participante inscrito quando o evento estiver liberado", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: EventStatus.OPEN,
      } as any);

      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({
        id: "part-1",
        person: { id: "p-1", name: "Fernanda Costa" },
      } as any);

      vi.mocked(prisma.presence.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.presence.create).mockResolvedValue({
        id: "pres-10",
        eventId: "ev-1",
        personId: "p-1",
        method: PresenceMethod.MANUAL,
        status: "REGISTERED",
      } as any);

      const res = await EventService.registerManualPresence("ev-1", "p-1");

      expect(res.success).toBe(true);
      expect(res.alreadyRegistered).toBe(false);
      expect(prisma.presence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: "ev-1",
            personId: "p-1",
            method: PresenceMethod.MANUAL,
          }),
        })
      );
    });

    it("deve retornar confirmação idempotente se presença já foi registrada anteriormente", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: EventStatus.OPEN,
      } as any);

      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({
        id: "part-1",
        person: { id: "p-1", name: "Fernanda Costa" },
      } as any);

      vi.mocked(prisma.presence.findUnique).mockResolvedValue({
        id: "pres-existing",
        method: PresenceMethod.FACE,
      } as any);

      const res = await EventService.registerManualPresence("ev-1", "p-1");

      expect(res.success).toBe(true);
      expect(res.alreadyRegistered).toBe(true);
      expect(prisma.presence.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar presença de pessoa não inscrita no evento", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: EventStatus.OPEN,
      } as any);

      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue(null);

      await expect(EventService.registerManualPresence("ev-1", "p-unregistered")).rejects.toThrow(
        "Esta pessoa não está inscrita neste evento."
      );
    });
  });

  // =========================================================================
  // 4. GESTÃO DE PRÊMIOS E PATROCINADORES
  // =========================================================================
  describe("4. Prêmios & Patrocinadores (EventService)", () => {
    it("deve cadastrar prêmio com valor estimado, quantidade e patrocinador associado", async () => {
      const mockPrize = {
        id: "prz-1",
        eventId: "ev-1",
        sponsorId: "spon-1",
        name: "Kindle Paperwhite 16GB",
        description: "Leitor digital com iluminação embutida",
        quantity: 1,
        estimatedValue: new Prisma.Decimal("799.90"),
        order: 1,
        status: PrizeStatus.AVAILABLE,
        sponsor: { id: "spon-1", name: "Editora Universitária" },
      };

      vi.mocked(prisma.prize.create).mockResolvedValue(mockPrize as any);

      const prize = await EventService.createPrize({
        eventId: "ev-1",
        sponsorId: "spon-1",
        name: "Kindle Paperwhite 16GB",
        description: "Leitor digital com iluminação embutida",
        quantity: 1,
        estimatedValue: 799.9,
        order: 1,
        status: PrizeStatus.AVAILABLE,
      });

      expect(prize.name).toBe("Kindle Paperwhite 16GB");
      expect(prize.status).toBe(PrizeStatus.AVAILABLE);
      expect(prisma.prize.create).toHaveBeenCalled();
    });

    it("deve listar prêmios ordenados pela ordem de exibição com status e ganhadores", async () => {
      vi.mocked(prisma.prize.findMany).mockResolvedValue([
        { id: "prz-1", name: "Fone Bluetooth", order: 1, winners: [] },
        { id: "prz-2", name: "Notebook Core i7", order: 2, winners: [] },
      ] as any);

      const prizes = await EventService.getPrizes("ev-1");

      expect(prizes.length).toBe(2);
      expect(prizes[0].name).toBe("Fone Bluetooth");
      expect(prizes[1].name).toBe("Notebook Core i7");
    });

    it("deve atualizar e excluir prêmios disponíveis", async () => {
      vi.mocked(prisma.prize.update).mockResolvedValue({ id: "prz-1", name: "Fone Atualizado" } as any);
      vi.mocked(prisma.prize.delete).mockResolvedValue({ id: "prz-1", name: "Fone", eventId: "ev-1" } as any);

      const updated = await EventService.updatePrize("prz-1", { name: "Fone Atualizado" });
      expect(updated.name).toBe("Fone Atualizado");

      const deleted = await EventService.deletePrize("prz-1");
      expect(deleted.id).toBe("prz-1");
    });
  });

  // =========================================================================
  // 5. MOTOR DE SORTEIOS & REGRAS DE ELEGIBILIDADE
  // =========================================================================
  describe("5. Motor de Sorteios & Regras de Elegibilidade (DrawService & DrawEligibilityService)", () => {
    it("deve filtrar participantes elegíveis considerando PRESENÇA OBRIGATÓRIA e REGRA DE NÃO REPETIÇÃO", async () => {
      // Evento com allowRepeatWinners: false
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        allowRepeatWinners: false,
      } as any);

      // Participantes com presenças
      vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
        {
          id: "part-1",
          personId: "p-presente-1",
          ticketNumber: 101,
          category: "Aluno",
          isWinner: false,
          person: {
            id: "p-presente-1",
            name: "Gabriel",
            registration: "1001",
            email: "g@unifap.br",
            active: true,
            presences: [{ method: PresenceMethod.FACE, status: "REGISTERED" }],
          },
        },
      ] as any);

      const eligible = await DrawEligibilityService.getEligibleParticipants({
        eventId: "ev-1",
        requirePresence: true,
      });

      expect(eligible.length).toBe(1);
      expect(eligible[0].name).toBe("Gabriel");
      expect(eligible[0].ticketNumber).toBe(101);
    });

    it("deve PERMITIR que ganhadores anteriores concorram quando allowRepeatWinners = true", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        allowRepeatWinners: true,
      } as any);

      vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
        {
          id: "part-1",
          personId: "p-1",
          ticketNumber: 101,
          category: "Aluno",
          isWinner: false,
          person: {
            id: "p-1",
            name: "Gabriel",
            registration: "1001",
            active: true,
            presences: [{ method: PresenceMethod.FACE, status: "REGISTERED" }],
          },
        },
        {
          id: "part-2",
          personId: "p-2",
          ticketNumber: 102,
          category: "Aluno",
          isWinner: true,
          person: {
            id: "p-2",
            name: "Julia",
            registration: "1002",
            active: true,
            presences: [{ method: PresenceMethod.MANUAL, status: "REGISTERED" }],
          },
        },
      ] as any);

      const eligible = await DrawEligibilityService.getEligibleParticipants({
        eventId: "ev-1",
        allowRepeatWinners: true,
      });

      expect(eligible.length).toBe(2);
    });

    it("deve executar sorteio atômico, travar o prêmio e registrar o ganhador com segurança", async () => {
      vi.mocked(prisma.idempotencyRecord.findUnique).mockResolvedValue(null);

      const eligibilitySpy = vi.spyOn(DrawEligibilityService, "getEligibleParticipants").mockResolvedValue([
        {
          personId: "p-vencedor",
          participantId: "part-vencedor",
          ticketNumber: 777,
          name: "Vencedor do Prêmio",
          registration: "486519",
          category: "Professor",
          email: "vencedor@unifap.br",
        },
      ]);

      const mockTx = {
        prize: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: "prz-10",
            name: "Echo Dot 5ª Geração",
            description: "Smart speaker Alexa",
            sponsor: { name: "Departamento de TI" },
          }),
        },
        draw: {
          create: vi.fn().mockResolvedValue({ id: "draw-final", timestamp: new Date() }),
        },
        winner: {
          create: vi.fn().mockResolvedValue({ id: "winner-rec-1" }),
        },
        eventParticipant: {
          update: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
        idempotencyRecord: {
          create: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return await cb(mockTx);
      });

      const result = await DrawService.executeDraw({
        eventId: "ev-1",
        prizeId: "prz-10",
        drawType: DrawType.PERSON,
      });

      expect(result.drawnName).toBe("Vencedor do Prêmio");
      expect(result.drawnNumber).toBe(777);
      expect(mockTx.prize.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prz-10", eventId: "ev-1", status: PrizeStatus.AVAILABLE },
          data: { status: PrizeStatus.DRAWN },
        })
      );
      expect(mockTx.winner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            personId: "p-vencedor",
            prizeId: "prz-10",
            eventId: "ev-1",
          }),
        })
      );
      expect(mockTx.eventParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "part-vencedor" },
          data: { isWinner: true },
        })
      );

      eligibilitySpy.mockRestore();
    });

    it("deve lançar erro ao tentar sortear sem participantes presentes ou elegíveis", async () => {
      vi.mocked(prisma.idempotencyRecord.findUnique).mockResolvedValue(null);
      const eligibilitySpy = vi.spyOn(DrawEligibilityService, "getEligibleParticipants").mockResolvedValue([]);

      await expect(
        DrawService.executeDraw({
          eventId: "ev-1",
          prizeId: "prz-1",
        })
      ).rejects.toThrow("Nenhum participante elegível encontrado");

      eligibilitySpy.mockRestore();
    });
  });
});
