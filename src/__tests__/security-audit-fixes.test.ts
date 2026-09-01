import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role, PresenceMethod } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { POST as testBiometricsRoute } from "@/app/api/v1/biometrics/test/route";
import { GET as getRequestsRoute, POST as createRequestRoute } from "@/app/api/v1/requests/route";
import { GET as getRequestByIdRoute } from "@/app/api/v1/requests/[id]/route";
import { POST as publicPresenceRoute } from "@/app/api/v1/public/events/[id]/presence/route";
import { POST as presentationBootstrapRoute } from "@/app/api/v1/public/presentation/bootstrap/route";
import { RequestService } from "@/services/request.service";
import { DrawService } from "@/services/draw.service";
import { DrawEligibilityService } from "@/services/draw-eligibility.service";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { isPrivateOrInternalIp, isPrivateOrInternalHost, validateSafeUrl, validateSafeUrlAsync, safeFetch } from "@/lib/ssrf";
import { validateRequestOrigin, getAllowedOrigins } from "@/lib/request-security";
import { safeCompareTokens } from "@/lib/presentation-guard";
import { generateParticipantQrToken, verifyParticipantQrToken } from "@/lib/qr-token";
import { BiometricApiService } from "@/services/biometric-api.service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import dns from "dns";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    event: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    eventUser: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    eventParticipant: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    presence: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    prize: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    draw: { findUnique: vi.fn(), delete: vi.fn(), count: vi.fn() },
    winner: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    request: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    requestTask: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    requestItem: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/biometric-api.service", () => ({
  BiometricApiService: {
    testBiometrics: vi.fn().mockResolvedValue({ success: true, recognized: true }),
    recognizeFace: vi.fn().mockResolvedValue({
      success: true,
      status: "REGISTERED",
      message: "Presença confirmada",
      person: { id: "person-123", name: "Maria Silva", category: "Aluno" },
      confidence: 0.94,
      distance: 0.28,
      method: "FACE",
    }),
  },
}));

