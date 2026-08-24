import { prisma } from "@/lib/prisma";
import { 
  RequestStatus, 
  RequestOrigin, 
  Shift, 
  Role,
  AssetStatus,
  ResourceType,
  RequestPriority,
  TaskType,
  ReservationStatus,
  Prisma
} from "@prisma/client";
import { 
  RequestCreateInput, 
  RequestUpdateInput, 
  RequestLegacyConfirmInput,
  RequestTaskCreateInput
} from "@/schemas/request.schema";
import { ShiftService } from "@/services/shift.service";
import { RequestWorkflowService } from "@/services/request-workflow.service";
import { getSystemNow, formatTimeInTimezone } from "@/lib/utils";

export class RequestService {
  /**
   * Converte uma string de data (YYYY-MM-DD) ou Date para o início do dia local
   */
  static normalizeDate(dateInput: string | Date): { startOfDay: Date; endOfDay: Date } {
    let d: Date;
    if (typeof dateInput === "string") {
      if (dateInput.includes("T")) {
        d = new Date(dateInput);
      } else {
        const [year, month, day] = dateInput.split("-").map((v) => parseInt(v, 10));
        d = new Date(year, month - 1, day);
      }
    } else {
      d = dateInput;
    }

    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }

  /**
   * Lista solicitações com múltiplos filtros
   */
  static async getRequests(params?: {
    date?: string | Date;
    shift?: Shift;
    status?: RequestStatus;
    roomId?: string;
    assignedUserId?: string;
    needsReview?: boolean;
    origin?: RequestOrigin;
    search?: string;
  }) {
    const {
      date,
      shift,
      status,
      roomId,
      assignedUserId,
      needsReview,
      origin,
      search,
    } = params || {};

    const where: Prisma.RequestWhereInput = {};

    if (date) {
      const { startOfDay, endOfDay } = this.normalizeDate(date);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (shift) where.shift = shift;
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (needsReview !== undefined) where.needsReview = needsReview;
    if (origin) where.origin = origin;

    if (search) {
      where.OR = [
        { professorName: { contains: search, mode: "insensitive" } },
        { discipline: { contains: search, mode: "insensitive" } },
        { room: { name: { contains: search, mode: "insensitive" } } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    return await prisma.request.findMany({
      where,
      include: {
        room: true,
        assignedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            item: true,
            asset: {
              include: { item: true },
            },
          },
        },
        tasks: {
          orderBy: { orderIndex: "asc" },
        },
        reservations: true,
        series: true,
      },
      orderBy: [{ startTime: "asc" }],
    });
  }

  /**
   * Retorna os atendimentos de uma data organizados por Turno (Manhã / Tarde / Noite)
   */
  static async getRequestsByShift(targetDate: string | Date = new Date()) {
    const { startOfDay, endOfDay } = this.normalizeDate(targetDate);
    const configs = await ShiftService.getShiftConfigs();
    const currentShift = await ShiftService.getCurrentShift();

    const allRequests = await prisma.request.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        room: {
          include: {
            fixedEquipment: true,
          },
        },
        assignedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            item: true,
            asset: {
              include: { item: true },
            },
          },
        },
        tasks: {
          orderBy: { orderIndex: "asc" },
        },
        reservations: true,
      },
      orderBy: [{ startTime: "asc" }],
    });

    const buildShiftSummary = (shift: Shift) => {
      const shiftConfig = configs.find((c) => c.shift === shift) || {
        shift,
        startTime: shift === Shift.MORNING ? "07:00" : shift === Shift.AFTERNOON ? "12:00" : "18:00",
        endTime: shift === Shift.MORNING ? "12:00" : shift === Shift.AFTERNOON ? "18:00" : "22:30",
        label: shift === Shift.MORNING ? "Manhã" : shift === Shift.AFTERNOON ? "Tarde" : "Noite",
        emoji: shift === Shift.MORNING ? "🌅" : shift === Shift.AFTERNOON ? "☀️" : "🌙",
        orderIndex: shift === Shift.MORNING ? 1 : shift === Shift.AFTERNOON ? 2 : 3,
      };

      const requestsInShift = allRequests.filter((r) => {
        const calculatedShift = ShiftService.getShiftFromTime(r.startTime, configs);
        return calculatedShift === shift;
      });
      const total = requestsInShift.length;
      const preparados = requestsInShift.filter((r) => r.status === RequestStatus.PREPARADO).length;
      const emAtendimento = requestsInShift.filter((r) => r.status === RequestStatus.EM_ATENDIMENTO).length;
      const pendentes = requestsInShift.filter((r) => r.status === RequestStatus.AGENDADO || r.status === RequestStatus.EM_PREPARACAO).length;
      const problemas = requestsInShift.filter((r) => r.status === RequestStatus.PROBLEMA).length;
      const finalizados = requestsInShift.filter((r) => r.status === RequestStatus.FINALIZADO).length;
      const cancelados = requestsInShift.filter((r) => r.status === RequestStatus.CANCELADO).length;
      const pendingReviewCount = requestsInShift.filter((r) => r.needsReview).length;

      return {
        config: shiftConfig,
        stats: {
          total,
          preparados,
          emAtendimento,
          pendentes,
          problemas,
          finalizados,
          cancelados,
          pendingReviewCount,
        },
        requests: requestsInShift,
      };
    };

    const now = new Date();
    const upcomingRequests = allRequests.filter(
      (r) =>
        r.status !== RequestStatus.FINALIZADO &&
        r.status !== RequestStatus.CANCELADO &&
        new Date(r.endTime) >= now
    );
    const nextRequest = upcomingRequests.length > 0 ? upcomingRequests[0] : null;

    return {
      date: startOfDay.toISOString().split("T")[0],
      configs,
      currentShift,
      totalDayCount: allRequests.length,
      totalDayPendingReview: allRequests.filter((r) => r.needsReview).length,
      nextRequest,
      shifts: {
        MORNING: buildShiftSummary(Shift.MORNING),
        AFTERNOON: buildShiftSummary(Shift.AFTERNOON),
        NIGHT: buildShiftSummary(Shift.NIGHT),
      },
    };
  }

  /**
   * Busca detalhes completos de um atendimento por ID
   */
  static async getRequestById(id: string) {
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            fixedEquipment: {
              include: { item: true, asset: true },
            },
          },
        },
        assignedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            item: true,
            asset: {
              include: { item: true, currentBox: { include: { door: true } } },
            },
          },
        },
        tasks: {
          include: { completedByUser: { select: { id: true, name: true } } },
          orderBy: { orderIndex: "asc" },
        },
        reservations: {
          include: { item: true, asset: true },
        },
        series: true,
      },
    });

    if (!request) {
      throw new Error("Solicitação de atendimento não encontrada.");
    }

    return request;
  }

  /**
   * Validação de Conflito de Patrimônio Individual no intervalo
   */
  static async validateAssetConflict(
    assetId: string,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: string,
    tx: any = prisma
  ) {
    // 1. Checar status estrutural do Asset
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      include: { item: true, currentRoom: true },
    });

    if (!asset || !asset.active) {
      throw new Error("Patrimônio não encontrado ou inativo no sistema.");
    }

    if (asset.status === AssetStatus.IN_MAINTENANCE) {
      throw new Error(`O patrimônio ${asset.assetTag} (${asset.item.name}) está atualmente em manutenção.`);
    }

    if (asset.status === AssetStatus.DAMAGED || asset.status === AssetStatus.WRITTEN_OFF || asset.status === AssetStatus.LOST) {
      throw new Error(`O patrimônio ${asset.assetTag} está indisponível (Status: ${asset.status}).`);
    }

    // 2. Checar se está alocado fixo em sala de aula
    if (asset.currentRoomId) {
      throw new Error(
        `O patrimônio ${asset.assetTag} está alocado como infraestrutura fixa da sala ${asset.currentRoom?.name || "de aula"}.`
      );
    }

    // 3. Conflito com outras reservas no mesmo intervalo
    const conflictingReservations = await tx.reservation.findMany({
      where: {
        assetId,
        requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
        status: ReservationStatus.ACTIVE,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      include: {
        request: {
          include: { room: true },
        },
      },
    });

    if (conflictingReservations.length > 0) {
      const conflict = conflictingReservations[0].request;
      const startStr = formatTimeInTimezone(conflict.startTime);
      const endStr = formatTimeInTimezone(conflict.endTime);
      throw new Error(
        `Conflito de patrimônio: o equipamento ${asset.assetTag} já está reservado para a sala ${conflict.room.name} das ${startStr} às ${endStr} (${conflict.professorName || "Atendimento agendado"}).`
      );
    }
  }

  /**
   * Validação de Disponibilidade de Recurso (Estoque vs Comprometido no Horário)
   */
  static async validateItemAvailability(
    itemId: string,
    quantity: number,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: string,
    tx: Prisma.TransactionClient = prisma
  ) {
    // 1. ATOMIC LOCK: Bloqueia a linha do Item no Postgres para transações concorrentes
    if (tx !== prisma && typeof tx.item?.update === "function") {
      await tx.item.update({
        where: { id: itemId },
        data: { updatedAt: new Date() },
      });
    }

    const item = await tx.item.findUnique({
      where: { id: itemId },
      include: {
        inventories: true,
        assets: {
          where: {
            active: true,
            status: AssetStatus.AVAILABLE,
            currentRoomId: null, // Não fixado em salas
          },
        },
      },
    });

    if (!item || !item.active) {
      throw new Error("Item do catálogo não encontrado ou inativo.");
    }

    // Reservas ativas no mesmo período
    const overlappingReservations = await tx.reservation.findMany({
      where: {
        itemId,
        requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
        status: ReservationStatus.ACTIVE,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      select: { quantity: true },
    });

    const alreadyReserved = overlappingReservations.reduce((acc: number, r: any) => acc + r.quantity, 0);

    let netAvailable = 0;
    // Separação estrita: ASSET_EQUIPMENT vs MATERIAL
    if (item.itemType === "ASSET_EQUIPMENT") {
      // Total de assets patrimoniais disponíveis livres menos reservas sobrepostas
      const totalAvailableAssets = item.assets ? item.assets.length : 0;
      netAvailable = Math.max(0, totalAvailableAssets - alreadyReserved);
    } else {
      // Itens quantitativos (Inventory)
      const totalInventory = item.inventories ? item.inventories.reduce((acc: number, inv: any) => acc + inv.quantity, 0) : 0;
      netAvailable = Math.max(0, totalInventory - alreadyReserved);
    }

    if (netAvailable < quantity) {
      throw new Error(
        `Disponibilidade insuficiente para "${item.name}". Disponíveis neste horário: ${netAvailable} unidade(s), solicitadas: ${quantity}.`
      );
    }

    return item;
  }

  /**
   * Criação de nova solicitação (Manual ou Recorrente)
   */
  static async createRequest(data: RequestCreateInput, userId: string) {
    const shiftConfigs = await ShiftService.getShiftConfigs();

    // Montar datas
    const [year, month, day] = data.date.split("-").map((v) => parseInt(v, 10));
    const [startH, startM] = data.startTime.includes("T")
      ? [new Date(data.startTime).getHours(), new Date(data.startTime).getMinutes()]
      : data.startTime.split(":").map((v) => parseInt(v, 10));
    const [endH, endM] = data.endTime.includes("T")
      ? [new Date(data.endTime).getHours(), new Date(data.endTime).getMinutes()]
      : data.endTime.split(":").map((v) => parseInt(v, 10));

    const dateOnly = new Date(year, month - 1, day, 0, 0, 0, 0);
    const startDateTime = new Date(year, month - 1, day, startH, startM, 0);
    const endDateTime = new Date(year, month - 1, day, endH, endM, 0);

    if (endDateTime <= startDateTime) {
      throw new Error("O horário final deve ser posterior ao horário inicial.");
    }

    // Validar se a data e horário são no passado para novas solicitações no fuso de Fortaleza (Nordeste)
    const sysNow = getSystemNow();
    const reqDateStr = data.date;
    const reqStartMinutes = startH * 60 + startM;
    const nowMinutesWithTolerance = sysNow.totalMinutes - 5; // Tolerância de 5 minutos para latência de rede

    if (reqDateStr < sysNow.dateStr) {
      throw new Error(
        `Não é permitido agendar para datas passadas (${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}). Selecione a data de hoje ou uma data futura.`
      );
    } else if (reqDateStr === sysNow.dateStr && reqStartMinutes < nowMinutesWithTolerance) {
      throw new Error(
        `Não é permitido agendar para um horário que já passou hoje (${data.startTime}). Horário atual: ${sysNow.timeStr}. Selecione um horário futuro.`
      );
    }

    // A faculdade não funciona aos domingos (getDay() === 0)
    if (startDateTime.getDay() === 0) {
      throw new Error(
        "A faculdade não funciona aos domingos. Os atendimentos só podem ser agendados de segunda-feira a sábado."
      );
    }

    const shift = ShiftService.getShiftFromTime(data.startTime, shiftConfigs);
    const isOutsideShift = ShiftService.isOutsideRegularShifts(data.startTime, shiftConfigs);

    return await prisma.$transaction(async (tx) => {
      // 1. Validar sala
      const room = await tx.room.findUnique({
        where: { id: data.roomId },
        include: { fixedEquipment: true },
      });

      if (!room || !room.active) {
        throw new Error("Sala selecionada não encontrada ou inativa.");
      }

      // 2. Validar cada item solicitado
      for (const itemInput of data.items) {
        // Regra A: Infraestrutura Fixa (Datashow fixo / PC)
        if (itemInput.resourceType === ResourceType.FIXED_IN_ROOM) {
          if (!room.fixedProjectorModel) {
            throw new Error(
              `A sala ${room.name} não possui Datashow fixo instalado. Selecione "Datashow Móvel" do estoque.`
            );
          }
          if (room.lampStatus === "TROCAR LAMPADA") {
            throw new Error(
              `O Datashow fixo da sala ${room.name} está indisponível para uso (requer troca de lâmpada).`
            );
          }
        }
        // Regra B e C: Equipamentos móveis e itens quantitativos
        else if (itemInput.itemId) {
          await this.validateItemAvailability(
            itemInput.itemId,
            itemInput.quantity,
            startDateTime,
            endDateTime,
            undefined,
            tx
          );
        }

        // Se informou patrimônio direto
        if (itemInput.assetId) {
          await this.validateAssetConflict(itemInput.assetId, startDateTime, endDateTime, undefined, tx);
        }
      }

      let seriesId: string | null = null;

      // 3. Se for repetição semanal, criar série
      if (data.repeatWeekly) {
        let untilDate: Date | null = null;
        if (data.repeatUntilDate) {
          const [uY, uM, uD] = data.repeatUntilDate.split("-").map((v) => parseInt(v, 10));
          untilDate = new Date(uY, uM - 1, uD, 23, 59, 59);
        } else {
          const occurrences = data.repeatOccurrences || 8;
          untilDate = new Date(startDateTime.getTime() + occurrences * 7 * 24 * 60 * 60 * 1000);
        }

        const series = await tx.requestSeries.create({
          data: {
            frequency: "WEEKLY",
            dayOfWeek: startDateTime.getDay(),
            startDate: startDateTime,
            endDate: untilDate,
          },
        });
        seriesId = series.id;
      }

      // Validar criador no banco
      let safeCreatedById = userId;
      const creatorExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!creatorExists) {
        const fallback = await tx.user.findFirst({ select: { id: true } });
        safeCreatedById = fallback?.id || userId;
      }

      // 4. Montar tarefas operacionais automáticas
      const initialTasks: Array<{ title: string; taskType: TaskType; orderIndex: number }> = [];
      let taskOrder = 1;

      // Tarefas para recursos fixos da sala (respeitando se é necessário ligar o datashow)
      const shouldTurnOnProjector = 
        data.turnOnProjector !== false && 
        (data.items.some((i) => i.resourceType === ResourceType.FIXED_IN_ROOM) || Boolean(room.fixedProjectorModel));

      if (shouldTurnOnProjector && (room.fixedProjectorModel || data.items.some((i) => i.resourceType === ResourceType.FIXED_IN_ROOM))) {
        initialTasks.push({
          title: `Ligar Datashow da Sala ${room.name} (${room.fixedProjectorModel || "Instalado"})`,
          taskType: TaskType.FIXED_EQUIPMENT,
          orderIndex: taskOrder++,
        });
        initialTasks.push({
          title: `Testar sinal de vídeo/projeção na Sala ${room.name}`,
          taskType: TaskType.FIXED_EQUIPMENT,
          orderIndex: taskOrder++,
        });
      }

      // Tarefas de separação para itens móveis e quantitativos
      const mobileItems = data.items.filter((i) => i.resourceType !== ResourceType.FIXED_IN_ROOM);
      for (const mobItem of mobileItems) {
        initialTasks.push({
          title: mobItem.quantity > 1 
            ? `Separar ${mobItem.quantity}x ${mobItem.label}` 
            : `Separar ${mobItem.label}`,
          taskType: TaskType.SEPARATION,
          orderIndex: taskOrder++,
        });
      }

      // Tarefas de transporte e recolhimento
      if (mobileItems.length > 0) {
        initialTasks.push({
          title: `Levar equipamentos para a Sala ${room.name}`,
          taskType: TaskType.DELIVERY,
          orderIndex: taskOrder++,
        });
        initialTasks.push({
          title: `Recolher equipamentos da Sala ${room.name} após o término`,
          taskType: TaskType.COLLECTION,
          orderIndex: taskOrder++,
        });
      }

      // 5. Criar solicitação principal
      const primaryRequest = await tx.request.create({
        data: {
          date: dateOnly,
          startTime: startDateTime,
          endTime: endDateTime,
          shift,
          isOutsideShift,
          priority: data.priority || RequestPriority.NORMAL,
          roomId: data.roomId,
          professorName: data.professorName?.trim() || null,
          discipline: data.discipline?.trim() || null,
          attendanceType: data.attendanceType?.trim() || null,
          notes: data.notes?.trim() || null,
          status: RequestStatus.AGENDADO,
          origin: data.origin || RequestOrigin.MANUAL,
          needsReview: false,
          assignedUserId: data.assignedUserId || null,
          createdById: safeCreatedById,
          seriesId,
          items: {
            create: data.items.map((item) => ({
              itemId: item.itemId || null,
              assetId: item.assetId || null,
              resourceType: item.resourceType || ResourceType.QUANTITATIVE,
              label: item.label.trim(),
              quantity: item.quantity || 1,
              separated: item.separated || false,
              notes: item.notes?.trim() || null,
            })),
          },
          tasks: {
            create: initialTasks.map((t) => ({
              title: t.title,
              taskType: t.taskType,
              orderIndex: t.orderIndex,
              completed: false,
            })),
          },
        },
        include: {
          room: true,
          items: { include: { item: true, asset: true } },
          tasks: true,
        },
      });

      // 6. Criar reservas de recursos no período
      for (const item of data.items) {
        if (item.resourceType !== ResourceType.FIXED_IN_ROOM && item.itemId) {
          await tx.reservation.create({
            data: {
              requestId: primaryRequest.id,
              itemId: item.itemId,
              assetId: item.assetId || null,
              resourceType: item.resourceType,
              quantity: item.quantity || 1,
              startTime: startDateTime,
              endTime: endDateTime,
              status: ReservationStatus.ACTIVE,
            },
          });
        }
      }

      // 7. Se for recorrente, validar e materializar as instâncias futuras
      if (data.repeatWeekly && seriesId) {
        let currentDate = new Date(startDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        let currentEndDate = new Date(endDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        const maxDate = new Date(startDateTime.getTime() + 32 * 7 * 24 * 60 * 60 * 1000);

        const seriesEndDate = data.repeatUntilDate
          ? new Date(data.repeatUntilDate + "T23:59:59")
          : new Date(startDateTime.getTime() + (data.repeatOccurrences || 18) * 7 * 24 * 60 * 60 * 1000);

        while (currentDate <= seriesEndDate && currentDate <= maxDate) {
          const dateStr = currentDate.toLocaleDateString("pt-BR");

          // 7.1 Validar se a sala já tem conflito de horário nesta data futura
          const roomConflict = await tx.request.findFirst({
            where: {
              roomId: data.roomId,
              status: { notIn: [RequestStatus.CANCELADO, RequestStatus.FINALIZADO] },
              AND: [
                { startTime: { lt: currentEndDate } },
                { endTime: { gt: currentDate } },
              ],
            },
          });

          if (roomConflict) {
            const confProf = roomConflict.professorName || "Atendimento agendado";
            const sTime = formatTimeInTimezone(roomConflict.startTime);
            const eTime = formatTimeInTimezone(roomConflict.endTime);
            throw new Error(
              `Conflito de agenda em ${dateStr}: a Sala ${room.name} já possui a aula/reserva "${confProf}" das ${sTime} às ${eTime}. Não foi possível criar a série completa.`
            );
          }

          // 7.2 Validar disponibilidade de estoque para os itens nesta data futura
          for (const itemInput of data.items) {
            if (itemInput.itemId && itemInput.resourceType !== ResourceType.FIXED_IN_ROOM) {
              await this.validateItemAvailability(
                itemInput.itemId,
                itemInput.quantity,
                currentDate,
                currentEndDate,
                undefined,
                tx
              );
            }
          }

          const instDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

          const nextInstance = await tx.request.create({
            data: {
              date: instDateOnly,
              startTime: currentDate,
              endTime: currentEndDate,
              shift,
              isOutsideShift,
              priority: data.priority || RequestPriority.NORMAL,
              roomId: data.roomId,
              professorName: data.professorName?.trim() || null,
              discipline: data.discipline?.trim() || null,
              attendanceType: data.attendanceType?.trim() || null,
              notes: data.notes?.trim() || null,
              status: RequestStatus.AGENDADO,
              origin: RequestOrigin.MANUAL,
              needsReview: false,
              assignedUserId: data.assignedUserId || null,
              createdById: safeCreatedById,
              seriesId,
              items: {
                create: data.items.map((item) => ({
                  itemId: item.itemId || null,
                  assetId: null,
                  resourceType: item.resourceType || ResourceType.QUANTITATIVE,
                  label: item.label.trim(),
                  quantity: item.quantity || 1,
                  separated: false,
                  notes: item.notes?.trim() || null,
                })),
              },
              tasks: {
                create: initialTasks.map((t) => ({
                  title: t.title,
                  taskType: t.taskType,
                  orderIndex: t.orderIndex,
                  completed: false,
                })),
              },
            },
          });

          for (const item of data.items) {
            if (item.resourceType !== ResourceType.FIXED_IN_ROOM && item.itemId) {
              await tx.reservation.create({
                data: {
                  requestId: nextInstance.id,
                  itemId: item.itemId,
                  assetId: null,
                  resourceType: item.resourceType,
                  quantity: item.quantity || 1,
                  startTime: currentDate,
                  endTime: currentEndDate,
                  status: ReservationStatus.ACTIVE,
                },
              });
            }
          }

          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          currentEndDate = new Date(currentEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }

      // 8. Trilha de Auditoria
      await tx.auditLog.create({
        data: {
          userId: safeCreatedById,
          action: "CREATE_REQUEST",
          entity: "Request",
          entityId: primaryRequest.id,
          details: {
            room: room.name,
            professor: data.professorName,
            shift,
            isOutsideShift,
            startTime: startDateTime.toISOString(),
            isRecurring: data.repeatWeekly,
            itemsCount: data.items.length,
          },
        },
      });

      return primaryRequest;
    });
  }

  /**
   * Alocação de Patrimônio Físico a um item da solicitação (Operação Multimídia)
   */
  static async allocateAsset(
    requestId: string,
    itemId: string,
    assetId: string,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { items: true, room: true },
      });

      if (!request) {
        throw new Error("Solicitação de atendimento não encontrada.");
      }

      const requestItem = request.items.find((i) => i.id === itemId);
      if (!requestItem) {
        throw new Error("Item de solicitação não encontrado.");
      }

      // Validar conflitos do asset no horário
      await this.validateAssetConflict(assetId, request.startTime, request.endTime, requestId, tx);

      const asset = await tx.asset.findUniqueOrThrow({
        where: { id: assetId },
        include: { item: true },
      });

      // Atualizar o item e a reserva
      await tx.requestItem.update({
        where: { id: itemId },
        data: {
          assetId,
        },
      });

      await tx.reservation.updateMany({
        where: {
          requestId,
          itemId: requestItem.itemId || undefined,
        },
        data: {
          assetId,
        },
      });

      // Atualizar status para EM_PREPARACAO se estava AGENDADO
      if (request.status === RequestStatus.AGENDADO) {
        await tx.request.update({
          where: { id: requestId },
          data: { status: RequestStatus.EM_PREPARACAO },
        });
      }

      // Registrar no histórico do patrimônio
      await tx.assetHistory.create({
        data: {
          assetId,
          action: "REQUEST_ASSET_ALLOCATED",
          fromStatus: asset.status,
          toStatus: asset.status,
          userId,
          observation: `Alocado para atendimento na Sala ${request.room.name} (${request.professorName || "Agendado"})`,
        },
      });

      // Trilha de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "ALLOCATE_ASSET",
          entity: "Request",
          entityId: requestId,
          details: {
            itemId,
            itemLabel: requestItem.label,
            assetTag: asset.assetTag,
            assetModel: asset.model,
          },
        },
      });

      return await this.getRequestById(requestId);
    });
  }

  /**
   * Troca de Patrimônio (Asset Swap) por problema ou readequação operacional
   */
  static async swapAsset(
    requestId: string,
    itemId: string,
    newAssetId: string,
    reason: string,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { items: true, room: true },
      });

      if (!request) {
        throw new Error("Solicitação de atendimento não encontrada.");
      }

      const requestItem = request.items.find((i) => i.id === itemId);
      if (!requestItem) {
        throw new Error("Item de solicitação não encontrado.");
      }

      const oldAssetId = requestItem.assetId;
      let oldAssetTag = "Nenhum";
      if (oldAssetId) {
        const oldAsset = await tx.asset.findUnique({ where: { id: oldAssetId } });
        if (oldAsset) oldAssetTag = oldAsset.assetTag;
      }

      // Validar novo asset no horário
      await this.validateAssetConflict(newAssetId, request.startTime, request.endTime, requestId, tx);

      const newAsset = await tx.asset.findUniqueOrThrow({
        where: { id: newAssetId },
        include: { item: true },
      });

      // Atualizar item e reserva
      await tx.requestItem.update({
        where: { id: itemId },
        data: { assetId: newAssetId },
      });

      await tx.reservation.updateMany({
        where: {
          requestId,
          itemId: requestItem.itemId || undefined,
        },
        data: { assetId: newAssetId },
      });

      // Adicionar observação na solicitação
      const swapNote = `[Troca de Patrimônio: de ${oldAssetTag} para ${newAsset.assetTag} - Motivo: ${reason.trim()}]`;
      const updatedNotes = request.notes ? `${request.notes} | ${swapNote}` : swapNote;

      await tx.request.update({
        where: { id: requestId },
        data: { notes: updatedNotes },
      });

      // Registrar nos históricos de patrimônio
      if (oldAssetId) {
        await tx.assetHistory.create({
          data: {
            assetId: oldAssetId,
            action: "REQUEST_ASSET_SWAP",
            toStatus: AssetStatus.AVAILABLE,
            userId,
            observation: `Substituído por ${newAsset.assetTag} no atendimento da Sala ${request.room.name}. Motivo: ${reason}`,
          },
        });
      }

      await tx.assetHistory.create({
        data: {
          assetId: newAssetId,
          action: "REQUEST_ASSET_SWAP",
          toStatus: newAsset.status,
          userId,
          observation: `Substituto de ${oldAssetTag} no atendimento da Sala ${request.room.name}. Motivo: ${reason}`,
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: "SWAP_ASSET",
          entity: "Request",
          entityId: requestId,
          details: {
            itemId,
            oldAssetId,
            oldAssetTag,
            newAssetId,
            newAssetTag: newAsset.assetTag,
            reason,
          },
        },
      });

      return await this.getRequestById(requestId);
    });
  }

  /**
   * Alternar conclusão de tarefa operacional (Checklist de Trabalho)
   */
  static async toggleTask(
    requestId: string,
    taskId: string,
    completed: boolean,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const task = await tx.requestTask.findUnique({
        where: { id: taskId },
      });

      if (!task || task.requestId !== requestId) {
        throw new Error("Tarefa operacional não encontrada.");
      }

      await tx.requestTask.update({
        where: { id: taskId },
        data: {
          completed,
          completedAt: completed ? new Date() : null,
          completedByUserId: completed ? userId : null,
        },
      });

      // Avaliar todas as tarefas da solicitação
      const allTasks = await tx.requestTask.findMany({
        where: { requestId },
      });

      const prepTasks = allTasks.filter(
        (t) => t.taskType === TaskType.FIXED_EQUIPMENT || t.taskType === TaskType.SEPARATION
      );

      const allPrepDone = prepTasks.length > 0 && prepTasks.every((t) => (t.id === taskId ? completed : t.completed));
      const deliveryTask = allTasks.find((t) => t.taskType === TaskType.DELIVERY);
      const isDeliveryDone = deliveryTask ? (deliveryTask.id === taskId ? completed : deliveryTask.completed) : false;
      const allTasksDone = allTasks.every((t) => (t.id === taskId ? completed : t.completed));

      const request = await tx.request.findUniqueOrThrow({ where: { id: requestId } });

      let newStatus = request.status;
      if (allTasksDone && request.status !== RequestStatus.FINALIZADO && request.status !== RequestStatus.CANCELADO) {
        newStatus = RequestStatus.FINALIZADO;
      } else if (isDeliveryDone && request.status !== RequestStatus.FINALIZADO) {
        newStatus = RequestStatus.EM_ATENDIMENTO;
      } else if (allPrepDone && (request.status === RequestStatus.AGENDADO || request.status === RequestStatus.EM_PREPARACAO)) {
        newStatus = RequestStatus.PREPARADO;
      } else if (!allPrepDone && request.status === RequestStatus.PREPARADO) {
        newStatus = RequestStatus.EM_PREPARACAO;
      }

      if (newStatus !== request.status) {
        await tx.request.update({
          where: { id: requestId },
          data: { status: newStatus },
        });

        // Aplica efeitos colaterais da máquina de estados (ex: liberar reservas ativas ao finalizar)
        await RequestWorkflowService.applyStatusSideEffects(requestId, newStatus, tx);
      }

      return await this.getRequestById(requestId);
    });
  }

  /**
   * Adicionar tarefa personalizada a uma solicitação
   */
  static async addTask(requestId: string, data: RequestTaskCreateInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const count = await tx.requestTask.count({ where: { requestId } });

      const task = await tx.requestTask.create({
        data: {
          requestId,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          taskType: data.taskType || TaskType.CUSTOM,
          orderIndex: count + 1,
          completed: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "ADD_REQUEST_TASK",
          entity: "RequestTask",
          entityId: task.id,
          details: { requestId, title: task.title },
        },
      });

      return await this.getRequestById(requestId);
    });
  }

  /**
   * Excluir tarefa operacional
   */
  static async deleteTask(requestId: string, taskId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      await tx.requestTask.delete({
        where: { id: taskId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE_REQUEST_TASK",
          entity: "RequestTask",
          entityId: taskId,
          details: { requestId },
        },
      });

      return await this.getRequestById(requestId);
    });
  }

  /**
   * Marcação de item separado (Compatibilidade com rotas legadas de separação)
   */
  static async toggleItemSeparated(
    requestId: string,
    itemId: string,
    separated: boolean,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const requestItem = await tx.requestItem.findUnique({
        where: { id: itemId },
      });

      if (!requestItem || requestItem.requestId !== requestId) {
        throw new Error("Item de solicitação não encontrado.");
      }

      await tx.requestItem.update({
        where: { id: itemId },
        data: { separated },
      });

      return await this.getRequestById(requestId);
    });
  }


  /**
   * Atualização de solicitação com checagem de autorização por perfil
   */
  static async updateRequest(
    id: string,
    data: RequestUpdateInput,
    user: { id: string; role: Role }
  ) {
    const existing = await prisma.request.findUnique({
      where: { id },
      include: { items: true, room: true },
    });

    if (!existing) {
      throw new Error("Solicitação não encontrada.");
    }

    if (user.role === Role.ACADEMIC_SUPPORT) {
      if (existing.createdById !== user.id) {
        throw new Error("Permissão negada: você só pode editar as solicitações criadas pelo seu próprio usuário.");
      }
      if (data.assignedUserId !== undefined && data.assignedUserId !== existing.assignedUserId) {
        throw new Error("Permissão negada: o perfil Apoio Acadêmico não pode alterar o responsável operacional.");
      }
    }

    // Validação formal da máquina de estados
    if (data.status !== undefined && data.status !== existing.status) {
      RequestWorkflowService.validateTransition(existing, data.status, user);
    }

    return await prisma.$transaction(async (tx) => {
      let shift = existing.shift;
      let startDateTime = existing.startTime;
      let endDateTime = existing.endTime;
      let isOutsideShift = existing.isOutsideShift;

      if (data.startTime || data.date || data.endTime) {
        const dateStr = data.date || existing.date.toISOString().split("T")[0];
        const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));

        let sH = existing.startTime.getHours();
        let sM = existing.startTime.getMinutes();
        if (data.startTime) {
          [sH, sM] = data.startTime.includes("T")
            ? [new Date(data.startTime).getHours(), new Date(data.startTime).getMinutes()]
            : data.startTime.split(":").map((v) => parseInt(v, 10));
        }

        let eH = existing.endTime.getHours();
        let eM = existing.endTime.getMinutes();
        if (data.endTime) {
          [eH, eM] = data.endTime.includes("T")
            ? [new Date(data.endTime).getHours(), new Date(data.endTime).getMinutes()]
            : data.endTime.split(":").map((v) => parseInt(v, 10));
        }

        startDateTime = new Date(year, month - 1, day, sH, sM, 0);
        endDateTime = new Date(year, month - 1, day, eH, eM, 0);

        if (endDateTime <= startDateTime) {
          throw new Error("O horário final deve ser posterior ao horário inicial.");
        }

        if (startDateTime.getDay() === 0) {
          throw new Error(
            "A faculdade não funciona aos domingos. Os atendimentos só podem ser agendados de segunda-feira a sábado."
          );
        }

        const shiftConfigs = await ShiftService.getShiftConfigs();
        const checkTime = data.startTime || existing.startTime;
        shift = ShiftService.getShiftFromTime(checkTime, shiftConfigs);
        isOutsideShift = ShiftService.isOutsideRegularShifts(checkTime, shiftConfigs);
      }

      // Validação de alteração de sala ou conflito de horário
      const targetRoomId = data.roomId || existing.roomId;
      const targetRoom = await tx.room.findUnique({
        where: { id: targetRoomId },
        include: { fixedEquipment: true },
      });

      if (!targetRoom || !targetRoom.active) {
        throw new Error("Sala não encontrada ou inativa.");
      }

      // Se mudou a sala ou o horário, checar se a sala está livre
      if (data.roomId || data.startTime || data.endTime || data.date) {
        const roomConflict = await tx.request.findFirst({
          where: {
            roomId: targetRoomId,
            id: { not: id },
            status: { notIn: [RequestStatus.CANCELADO, RequestStatus.FINALIZADO] },
            AND: [
              { startTime: { lt: endDateTime } },
              { endTime: { gt: startDateTime } },
            ],
          },
        });

        if (roomConflict) {
          const confProf = roomConflict.professorName || "Outro atendimento";
          throw new Error(
            `A Sala ${targetRoom.name} já possui a aula/reserva "${confProf}" agendada das ${formatTimeInTimezone(roomConflict.startTime)} às ${formatTimeInTimezone(roomConflict.endTime)}.`
          );
        }

        // Revalidar infraestrutura fixa na nova sala
        const effectiveItems = data.items !== undefined ? data.items : existing.items;
        const hasFixedProjector = effectiveItems.some((i: any) => i.resourceType === ResourceType.FIXED_IN_ROOM);
        if (hasFixedProjector) {
          if (!targetRoom.fixedProjectorModel) {
            throw new Error(
              `A sala ${targetRoom.name} não possui Datashow fixo instalado. Ajuste os recursos da solicitação para Datashow Móvel.`
            );
          }
          if (targetRoom.lampStatus === "TROCAR LAMPADA") {
            throw new Error(
              `O Datashow fixo da sala ${targetRoom.name} está indisponível para uso (requer troca de lâmpada).`
            );
          }
        }
      }

      // Se atualizou itens
      if (data.items !== undefined) {
        // Remover itens e reservas antigas
        await tx.reservation.deleteMany({ where: { requestId: id } });
        await tx.requestItem.deleteMany({ where: { requestId: id } });

        if (data.items.length > 0) {
          await tx.requestItem.createMany({
            data: data.items.map((item) => ({
              requestId: id,
              itemId: item.itemId || null,
              assetId: item.assetId || null,
              resourceType: item.resourceType || ResourceType.QUANTITATIVE,
              label: item.label.trim(),
              quantity: item.quantity || 1,
              separated: item.separated || false,
              notes: item.notes?.trim() || null,
            })),
          });

          for (const item of data.items) {
            if (item.resourceType !== ResourceType.FIXED_IN_ROOM && item.itemId) {
              await this.validateItemAvailability(item.itemId, item.quantity, startDateTime, endDateTime, id, tx);
              await tx.reservation.create({
                data: {
                  requestId: id,
                  itemId: item.itemId,
                  assetId: item.assetId || null,
                  resourceType: item.resourceType || ResourceType.QUANTITATIVE,
                  quantity: item.quantity || 1,
                  startTime: startDateTime,
                  endTime: endDateTime,
                  status: ReservationStatus.ACTIVE,
                },
              });
            }
          }
        }
      }

      let safeAssignedUserId: string | null | undefined = undefined;
      if (data.assignedUserId !== undefined) {
        if (!data.assignedUserId) {
          safeAssignedUserId = null;
        } else {
          const userExists = await tx.user.findUnique({
            where: { id: data.assignedUserId },
            select: { id: true },
          });
          safeAssignedUserId = userExists ? userExists.id : null;
        }
      }

      const updated = await tx.request.update({
        where: { id },
        data: {
          date: data.date ? this.normalizeDate(data.date).startOfDay : undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          shift,
          isOutsideShift,
          priority: data.priority || undefined,
          roomId: data.roomId || undefined,
          professorName: data.professorName !== undefined ? (data.professorName ? data.professorName.trim() : null) : undefined,
          discipline: data.discipline !== undefined ? (data.discipline ? data.discipline.trim() : null) : undefined,
          attendanceType: data.attendanceType !== undefined ? (data.attendanceType ? data.attendanceType.trim() : null) : undefined,
          notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
          status: data.status || undefined,
          assignedUserId: safeAssignedUserId !== undefined ? safeAssignedUserId : undefined,
        },
        include: {
          room: true,
          items: { include: { item: true, asset: true } },
          tasks: { orderBy: { orderIndex: "asc" } },
          reservations: true,
          assignedUser: { select: { id: true, name: true } },
        },
      });

      if (data.status && data.status !== existing.status) {
        await RequestWorkflowService.applyStatusSideEffects(id, data.status, tx);
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_REQUEST",
          entity: "Request",
          entityId: id,
          details: { changes: data },
        },
      });

      return updated;
    });
  }

  /**
   * Cancelamento de solicitação
   */
  static async cancelRequest(id: string, user: { id: string; role: Role }) {
    const existing = await prisma.request.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      throw new Error("Solicitação não encontrada.");
    }

    if (user.role === Role.ACADEMIC_SUPPORT && existing.createdById !== user.id) {
      throw new Error("Permissão negada: você só pode cancelar as solicitações criadas por você.");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id },
        data: { status: RequestStatus.CANCELADO },
      });

      // Cancelar reservas ativas
      await tx.reservation.updateMany({
        where: { requestId: id },
        data: { status: ReservationStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CANCEL_REQUEST",
          entity: "Request",
          entityId: id,
          details: { professor: existing.professorName, room: existing.room.name },
        },
      });

      return updated;
    });
  }

  /**
   * Exclusão permanente de agendamento (Remove da grade e limpa reservas/itens)
   */
  static async deleteRequest(id: string, user: { id: string; role: Role }) {
    const existing = await prisma.request.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      throw new Error("Solicitação de agendamento não encontrada.");
    }

    if (user.role === Role.ACADEMIC_SUPPORT && existing.createdById !== user.id) {
      throw new Error("Permissão negada: você só pode excluir solicitações criadas pelo seu próprio usuário.");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Remover reservas vinculadas
      await tx.reservation.deleteMany({
        where: { requestId: id },
      });

      // 2. Remover itens da solicitação
      await tx.requestItem.deleteMany({
        where: { requestId: id },
      });

      // 3. Remover tarefas operacionais
      await tx.requestTask.deleteMany({
        where: { requestId: id },
      });

      // 4. Remover a solicitação em si
      const deleted = await tx.request.delete({
        where: { id },
      });

      // 5. Trilha de Auditoria
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE_REQUEST",
          entity: "Request",
          entityId: id,
          details: {
            professor: existing.professorName,
            room: existing.room?.name,
            startTime: existing.startTime,
            status: existing.status,
          },
        },
      });

      return deleted;
    });
  }

  /**
   * Confirmação e revisão de solicitação importada do calendário legado
   */
  static async confirmReview(
    id: string,
    data: RequestLegacyConfirmInput,
    user: { id: string; role: Role }
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id },
        include: { room: true },
      });

      if (!request) {
        throw new Error("Solicitação não encontrada.");
      }

      if (user.role === Role.ACADEMIC_SUPPORT && request.createdById !== user.id) {
        throw new Error("Permissão negada: você só pode revisar e confirmar solicitações criadas pelo seu próprio usuário.");
      }

      let startDateTime = request.startTime;
      let endDateTime = request.endTime;
      let shift = request.shift;

      if (data.startTime || data.endTime) {
        const [year, month, day] = request.date.toISOString().split("T")[0].split("-").map((v) => parseInt(v, 10));
        let [sH, sM] = [request.startTime.getHours(), request.startTime.getMinutes()];
        if (data.startTime) {
          [sH, sM] = data.startTime.split(":").map((v) => parseInt(v, 10));
        }

        let [eH, eM] = [request.endTime.getHours(), request.endTime.getMinutes()];
        if (data.endTime) {
          [eH, eM] = data.endTime.split(":").map((v) => parseInt(v, 10));
        }

        startDateTime = new Date(year, month - 1, day, sH, sM, 0);
        endDateTime = new Date(year, month - 1, day, eH, eM, 0);

        const configs = await ShiftService.getShiftConfigs();
        shift = ShiftService.getShiftFromTime(startDateTime, configs);
      }

      if (data.items !== undefined) {
        await tx.requestItem.deleteMany({ where: { requestId: id } });
        if (data.items.length > 0) {
          await tx.requestItem.createMany({
            data: data.items.map((item) => ({
              requestId: id,
              itemId: item.itemId || null,
              assetId: item.assetId || null,
              resourceType: item.resourceType || ResourceType.QUANTITATIVE,
              label: item.label.trim(),
              quantity: item.quantity || 1,
              separated: false,
            })),
          });
        }
      }

      const updated = await tx.request.update({
        where: { id },
        data: {
          roomId: data.roomId,
          professorName: data.professorName.trim(),
          discipline: data.discipline?.trim() || null,
          notes: data.notes?.trim() || null,
          startTime: startDateTime,
          endTime: endDateTime,
          shift,
          needsReview: false,
        },
        include: {
          room: true,
          items: { include: { item: true, asset: true } },
          tasks: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CONFIRM_IMPORTED_REQUEST",
          entity: "Request",
          entityId: id,
          details: { professor: data.professorName, room: updated.room.name },
        },
      });

      return updated;
    });
  }
}

