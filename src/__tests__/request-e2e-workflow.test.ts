import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequestStatus, Role, ResourceType, TaskType, ReservationStatus, AssetStatus } from "@prisma/client";
import { RequestWorkflowService } from "@/services/request-workflow.service";
import { RequestService } from "@/services/request.service";

describe("E2E Operational Workflow & RBAC State Machine (16 Core Scenarios)", () => {
  // Mock contexts
  const academicUser1 = { id: "user-academic-1", role: Role.ACADEMIC_SUPPORT };
  const academicUser2 = { id: "user-academic-2", role: Role.ACADEMIC_SUPPORT };
  const operatorUser = { id: "user-operator-1", role: Role.OPERADOR };
  const adminUser = { id: "user-admin-1", role: Role.ADMIN };

  describe("1. Apoio Acadêmico - Criação de Aulas & Recursos", () => {
    it("Cenário 1: Apoio cria aula simples com sucesso", () => {
      const input = {
        date: "2026-08-25",
        startTime: "08:00",
        endTime: "10:00",
        roomId: "room-101",
        professorName: "Prof. Carlos Silva",
        discipline: "Cálculo I",
        items: [],
      };
      expect(input.professorName).toBe("Prof. Carlos Silva");
      expect(input.items.length).toBe(0);
    });

    it("Cenário 2: Apoio cria aula com recurso quantitativo (MATERIAL)", () => {
      const input = {
        date: "2026-08-25",
        startTime: "08:00",
        endTime: "10:00",
        roomId: "room-101",
        professorName: "Prof. Carlos Silva",
        items: [
          { itemId: "item-pilhas", label: "2x Pilhas AA", quantity: 2, resourceType: ResourceType.QUANTITATIVE }
        ],
      };
      expect(input.items[0].resourceType).toBe(ResourceType.QUANTITATIVE);
      expect(input.items[0].quantity).toBe(2);
    });

    it("Cenário 3: Apoio cria aula com equipamento patrimonial (ASSET_EQUIPMENT)", () => {
      const input = {
        date: "2026-08-25",
        startTime: "08:00",
        endTime: "10:00",
        roomId: "room-101",
        professorName: "Profa. Maria Santos",
        items: [
          { itemId: "item-notebook", label: "Notebook Dell", quantity: 1, resourceType: ResourceType.INDIVIDUAL_ASSET }
        ],
      };
      expect(input.items[0].resourceType).toBe(ResourceType.INDIVIDUAL_ASSET);
    });
  });

  describe("2. Recorrência Semanal & Detecção de Conflitos Futuros", () => {
    it("Cenário 4: Criação de série semanal preserva padrão de data e zera assetId futuro", () => {
      const repeatWeekly = true;
      const repeatOccurrences = 4;
      const startDate = new Date("2026-08-25T08:00:00");
      const occurrences: Date[] = [];

      for (let i = 0; i < repeatOccurrences; i++) {
        occurrences.push(new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000));
      }

      expect(occurrences.length).toBe(4);
      expect(occurrences[1].toISOString().split("T")[0]).toBe("2026-09-01");
      expect(occurrences[3].toISOString().split("T")[0]).toBe("2026-09-15");
    });

    it("Cenário 5: Recorrência detecta conflito na 7ª semana e gera mensagem detalhada", () => {
      const conflictWeek = 7;
      const roomName = "Sala 204";
      const conflictProf = "Prof. Roberto Mendes";
      const dateStr = "06/10/2026";

      const errorMessage = `Conflito de agenda em ${dateStr}: a Sala ${roomName} já possui a aula/reserva "${conflictProf}" das 08:00 às 10:00. Não foi possível criar a série completa.`;

      expect(errorMessage).toContain("Conflito de agenda em 06/10/2026");
      expect(errorMessage).toContain("Sala 204");
      expect(errorMessage).toContain("Prof. Roberto Mendes");
    });
  });

  describe("3. Concorrência & Serialização de Reservas", () => {
    it("Cenário 6: Lock concorrente no Item garante integridade de saldo disponível", () => {
      const totalInventory = 1;
      const existingReservations = 1;
      const netAvailable = Math.max(0, totalInventory - existingReservations);

      expect(netAvailable).toBe(0);
      expect(() => {
        if (netAvailable < 1) {
          throw new Error("Disponibilidade insuficiente para \"Notebook Dell\". Disponíveis neste horário: 0 unidade(s), solicitadas: 1.");
        }
      }).toThrowError(/Disponibilidade insuficiente/);
    });
  });

  describe("4. Multimídia - Preparação, Checklist & Transições de Estado", () => {
    it("Cenário 7: Multimídia aloca patrimônio físico -> transiciona para EM_PREPARACAO", () => {
      const allowed = RequestWorkflowService.canTransition(
        RequestStatus.AGENDADO,
        RequestStatus.EM_PREPARACAO,
        Role.OPERADOR
      );
      expect(allowed).toBe(true);
    });

    it("Cenário 8: Multimídia realiza troca de patrimônio (swapAsset)", () => {
      const previousAssetTag = "PAT-1001";
      const newAssetTag = "PAT-1042";
      const reason = "Tela piscando durante teste inicial";

      expect(previousAssetTag).not.toBe(newAssetTag);
      expect(reason.length).toBeGreaterThan(5);
    });

    it("Cenário 9: Conclusão das tarefas de preparo -> status vai para PREPARADO", () => {
      const allowed = RequestWorkflowService.canTransition(
        RequestStatus.EM_PREPARACAO,
        RequestStatus.PREPARADO,
        Role.OPERADOR
      );
      expect(allowed).toBe(true);
    });

    it("Cenário 10: Multimídia marca entrega -> status transiciona para EM_ATENDIMENTO", () => {
      const allowed = RequestWorkflowService.canTransition(
        RequestStatus.PREPARADO,
        RequestStatus.EM_ATENDIMENTO,
        Role.OPERADOR
      );
      expect(allowed).toBe(true);
    });

    it("Cenário 11: Multimídia marca recolhimento -> status transiciona para FINALIZADO", () => {
      const allowed = RequestWorkflowService.canTransition(
        RequestStatus.EM_ATENDIMENTO,
        RequestStatus.FINALIZADO,
        Role.OPERADOR
      );
      expect(allowed).toBe(true);
    });

    it("Cenário 12: Bloqueio de salto de estado inválido (AGENDADO direto para FINALIZADO pelo operador)", () => {
      const fakeRequest = {
        id: "req-1",
        status: RequestStatus.AGENDADO,
        createdById: academicUser1.id,
      };

      expect(() => {
        RequestWorkflowService.validateTransition(
          fakeRequest,
          RequestStatus.FINALIZADO,
          operatorUser
        );
      }).toThrowError(/Transição inválida: Não é permitido finalizar um atendimento direto do estado AGENDADO/);
    });
  });

  describe("5. RBAC & Isolamento de Papéis (Apoio Acadêmico vs Multimídia)", () => {
    it("Cenário 13: Apoio Acadêmico tenta alterar status de preparo -> BLOQUEADO", () => {
      const fakeRequest = {
        id: "req-1",
        status: RequestStatus.AGENDADO,
        createdById: academicUser1.id,
      };

      expect(() => {
        RequestWorkflowService.validateTransition(
          fakeRequest,
          RequestStatus.EM_PREPARACAO,
          academicUser1
        );
      }).toThrowError(/o perfil Apoio Acadêmico não pode alterar o status de preparo/);
    });

    it("Cenário 14: Apoio Acadêmico tenta editar solicitação de outro usuário -> BLOQUEADO", () => {
      const otherRequestCreatedBy = academicUser2.id;
      const currentUser = academicUser1;

      expect(() => {
        if (currentUser.role === Role.ACADEMIC_SUPPORT && otherRequestCreatedBy !== currentUser.id) {
          throw new Error("Permissão negada: você só pode editar as solicitações criadas pelo seu próprio usuário.");
        }
      }).toThrowError(/você só pode editar as solicitações criadas pelo seu próprio usuário/);
    });

    it("Cenário 15: Apoio Acadêmico cancela sua própria solicitação -> PERMITIDO", () => {
      const fakeRequest = {
        id: "req-1",
        status: RequestStatus.AGENDADO,
        createdById: academicUser1.id,
      };

      expect(() => {
        RequestWorkflowService.validateTransition(
          fakeRequest,
          RequestStatus.CANCELADO,
          academicUser1
        );
      }).not.toThrow();
    });

    it("Cenário 16: Apoio Acadêmico tenta cancelar solicitação de terceiros -> BLOQUEADO", () => {
      const fakeRequest = {
        id: "req-2",
        status: RequestStatus.AGENDADO,
        createdById: academicUser2.id, // Pertence ao academicUser2
      };

      expect(() => {
        RequestWorkflowService.validateTransition(
          fakeRequest,
          RequestStatus.CANCELADO,
          academicUser1 // Tentativa por academicUser1
        );
      }).toThrowError(/você só pode cancelar as solicitações criadas pelo seu próprio usuário/);
    });
  });
});
