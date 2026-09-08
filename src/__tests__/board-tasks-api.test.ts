import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getBoardTasks, POST as createBoardTask } from "@/app/api/v1/board-tasks/route";
import { 
  GET as getBoardTaskById, 
  PATCH as updateBoardTask, 
  DELETE as deleteBoardTask 
} from "@/app/api/v1/board-tasks/[id]/route";
import { GET as getTaskHistory } from "@/app/api/v1/board-tasks/[id]/history/route";
import { GET as getAssignableUsers } from "@/app/api/v1/board-tasks/users/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { Role, BoardTaskStatus, BoardTaskPriority } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    boardTask: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    boardTaskHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

function createReq(url: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {
    origin: "http://localhost:3000",
  };
  if (body) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Board Tasks (Quadro Kanban) - API & Security Test Suite", () => {
  const mockAdmin = {
    id: "admin-1",
    name: "Administrador Geral",
    email: "admin@unifap.br",
    role: Role.ADMIN,
    active: true,
    mustChangePassword: false,
    avatarUrl: null,
  };

  const mockGestor = {
    id: "gestor-1",
    name: "Gestor Multimídia",
    email: "gestor@unifap.br",
    role: Role.GESTOR,
    active: true,
    mustChangePassword: false,
    avatarUrl: null,
  };

  const mockOperador = {
    id: "op-1",
    name: "Operador Carlos",
    email: "carlos@unifap.br",
    role: Role.OPERADOR,
    active: true,
    mustChangePassword: false,
    avatarUrl: null,
  };

  const mockConsulta = {
    id: "cons-1",
    name: "Visitante Consulta",
    email: "consulta@unifap.br",
    role: Role.CONSULTA,
    active: true,
    mustChangePassword: false,
    avatarUrl: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(prisma.user.findUnique) as any).mockImplementation((args: any) => {
      const id = args?.where?.id;
      if (id === "admin-1") return Promise.resolve(mockAdmin);
      if (id === "gestor-1") return Promise.resolve(mockGestor);
      if (id === "op-1") return Promise.resolve(mockOperador);
      if (id === "cons-1") return Promise.resolve(mockConsulta);
      return Promise.resolve(null);
    });

    (vi.mocked(prisma.$transaction) as any).mockImplementation(async (cb: any) => cb(prisma));
  });

  describe("GET /api/v1/board-tasks", () => {
    it("deve retornar 401 se usuário não estiver autenticado", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = createReq("http://localhost:3000/api/v1/board-tasks");
      const res = await getBoardTasks(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("deve permitir leitura para perfil CONSULTA (somente leitura)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockConsulta } as any);
      vi.mocked(prisma.boardTask.findMany).mockResolvedValueOnce([
        {
          id: "task-1",
          title: "Organizar cabos HDMI",
          description: null,
          status: BoardTaskStatus.TODO,
          priority: BoardTaskPriority.MEDIUM,
          dueDate: null,
          orderIndex: 0,
          createdById: "admin-1",
          assignedToId: null,
          createdBy: { id: "admin-1", name: "Admin", email: "admin@unifap.br" },
          assignedTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks");
      const res = await getBoardTasks(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(1);
    });
  });

  describe("POST /api/v1/board-tasks (Criação)", () => {
    it("deve bloquear criação para perfil OPERADOR com status 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockOperador } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks", "POST", {
        title: "Testar novo projetor",
      });
      const res = await createBoardTask(req);

      expect(res.status).toBe(403);
    });

    it("deve bloquear criação para perfil CONSULTA com status 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockConsulta } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks", "POST", {
        title: "Tentativa de criar tarefa",
      });
      const res = await createBoardTask(req);

      expect(res.status).toBe(403);
    });

    it("deve rejeitar se título estiver vazio com status 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockAdmin } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks", "POST", {
        title: "",
      });
      const res = await createBoardTask(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("deve permitir que GESTOR crie tarefa com sucesso", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockGestor } as any);
      vi.mocked(prisma.boardTask.findFirst).mockResolvedValueOnce(null); // lastTask orderIndex 0
      vi.mocked(prisma.boardTask.create).mockResolvedValueOnce({
        id: "task-new",
        title: "Instalar suporte de TV bloco B",
        description: "Suporte articulado",
        status: BoardTaskStatus.TODO,
        priority: BoardTaskPriority.HIGH,
        dueDate: null,
        orderIndex: 0,
        createdById: "gestor-1",
        assignedToId: "gestor-1",
        createdBy: { id: "gestor-1", name: "Gestor", email: "gestor@unifap.br" },
        assignedTo: { id: "gestor-1", name: "Gestor", email: "gestor@unifap.br" },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks", "POST", {
        title: "Instalar suporte de TV bloco B",
        description: "Suporte articulado",
        priority: "HIGH",
      });
      const res = await createBoardTask(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item.id).toBe("task-new");
      expect(prisma.boardTaskHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CREATED",
            userId: "gestor-1",
          }),
        })
      );
    });
  });

  describe("PATCH /api/v1/board-tasks/[id] (Auto-reatribuição & Movimentação)", () => {
    const existingTask = {
      id: "task-1",
      title: "Verificar caixa de som 102",
      description: null,
      status: BoardTaskStatus.TODO,
      priority: BoardTaskPriority.MEDIUM,
      dueDate: null,
      orderIndex: 0,
      createdById: "admin-1",
      assignedToId: "admin-1",
      assignedTo: { id: "admin-1", name: "Administrador Geral" },
      createdBy: { id: "admin-1", name: "Admin", email: "admin@unifap.br" },
    };

    it("deve bloquear edição para perfil CONSULTA com status 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockConsulta } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/task-1", "PATCH", {
        status: "IN_PROGRESS",
      });
      const res = await updateBoardTask(req, { params: Promise.resolve({ id: "task-1" }) });

      expect(res.status).toBe(403);
    });

    it("REGRA CENTRAL: quando OPERADOR move tarefa, deve reatribuí-la automaticamente para o operador logado", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockOperador } as any);
      vi.mocked(prisma.boardTask.findUnique).mockResolvedValueOnce(existingTask as any);
      vi.mocked(prisma.boardTask.findFirst).mockResolvedValueOnce(null);

      vi.mocked(prisma.boardTask.update).mockResolvedValueOnce({
        ...existingTask,
        status: BoardTaskStatus.IN_PROGRESS,
        assignedToId: "op-1", // Reatribuído para Carlos
        assignedTo: { id: "op-1", name: "Operador Carlos", email: "carlos@unifap.br" },
      } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/task-1", "PATCH", {
        status: "IN_PROGRESS",
      });
      const res = await updateBoardTask(req, { params: Promise.resolve({ id: "task-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item.assignedToId).toBe("op-1");

      // Deve ter criado histórico de STATUS_CHANGE e REASSIGNED
      expect(prisma.boardTaskHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: "task-1",
            userId: "op-1",
            action: "STATUS_CHANGE",
            fromStatus: BoardTaskStatus.TODO,
            toStatus: BoardTaskStatus.IN_PROGRESS,
          }),
        })
      );
    });

    it("retorna 404 se tarefa não existir", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockOperador } as any);
      vi.mocked(prisma.boardTask.findUnique).mockResolvedValueOnce(null);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/not-found", "PATCH", {
        title: "Novo título",
      });
      const res = await updateBoardTask(req, { params: Promise.resolve({ id: "not-found" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/board-tasks/[id] (Exclusão)", () => {
    it("deve impedir OPERADOR de excluir tarefa (403)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockOperador } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/task-1", "DELETE");
      const res = await deleteBoardTask(req, { params: Promise.resolve({ id: "task-1" }) });

      expect(res.status).toBe(403);
    });

    it("deve permitir que ADMIN exclua tarefa", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockAdmin } as any);
      vi.mocked(prisma.boardTask.findUnique).mockResolvedValueOnce({
        id: "task-1",
        title: "Tarefa de teste",
      } as any);
      vi.mocked(prisma.boardTask.delete).mockResolvedValueOnce({ id: "task-1" } as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/task-1", "DELETE");
      const res = await deleteBoardTask(req, { params: Promise.resolve({ id: "task-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(prisma.boardTask.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
    });
  });

  describe("GET /api/v1/board-tasks/users (Operadores Elegíveis)", () => {
    it("deve listar operadores ativos para ADMIN, GESTOR e OPERADOR", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: mockOperador } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: "admin-1", name: "Admin", email: "admin@unifap.br", role: Role.ADMIN, avatarUrl: null },
        { id: "op-1", name: "Operador Carlos", email: "carlos@unifap.br", role: Role.OPERADOR, avatarUrl: null },
      ] as any);

      const req = createReq("http://localhost:3000/api/v1/board-tasks/users");
      const res = await getAssignableUsers(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(2);
    });
  });
});
