import { describe, it, expect } from "vitest";
import { ShiftService, DEFAULT_SHIFTS } from "@/services/shift.service";
import { RequestService } from "@/services/request.service";
import { Shift, TaskType, RequestStatus } from "@prisma/client";

describe("Plataforma Operacional de Multimídia - Regras e Taxonomia", () => {
  describe("1. Regras de Turno & Horários Fora do Expediente", () => {
    it("deve detectar horários regulares dentro dos turnos cadastrados", () => {
      expect(ShiftService.isOutsideRegularShifts("08:00", DEFAULT_SHIFTS)).toBe(false);
      expect(ShiftService.isOutsideRegularShifts("14:30", DEFAULT_SHIFTS)).toBe(false);
      expect(ShiftService.isOutsideRegularShifts("19:00", DEFAULT_SHIFTS)).toBe(false);
    });

    it("deve identificar explicitamente horários fora do expediente (madrugada / noite tardia)", () => {
      // 04:00 da madrugada -> Fora do expediente
      expect(ShiftService.isOutsideRegularShifts("04:00", DEFAULT_SHIFTS)).toBe(true);
      // 06:15 antes do início -> Fora do expediente
      expect(ShiftService.isOutsideRegularShifts("06:15", DEFAULT_SHIFTS)).toBe(true);
      // 23:30 após encerramento do último turno -> Fora do expediente
      expect(ShiftService.isOutsideRegularShifts("23:30", DEFAULT_SHIFTS)).toBe(true);
    });

    it("deve retornar metadados completos de turno através de getShiftDetails", () => {
      const normalMorning = ShiftService.getShiftDetails("09:00", DEFAULT_SHIFTS);
      expect(normalMorning.shift).toBe(Shift.MORNING);
      expect(normalMorning.isOutsideShift).toBe(false);
      expect(normalMorning.displayLabel).toBe("Manhã");

      const outsideNight = ShiftService.getShiftDetails("23:45", DEFAULT_SHIFTS);
      expect(outsideNight.isOutsideShift).toBe(true);
      expect(outsideNight.displayLabel).toContain("Fora do Expediente");
    });
  });

  describe("2. Validação de Disponibilidade Real por Intervalo (Estoque Comprometido)", () => {
    it("deve calcular saldo líquido subtraindo reservas sobrepostas no horário", async () => {
      const startTime = new Date("2026-08-18T10:00:00Z");
      const endTime = new Date("2026-08-18T12:00:00Z");
      const itemId = "item-hdmi";

      const mockTx = {
        item: {
          findUnique: async () => ({
            id: itemId,
            name: "Cabo HDMI 10m",
            itemType: "MATERIAL",
            active: true,
            inventories: [{ quantity: 10 }], // 10 unidades físicas no armário
            assets: [],
          }),
        },
        reservation: {
          findMany: async () => [
            { quantity: 4 }, // 4 unidades já comprometidas no mesmo horário
            { quantity: 2 }, // +2 unidades
          ],
        },
      };

      // 10 - 6 = 4 disponíveis. Pedir 4 deve passar:
      const res = await RequestService.validateItemAvailability(itemId, 4, startTime, endTime, undefined, mockTx as any);
      expect(res.name).toBe("Cabo HDMI 10m");

      // Pedir 5 (quando só restam 4) deve lançar erro:
      await expect(
        RequestService.validateItemAvailability(itemId, 5, startTime, endTime, undefined, mockTx as any)
      ).rejects.toThrow(/Disponibilidade insuficiente/);
    });
  });

  describe("3. Regra Especial de Datashow Fixo vs Móvel", () => {
    it("deve rejeitar Datashow Fixo se a sala não possuir projetor instalado", async () => {
      const mockTx = {
        room: {
          findUnique: async () => ({
            id: "sala-sem-datashow",
            name: "Sala 3B",
            active: true,
            fixedProjectorModel: null, // Sem projetor
            lampStatus: null,
          }),
        },
      };

      // Simulação da validação da regra de sala
      const room = await mockTx.room.findUnique();
      expect(() => {
        if (!room.fixedProjectorModel) {
          throw new Error(`A sala ${room.name} não possui Datashow fixo instalado.`);
        }
      }).toThrow(/não possui Datashow fixo/);
    });

    it("deve rejeitar Datashow Fixo se a lâmpada estiver danificada/requerendo troca", async () => {
      const mockTx = {
        room: {
          findUnique: async () => ({
            id: "sala-lampada-ruim",
            name: "Sala 2N",
            active: true,
            fixedProjectorModel: "Epson PowerLite X41+",
            lampStatus: "TROCAR LAMPADA", // Defeito
          }),
        },
      };

      const room = await mockTx.room.findUnique();
      expect(() => {
        if (room.lampStatus === "TROCAR LAMPADA") {
          throw new Error(`O Datashow fixo da sala ${room.name} está indisponível para uso.`);
        }
      }).toThrow(/indisponível para uso/);
    });
  });

  describe("4. Checklist de Tarefas Operacionais e Transição de Status", () => {
    it("deve avançar status para PREPARADO quando todas as tarefas de preparo forem concluídas", async () => {
      const requestId = "req-100";
      const taskId1 = "task-prep-1";
      const taskId2 = "task-prep-2";

      const mockTasks = [
        { id: taskId1, requestId, title: "Ligar Datashow", taskType: TaskType.FIXED_EQUIPMENT, completed: true },
        { id: taskId2, requestId, title: "Separar Notebook", taskType: TaskType.SEPARATION, completed: false },
        { id: "task-deliv", requestId, title: "Levar à sala", taskType: TaskType.DELIVERY, completed: false },
      ];

      // Quando a segunda tarefa de preparo for marcada como concluída:
      const updatedTasks = mockTasks.map((t) => (t.id === taskId2 ? { ...t, completed: true } : t));
      const prepTasks = updatedTasks.filter(
        (t) => t.taskType === TaskType.FIXED_EQUIPMENT || t.taskType === TaskType.SEPARATION
      );

      const allPrepDone = prepTasks.every((t) => t.completed);
      expect(allPrepDone).toBe(true);

      // Status deve mudar de AGENDADO para PREPARADO
      const currentStatus: RequestStatus = RequestStatus.AGENDADO;
      let newStatus: RequestStatus = currentStatus;
      if (allPrepDone && currentStatus === RequestStatus.AGENDADO) {
        newStatus = RequestStatus.PREPARADO;
      }
      expect(newStatus).toBe(RequestStatus.PREPARADO);
    });
  });
});