describe("Comprehensive Security Remediation Tests (SEC-01 to SEC-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SEC-01: Event Isolation (assertEventAccess & EventUser)", () => {
    it("deve permitir acesso global para ADMIN", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      const result = await assertEventAccess("evt-1", { id: "admin-1", role: Role.ADMIN });
      expect(result.authorized).toBe(true);
    });

    it("deve permitir acesso global para GESTOR", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      const result = await assertEventAccess("evt-1", { id: "gestor-1", role: Role.GESTOR });
      expect(result.authorized).toBe(true);
    });

    it("deve permitir acesso para OPERADOR com permissão correspondente", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      const result = await assertEventAccess("evt-1", { id: "oper-1", role: Role.OPERADOR }, {
        requiredPermission: EVENT_PERMISSIONS.EVENTS_VIEW,
      });
      expect(result.authorized).toBe(true);
    });

    it("deve PERMITIR acesso aos eventos para perfil EVENTOS quando VINCULADO via EventUser", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      vi.mocked(prisma.eventUser.findUnique).mockResolvedValue({ id: "eu-1", userId: "user-eventos-1", eventId: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "user-eventos-1", role: Role.EVENTOS });
      expect(result.authorized).toBe(true);
    });

    it("deve BLOQUEAR com 403 para perfil EVENTOS quando NÃO VINCULADO ao evento", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);
      vi.mocked(prisma.eventUser.findUnique).mockResolvedValue(null);

      const result = await assertEventAccess("evt-1", { id: "user-eventos-unassigned", role: Role.EVENTOS });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 para ACADEMIC_SUPPORT no módulo de eventos", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-alheio" } as any);

      const result = await assertEventAccess("evt-alheio", { id: "user-acad-1", role: Role.ACADEMIC_SUPPORT });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 mutação para perfil CONSULTA", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess(
        "evt-1",
        { id: "consulta-1", role: Role.CONSULTA },
        { isMutation: true }
      );
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 perfil CONSULTA se a rota exigir permissão de escrita (P2 defensivo)", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess(
        "evt-1",
        { id: "consulta-1", role: Role.CONSULTA },
        { requiredPermission: EVENT_PERMISSIONS.PRIZES_CREATE }
      );
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 acesso ao módulo de eventos por ACADEMIC_SUPPORT", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "evt-1" } as any);

      const result = await assertEventAccess("evt-1", { id: "ac-1", role: Role.ACADEMIC_SUPPORT });
      expect(result.authorized).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });
  });

  describe("SEC-02: Deep Anti-SSRF Protection (DNS, IP Ranges, Redirects)", () => {
    it("deve bloquear IPs e faixas privadas IPv4", () => {
      expect(isPrivateOrInternalIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrInternalIp("192.168.1.1")).toBe(true);
      expect(isPrivateOrInternalIp("169.254.169.254")).toBe(true); // Cloud metadata
      expect(isPrivateOrInternalIp("100.64.0.1")).toBe(true); // CGNAT
      expect(isPrivateOrInternalIp("0.0.0.0")).toBe(true);
      expect(isPrivateOrInternalIp("255.255.255.255")).toBe(true);
    });

    it("deve bloquear IPs e faixas privadas IPv6", () => {
      expect(isPrivateOrInternalIp("::1")).toBe(true);
      expect(isPrivateOrInternalIp("::")).toBe(true);
      expect(isPrivateOrInternalIp("fe80::1")).toBe(true); // Link-local
      expect(isPrivateOrInternalIp("fc00::1")).toBe(true); // Unique Local Address
      expect(isPrivateOrInternalIp("fd12:3456:789a::1")).toBe(true);
      expect(isPrivateOrInternalIp("::ffff:192.168.1.1")).toBe(true); // IPv4-mapped IPv6
      expect(isPrivateOrInternalIp("::ffff:127.0.0.1")).toBe(true);
    });

    it("deve permitir IPs públicos legítimos", () => {
      expect(isPrivateOrInternalIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrInternalIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrInternalIp("2606:4700:4700::1111")).toBe(false);
    });

    it("deve bloquear hostnames internos textuais", () => {
      expect(isPrivateOrInternalHost("localhost")).toBe(true);
      expect(isPrivateOrInternalHost("app.localhost")).toBe(true);
      expect(isPrivateOrInternalHost("server.local")).toBe(true);
      expect(isPrivateOrInternalHost("postgres")).toBe(true);
      expect(isPrivateOrInternalHost("biometric-api")).toBe(true);
      expect(isPrivateOrInternalHost("metadata.google.internal")).toBe(true);
    });

    it("deve validar assincronamente resolução de DNS e rejeitar se apontar para IP privado", async () => {
      const lookupSpy = vi.spyOn(dns.promises, "lookup").mockResolvedValueOnce([
        { address: "192.168.1.50", family: 4 },
      ] as any);

      const check = await validateSafeUrlAsync("https://evil-rebind.com/webhook");
      expect(check.isSafe).toBe(false);
      expect(check.error).toContain("IP interno/privado");
      lookupSpy.mockRestore();
    });

    it("deve validar assincronamente resolução de DNS e aceitar se apontar para IP público", async () => {
      const lookupSpy = vi.spyOn(dns.promises, "lookup").mockResolvedValueOnce([
        { address: "93.184.216.34", family: 4 },
      ] as any);

      const check = await validateSafeUrlAsync("https://api.public-service.com/webhook");
      expect(check.isSafe).toBe(true);
      lookupSpy.mockRestore();
    });
  });

  describe("SEC-03: CSRF & Origin Validation", () => {
    it("deve permitir requisições de mesma origem", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const error = validateRequestOrigin(req);
      expect(error).toBeNull();
    });

    it("deve BLOQUEAR com 403 requisição mutante com Origin não autorizada (Anti-CSRF)", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          origin: "https://attacker-website.com",
        },
      });

      const error = validateRequestOrigin(req);
      expect(error).not.toBeNull();
      expect(error?.status).toBe(403);
    });

    it("deve BLOQUEAR com 403 requisição mutante com Referer externo não autorizado", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "DELETE",
        headers: {
          referer: "https://evil-hacker.com/phishing",
        },
      });

      const error = validateRequestOrigin(req);
      expect(error).not.toBeNull();
      expect(error?.status).toBe(403);
    });

    it("deve permitir requisições com API Key sem validação de browser origin", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/external/webhooks/test", {
        method: "POST",
        headers: {
          "x-api-key": "unifap_live_sample_key",
          origin: "https://external-client.com",
        },
      });

      const error = validateRequestOrigin(req);
      expect(error).toBeNull();
    });
  });

  describe("SEC-04: Timing-Safe Presentation Token Validation", () => {
    it("deve validar tokens idênticos como verdadeiros", () => {
      const token = "super_secret_presentation_token_123456";
      expect(safeCompareTokens(token, token)).toBe(true);
    });

    it("deve rejeitar tokens divergentes de mesmo tamanho", () => {
      const tokenA = "super_secret_presentation_token_123456";
      const tokenB = "super_secret_presentation_token_999999";
      expect(safeCompareTokens(tokenA, tokenB)).toBe(false);
    });

    it("deve rejeitar tokens de tamanhos diferentes", () => {
      const tokenA = "short_token";
      const tokenB = "much_longer_secret_token_123456";
      expect(safeCompareTokens(tokenA, tokenB)).toBe(false);
    });

    it("deve rejeitar tokens nulos ou indefinidos", () => {
      expect(safeCompareTokens(null, "token")).toBe(false);
      expect(safeCompareTokens("token", undefined)).toBe(false);
      expect(safeCompareTokens("", "")).toBe(false);
    });

    it("deve rejeitar bootstrap de apresentação com token inválido", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        name: "Semana de TI",
        presentationToken: "legit_token_123",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/public/presentation/bootstrap", {
        method: "POST",
        body: JSON.stringify({ eventId: "ev-1", token: "wrong_token_999" }),
      });

      const res = await presentationBootstrapRoute(req);
      expect(res.status).toBe(401);
    });
  });

  describe("SEC-05: Server Biometric Authority & Presence Integrity", () => {
    it("deve BLOQUEAR com 403 registro de presença MANUAL no totem público", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: "OPEN",
        presentationToken: "valid_token",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-1/presence?token=valid_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "MANUAL",
          personId: "person-1",
        }),
      });

      const res = await publicPresenceRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res?.status).toBe(403);
    });

    it("deve BLOQUEAR envio de method=FACE sem captura biométrica (crop)", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: "OPEN",
        presentationToken: "valid_token",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-1/presence?token=valid_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "FACE",
          personId: "person-1",
          confidence: 1.0, // Cliente tentando forjar
        }),
      });

      const res = await publicPresenceRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res?.status).toBe(400);
      const json = await res?.json();
      expect(json.error).toContain("envio da imagem facial capturada");
    });

    it("deve aceitar captura biométrica válida e consultar BiometricApiService no servidor", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: "OPEN",
        presentationToken: "valid_token",
      } as any);

      const formData = new FormData();
      formData.append("crop", new Blob(["fake-image-bytes"], { type: "image/jpeg" }));

      const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-1/presence?token=valid_token", {
        method: "POST",
        body: formData,
      });

      const res = await publicPresenceRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res?.status).toBe(200);
      const json = await res?.json();
      expect(json.status).toBe("REGISTERED");
      expect(json.person.id).toBe("person-123");
      expect(json.confidence).toBe(0.94);
      expect(BiometricApiService.recognizeFace).toHaveBeenCalled();
    });

    it("deve aceitar QR Code com assinatura digital válida", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: "OPEN",
        presentationToken: "valid_token",
      } as any);

      vi.mocked(prisma.eventParticipant.findUnique).mockResolvedValue({
        id: "part-1",
        eventId: "ev-1",
        personId: "person-1",
        person: { id: "person-1", name: "João Silva", category: "Geral", active: true },
      } as any);

      vi.mocked(prisma.presence.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.presence.create).mockResolvedValue({
        id: "pres-1",
        eventId: "ev-1",
        personId: "person-1",
        method: PresenceMethod.QR_CODE,
      } as any);

      const validQrToken = generateParticipantQrToken("ev-1", "person-1");

      const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-1/presence?token=valid_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "QR_CODE",
          qrToken: validQrToken,
        }),
      });

      const res = await publicPresenceRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res?.status).toBe(200);
      const json = await res?.json();
      expect(json.status).toBe("REGISTERED");
      expect(prisma.presence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: PresenceMethod.QR_CODE,
          }),
        })
      );
    });

    it("deve rejeitar QR Code com assinatura adulterada", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "ev-1",
        status: "OPEN",
        presentationToken: "valid_token",
      } as any);

      const tamperedQrToken = "ev-1:person-1:123456:deadbeefbadhash";

      const req = new NextRequest("http://localhost:3000/api/v1/public/events/ev-1/presence?token=valid_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "QR_CODE",
          qrToken: tamperedQrToken,
        }),
      });

      const res = await publicPresenceRoute(req, { params: Promise.resolve({ id: "ev-1" }) });
      expect(res?.status).toBe(401);
    });

    it("DrawEligibilityService deve filtrar apenas presenças faciais válidas e com confiança positiva", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        allowRepeatWinners: false,
      } as any);

      vi.mocked(prisma.eventParticipant.findMany).mockResolvedValue([
        {
          id: "part-1",
          personId: "p-1",
          ticketNumber: 1,
          person: {
            id: "p-1",
            name: "Face Valid",
            active: true,
            presences: [{ method: PresenceMethod.FACE, confidence: 0.95, status: "REGISTERED" }],
          },
        },
        {
          id: "part-2",
          personId: "p-2",
          ticketNumber: 2,
          person: {
            id: "p-2",
            name: "Manual Presence",
            active: true,
            presences: [{ method: PresenceMethod.MANUAL, confidence: null, status: "REGISTERED" }],
          },
        },
        {
          id: "part-3",
          personId: "p-3",
          ticketNumber: 3,
          person: {
            id: "p-3",
            name: "Zero Confidence Face",
            active: true,
            presences: [{ method: PresenceMethod.FACE, confidence: 0, status: "REGISTERED" }],
          },
        },
      ] as any);

      const eligible = await DrawEligibilityService.getEligibleParticipants({
        eventId: "ev-1",
        requirePresence: true,
        requireFacialPresenceOnly: true,
      });

      expect(eligible.length).toBe(1);
      expect(eligible[0].personId).toBe("p-1");
      expect(eligible[0].name).toBe("Face Valid");
    });
  });

  describe("SEC-06: Anti-IDOR em Entidades Filhas", () => {
    it("deve rejeitar deleteTask se a tarefa pertencer a outro requestId", async () => {
      vi.mocked(prisma.requestTask.findUnique).mockResolvedValue({
        id: "task-1",
        requestId: "outro-request",
      } as any);

      await expect(
        RequestService.deleteTask("req-alvo", "task-1", "user-1")
      ).rejects.toThrow("Tarefa operacional não encontrada.");
    });

    it("deve rejeitar addTask se o requestId não existir", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(null);

      await expect(
        RequestService.addTask("req-inexistente", { title: "Test task", taskType: "CUSTOM" }, "user-1")
      ).rejects.toThrow("Solicitação de atendimento não encontrada.");
    });

    it("deve rejeitar cancelDraw se o sorteio pertencer a outro eventId", async () => {
      vi.mocked(prisma.draw.findUnique).mockResolvedValue({
        id: "draw-1",
        eventId: "outro-evento",
        prize: { quantity: 1 },
        winners: [],
      } as any);

      await expect(
        DrawService.cancelDraw({ drawId: "draw-1", eventId: "evento-atual" })
      ).rejects.toThrow("Sorteio não encontrado.");
    });

    it("deve rejeitar deliverPrize se o ganhador pertencer a outro eventId", async () => {
      vi.mocked(prisma.winner.findUnique).mockResolvedValue({
        id: "win-1",
        eventId: "outro-evento",
      } as any);

      await expect(
        DrawService.deliverPrize({ winnerId: "win-1", eventId: "evento-atual" })
      ).rejects.toThrow("Registro de premiação não encontrado.");
    });
  });

  describe("XSS: Sanitização de URL em formatImageUrl", () => {
    it("deve neutralizar esquemas perigosos (javascript:)", () => {
      expect(normalizeImageUrl("javascript:alert(document.domain)")).toBe("");
      expect(normalizeImageUrl("JAVASCRIPT:alert(1)")).toBe("");
    });

    it("deve neutralizar esquemas data: perigosos para HTML/SVG", () => {
      expect(normalizeImageUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("");
      expect(normalizeImageUrl("data:image/svg+xml;utf8,<svg onload=alert(1)>")).toBe("");
    });

    it("deve permitir URLs e imagens legítimas", () => {
      expect(normalizeImageUrl("https://exemplo.com/foto.jpg")).toBe("https://exemplo.com/foto.jpg");
      expect(normalizeImageUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
      expect(normalizeImageUrl("/brand/logo.png")).toBe("/brand/logo.png");
    });
  });
});
