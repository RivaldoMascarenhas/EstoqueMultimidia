import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getUsers, POST as createUser } from "@/app/api/v1/users/route";
import { DELETE as deleteUser } from "@/app/api/v1/users/[id]/route";
import { PATCH as updatePassword } from "@/app/api/v1/users/[id]/password/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockImplementation((pwd, hash) => Promise.resolve(pwd === "correctPassword123" && hash !== "same")),
    hash: vi.fn().mockResolvedValue("$2a$10$hashed"),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("Users API - Security & Role Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/users", () => {
    it("deve retornar 401 se não autenticado", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/v1/users");
      const res = await getUsers(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("deve retornar 403 se usuário não for ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "op-1", role: Role.OPERADOR },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users");
      const res = await getUsers(req);

      expect(res.status).toBe(403);
    });

    it("deve listar usuários com sucesso para ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "adm-1", role: Role.ADMIN },
      } as any);

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        {
          id: "u-1",
          name: "Rivaldo",
          email: "rivaldo@unifap.br",
          role: Role.ADMIN,
          active: true,
          mustChangePassword: false,
          avatarUrl: null,
          createdAt: new Date(),
          _count: { loansCreated: 5, movements: 2, maintenances: 1 },
        },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users");
      const res = await getUsers(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
    });
  });

  describe("POST /api/v1/users", () => {
    it("deve retornar 403 se não for ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "gest-1", role: Role.GESTOR },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: "Novo", email: "novo@unifap.br", password: "password123" }),
      });
      const res = await createUser(req);

      expect(res.status).toBe(403);
    });

    it("deve validar tamanho mínimo de senha e formato", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "adm-1", role: Role.ADMIN },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: "Novo", email: "novo@unifap.br", password: "123" }),
      });
      const res = await createUser(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/no mínimo 8 caracteres/);
    });

    it("deve exigir que a senha contenha letras e números", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "adm-1", role: Role.ADMIN },
      } as any);

      const reqOnlyNumbers = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: "Novo", email: "novo@unifap.br", password: "12345678" }),
      });
      const resOnlyNumbers = await createUser(reqOnlyNumbers);
      expect(resOnlyNumbers.status).toBe(400);
      const jsonNumbers = await resOnlyNumbers.json();
      expect(jsonNumbers.error).toMatch(/pelo menos uma letra/);

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "adm-1", role: Role.ADMIN },
      } as any);

      const reqOnlyLetters = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: "Novo", email: "novo2@unifap.br", password: "passwordonly" }),
      });
      const resOnlyLetters = await createUser(reqOnlyLetters);
      expect(resOnlyLetters.status).toBe(400);
      const jsonLetters = await resOnlyLetters.json();
      expect(jsonLetters.error).toMatch(/pelo menos um número/);
    });
  });

  describe("DELETE /api/v1/users/[id]", () => {
    it("deve impedir auto-exclusão do próprio administrador", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "adm-1", role: Role.ADMIN },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users/adm-1", {
        method: "DELETE",
      });
      const res = await deleteUser(req, { params: Promise.resolve({ id: "adm-1" }) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/não pode excluir ou desativar sua própria conta/);
    });
  });

  describe("PATCH /api/v1/users/[id]/password", () => {
    it("deve permitir que o próprio usuário altere sua senha com formato válido", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "op-1", role: Role.OPERADOR },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "op-1",
        name: "Operador 1",
        email: "op1@unifap.br",
        passwordHash: "$2a$10$old_different_password_hash",
        mustChangePassword: false,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users/op-1/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "correctPassword123",
          newPassword: "newsecretpassword123",
        }),
      });
      const res = await updatePassword(req, { params: Promise.resolve({ id: "op-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("deve impedir que outro usuário sem role ADMIN altere a senha de terceiros", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "op-1", role: Role.OPERADOR },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/users/op-2/password", {
        method: "PATCH",
        body: JSON.stringify({ newPassword: "newsecretpassword123" }),
      });
      const res = await updatePassword(req, { params: Promise.resolve({ id: "op-2" }) });

      expect(res.status).toBe(403);
    });
  });
});
