import { prisma } from "@/lib/prisma";
import { 
  RequestStatus, 
  RequestOrigin, 
  Shift, 
  ItemLogisticsType,
  Role,
  AssetStatus
} from "@prisma/client";
import { 
  RequestCreateInput, 
  RequestUpdateInput, 
  RequestLegacyConfirmInput 
} from "@/schemas/request.schema";
import { ShiftService } from "@/services/shift.service";

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
   * Lista solicitações com múltiplos filtros e paginação
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

    const where: any = {};

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
        series: true,
      },
      orderBy: [{ startTime: "asc" }],
    });
  }

  /**
   * Retorna os agendamentos de uma data organizados por Turno (Manhã / Tarde / Noite),
   * contadores operacionais e próximo atendimento
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

      const requestsInShift = allRequests.filter((r) => r.shift === shift);
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

    // Identificar próximo atendimento
    const now = new Date();
    const upcomingRequests = allRequests.filter(
      (r) =>
        r.status !== RequestStatus.FINALIZADO &&
        r.status !== RequestStatus.CANCELADO &&
        new Date(r.endTime) >= now
    );
    const nextRequest = upcomingRequests.length > 0 ? upcomingRequests[0] : null;

    const totalDayCount = allRequests.length;
    const totalDayPendingReview = allRequests.filter((r) => r.needsReview).length;

    return {
      date: startOfDay.toISOString().split("T")[0],
      configs,
      currentShift,
      totalDayCount,
      totalDayPendingReview,
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
              include: { item: true },
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
        series: true,
      },
    });

    if (!request) {
      throw new Error("Solicitação de atendimento não encontrada.");
    }

    return request;
  }

  /**
   * Validação de Conflito de Equipamento: impede reservar o mesmo Asset em horários sobrepostos
   */
  static async validateAssetConflict(
    assetId: string,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: string,
    tx: any = prisma
  ) {
    // 1. Conflito com outros atendimentos da agenda
    const overlappingRequests = await tx.requestItem.findMany({
      where: {
        assetId,
        requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
        request: {
          status: { notIn: [RequestStatus.CANCELADO, RequestStatus.FINALIZADO] },
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      },
      include: {
        request: {
          include: {
            room: true,
          },
        },
      },
    });

    if (overlappingRequests.length > 0) {
      const conflict = overlappingRequests[0].request;
      const startStr = new Date(conflict.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const endStr = new Date(conflict.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      throw new Error(
        `Conflito de equipamento: este patrimônio já está reservado para a sala ${conflict.room.name} no horário ${startStr} às ${endStr} (${conflict.professorName || "Atendimento agendado"}).`
      );
    }
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

    const shift = ShiftService.getShiftFromTime(startDateTime, shiftConfigs);

    return await prisma.$transaction(async (tx) => {
      // 1. Validar sala
      const room = await tx.room.findUnique({ where: { id: data.roomId } });
      if (!room || !room.active) {
        throw new Error("Sala selecionada não encontrada ou inativa.");
      }

      // 2. Validar conflitos de Asset nos itens
      for (const item of data.items) {
        if (item.assetId) {
          await this.validateAssetConflict(item.assetId, startDateTime, endDateTime, undefined, tx);
        }
      }

      // 2.5 Validar Disponibilidade Real de Estoque para o intervalo solicitado
      for (const itemInput of data.items) {
        if (itemInput.itemId) {
          const catItem = await tx.item.findUnique({
            where: { id: itemInput.itemId },
            include: { inventories: true, assets: true },
          });

          if (catItem) {
            if (catItem.logisticsType === ItemLogisticsType.FIXED_IN_ROOM) {
              if (!room.fixedProjectorModel) {
                throw new Error(
                  `A sala ${room.name} não possui projetor fixo instalado. Selecione um Datashow Móvel do estoque.`
                );
              }
              if (room.lampStatus === "TROCAR LAMPADA") {
                throw new Error(
                  `O projetor fixo da sala ${room.name} está indisponível para uso (requer troca de lâmpada).`
                );
              }
            } else if (catItem.logisticsType === ItemLogisticsType.MOBILE_STOCK) {
              const hasAssets = catItem.assets && catItem.assets.length > 0;
              let netAvailable = 0;

              // Reservas conflitantes no mesmo horário
              const overlappingRequests = await tx.requestItem.findMany({
                where: {
                  itemId: catItem.id,
                  request: {
                    status: { notIn: [RequestStatus.CANCELADO, RequestStatus.FINALIZADO] },
                    AND: [
                      { startTime: { lt: endDateTime } },
                      { endTime: { gt: startDateTime } },
                    ],
                  },
                },
                select: { quantity: true },
              });

              const alreadyReserved = overlappingRequests.reduce((acc: number, r: any) => acc + r.quantity, 0);

              if (hasAssets) {
                // Para itens com controle patrimonial (Assets), conta apenas os disponíveis
                const availableAssetsCount = catItem.assets.filter((a: any) => a.status === AssetStatus.AVAILABLE).length;
                netAvailable = Math.max(0, availableAssetsCount - alreadyReserved);
              } else {
                // Para itens de quantidade contínua (Inventory), soma tudo nos armários
                const totalCap = catItem.inventories.reduce((acc: number, inv: any) => acc + inv.quantity, 0);
                netAvailable = Math.max(0, totalCap - alreadyReserved);
              }

              if (netAvailable < itemInput.quantity) {
                throw new Error(
                  `Estoque insuficiente para o item "${catItem.name}". Disponíveis para este horário: ${netAvailable} unidade(s), solicitadas: ${itemInput.quantity}.`
                );
              }
            }
          }
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
          // Padrão: 8 semanas caso não informado
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

      // 4. Criar solicitação mestre / inicial
      const primaryRequest = await tx.request.create({
        data: {
          date: dateOnly,
          startTime: startDateTime,
          endTime: endDateTime,
          shift,
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
          syncStatus: "SYNCED",
          items: {
            create: data.items.map((item) => ({
              itemId: item.itemId || null,
              assetId: item.assetId || null,
              label: item.label.trim(),
              quantity: item.quantity || 1,
              separated: item.separated || false,
            })),
          },
        },
        include: {
          room: true,
          items: {
            include: { item: true, asset: true },
          },
        },
      });

      // 5. Se for recorrente, materializar as instâncias futuras no banco de dados
      if (data.repeatWeekly && seriesId) {
        let currentDate = new Date(startDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        let currentEndDate = new Date(endDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        const maxDate = new Date(startDateTime.getTime() + 32 * 7 * 24 * 60 * 60 * 1000); // Teto de segurança: 32 semanas (semestre completo)

        const seriesEndDate = data.repeatUntilDate
          ? new Date(data.repeatUntilDate + "T23:59:59")
          : new Date(startDateTime.getTime() + (data.repeatOccurrences || 18) * 7 * 24 * 60 * 60 * 1000);

        while (currentDate <= seriesEndDate && currentDate <= maxDate) {
          const instDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

          await tx.request.create({
            data: {
              date: instDateOnly,
              startTime: currentDate,
              endTime: currentEndDate,
              shift,
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
              syncStatus: "SYNCED",
              items: {
                create: data.items.map((item) => ({
                  itemId: item.itemId || null,
                  assetId: null,
                  label: item.label.trim(),
                  quantity: item.quantity || 1,
                  separated: false,
                })),
              },
            },
          });

          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          currentEndDate = new Date(currentEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }

      // 6. Trilha de Auditoria Segura
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
            startTime: startDateTime.toISOString(),
            isRecurring: data.repeatWeekly,
          },
        },
      });

      return primaryRequest;
    });
  }

  /**
   * Atualização de solicitação existente com checagem de autorização por perfil
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

    // Regra de Permissão Apoio Acadêmico (ACADEMIC_SUPPORT)
    if (user.role === Role.ACADEMIC_SUPPORT) {
      if (existing.createdById !== user.id) {
        throw new Error("Permissão negada: você só pode editar as solicitações criadas pelo seu próprio usuário.");
      }
      // ACADEMIC_SUPPORT não pode alterar campos operacionais internos do Multimídia
      if (data.assignedUserId !== undefined && data.assignedUserId !== existing.assignedUserId) {
        throw new Error("Permissão negada: o perfil Apoio Acadêmico não pode alterar o responsável operacional.");
      }
      if (data.status !== undefined && data.status !== existing.status && data.status !== RequestStatus.CANCELADO) {
        throw new Error("Permissão negada: o perfil Apoio Acadêmico não pode alterar o status de preparo interno.");
      }
    }

    return await prisma.$transaction(async (tx) => {
      let shift = existing.shift;
      let startDateTime = existing.startTime;
      let endDateTime = existing.endTime;

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

        const shiftConfigs = await ShiftService.getShiftConfigs();
        shift = ShiftService.getShiftFromTime(startDateTime, shiftConfigs);
      }

      // Se atualizou itens
      if (data.items !== undefined) {
        for (const item of data.items) {
          if (item.assetId) {
            await this.validateAssetConflict(item.assetId, startDateTime, endDateTime, id, tx);
          }
        }

        await tx.requestItem.deleteMany({ where: { requestId: id } });
        if (data.items.length > 0) {
          await tx.requestItem.createMany({
            data: data.items.map((item) => ({
              requestId: id,
              itemId: item.itemId || null,
              assetId: item.assetId || null,
              label: item.label.trim(),
              quantity: item.quantity || 1,
              separated: item.separated || false,
            })),
          });
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
          assignedUser: { select: { id: true, name: true } },
        },
      });

      let validUpdateUserId: string | null = null;
      if (user?.id) {
        const u = await tx.user.findUnique({ where: { id: user.id }, select: { id: true } });
        if (u) validUpdateUserId = u.id;
      }

      await tx.auditLog.create({
        data: {
          userId: validUpdateUserId,
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

    const updated = await prisma.request.update({
      where: { id },
      data: { status: RequestStatus.CANCELADO },
    });

    let validCancelUserId: string | null = null;
    if (user?.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) validCancelUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        userId: validCancelUserId,
        action: "CANCEL_REQUEST",
        entity: "Request",
        entityId: id,
        details: { professor: existing.professorName, room: existing.room.name },
      },
    });

    return updated;
  }

  /**
   * Marcação de item separado (Checklist operacional de preparo)
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
        include: { item: true },
      });

      if (!requestItem || requestItem.requestId !== requestId) {
        throw new Error("Item de solicitação não encontrado.");
      }

      await tx.requestItem.update({
        where: { id: itemId },
        data: { separated },
      });

      // Checar todos os itens da solicitação
      const allItems = await tx.requestItem.findMany({
        where: { requestId },
        include: { item: true },
      });

      // Itens FIXED_IN_ROOM não bloqueiam a prontidão
      const mobileItems = allItems.filter(
        (i) => !i.item || i.item.logisticsType === ItemLogisticsType.MOBILE_STOCK
      );

      const allMobileSeparated =
        mobileItems.length === 0 || mobileItems.every((i) => (i.id === itemId ? separated : i.separated));

      const request = await tx.request.findUniqueOrThrow({ where: { id: requestId } });

      let newStatus = request.status;
      if (allMobileSeparated && request.status === RequestStatus.AGENDADO) {
        newStatus = RequestStatus.PREPARADO;
      } else if (!allMobileSeparated && request.status === RequestStatus.PREPARADO) {
        newStatus = RequestStatus.EM_PREPARACAO;
      }

      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: { status: newStatus },
        include: {
          items: { include: { item: true, asset: true } },
          room: true,
          assignedUser: true,
        },
      });

      if (newStatus === RequestStatus.PREPARADO && request.status !== RequestStatus.PREPARADO) {
        await tx.auditLog.create({
          data: {
            userId,
            action: "MARK_REQUEST_PREPARED",
            entity: "Request",
            entityId: requestId,
            details: { message: "Todos os itens móveis foram separados. Solicitação marcada como PREPARADA." },
          },
        });
      }

      return updatedRequest;
    });
  }

  /**
   * Confirmação e revisão de solicitação importada do calendário legado
   */
  static async confirmReview(
    id: string,
    data: RequestLegacyConfirmInput,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id },
        include: { room: true },
      });

      if (!request) {
        throw new Error("Solicitação não encontrada.");
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
        },
      });

      let validConfirmUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (u) validConfirmUserId = u.id;
      }

      await tx.auditLog.create({
        data: {
          userId: validConfirmUserId,
          action: "CONFIRM_IMPORTED_REQUEST",
          entity: "Request",
          entityId: id,
          details: { professor: data.professorName, room: updated.room.name },
        },
      });

      return updated;
    });
  }

  /**
   * Marca sincronização de solicitação
   */
  static async retrySync(id: string) {
    const request = await prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error("Solicitação não encontrada.");
    }

    return await prisma.request.update({
      where: { id },
      data: {
        syncStatus: "SYNCED",
      },
    });
  }
}
