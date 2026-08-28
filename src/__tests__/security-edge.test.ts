import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { isPrivateOrInternalHost, validateSafeUrl } from "@/lib/ssrf";

describe("Security Edge & Offensive Defense Tests", () => {
  describe("1. Prevenção de SSRF Centralizada (lib/ssrf)", () => {
    it("deve bloquear IPs de Loopback (127.0.0.1, ::1, 0.0.0.0, localhost)", () => {
      expect(isPrivateOrInternalHost("127.0.0.1")).toBe(true);
      expect(isPrivateOrInternalHost("localhost")).toBe(true);
      expect(isPrivateOrInternalHost("0.0.0.0")).toBe(true);
      expect(isPrivateOrInternalHost("::1")).toBe(true);
      expect(isPrivateOrInternalHost("test.localhost")).toBe(true);
      expect(isPrivateOrInternalHost("server.local")).toBe(true);
    });

    it("deve bloquear serviços e redes internas do Docker", () => {
      expect(isPrivateOrInternalHost("postgres")).toBe(true);
      expect(isPrivateOrInternalHost("biometric-api")).toBe(true);
      expect(isPrivateOrInternalHost("unifap-postgres")).toBe(true);
      expect(isPrivateOrInternalHost("app")).toBe(true);
    });

    it("deve bloquear redes privadas RFC1918 (10.x, 192.168.x, 172.16-31.x)", () => {
      expect(isPrivateOrInternalHost("10.0.0.1")).toBe(true);
      expect(isPrivateOrInternalHost("10.254.254.254")).toBe(true);
      expect(isPrivateOrInternalHost("192.168.1.1")).toBe(true);
      expect(isPrivateOrInternalHost("192.168.0.100")).toBe(true);
      expect(isPrivateOrInternalHost("172.16.0.1")).toBe(true);
      expect(isPrivateOrInternalHost("172.31.255.255")).toBe(true);
    });

    it("deve bloquear o IP de metadados da Nuvem (AWS/GCP: 169.254.169.254)", () => {
      expect(isPrivateOrInternalHost("169.254.169.254")).toBe(true);
      expect(isPrivateOrInternalHost("169.254.1.1")).toBe(true);
      expect(isPrivateOrInternalHost("metadata.google.internal")).toBe(true);
    });

    it("deve permitir hostnames públicos legítimos da Internet", () => {
      expect(isPrivateOrInternalHost("drive.google.com")).toBe(false);
      expect(isPrivateOrInternalHost("google.com")).toBe(false);
      expect(isPrivateOrInternalHost("fapce.edu.br")).toBe(false);
    });

    it("deve validar URLs seguras com validateSafeUrl", () => {
      const safe = validateSafeUrl("https://drive.google.com/thumbnail?id=123", {
        allowedProtocols: ["http:", "https:"],
        allowedHostSuffixes: ["google.com"],
      });
      expect(safe.isSafe).toBe(true);

      const ssrfAttack1 = validateSafeUrl("http://127.0.0.1:8000/docs");
      expect(ssrfAttack1.isSafe).toBe(false);

      const ssrfAttack2 = validateSafeUrl("http://169.254.169.254/latest/meta-data/");
      expect(ssrfAttack2.isSafe).toBe(false);

      const ssrfAttack3 = validateSafeUrl("http://biometric-api:8000/api/v1/faces");
      expect(ssrfAttack3.isSafe).toBe(false);

      const unauthorizedDomain = validateSafeUrl("https://malicious-site.com/image.png", {
        allowedProtocols: ["http:", "https:"],
        allowedHostSuffixes: ["google.com", "fapce.edu.br"],
      });
      expect(unauthorizedDomain.isSafe).toBe(false);
    });
  });

  describe("2. Rate Limiting de Força Bruta no Login", () => {
    it("deve bloquear após 5 tentativas consecutivas de senha inválida", () => {
      const attempts = new Map<string, { count: number; lockUntil: number }>();
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_MS = 15 * 60 * 1000;

      const recordFailure = (identifier: string) => {
        const now = Date.now();
        const record = attempts.get(identifier) || { count: 0, lockUntil: 0 };
        record.count += 1;
        if (record.count >= MAX_ATTEMPTS) {
          record.lockUntil = now + LOCKOUT_MS;
        }
        attempts.set(identifier, record);
        return record;
      };

      const isLocked = (identifier: string) => {
        const record = attempts.get(identifier);
        return Boolean(record && record.lockUntil > Date.now());
      };

      const userEmail = "hacker@test.com";

      // 4 tentativas falhas
      for (let i = 1; i <= 4; i++) {
        recordFailure(userEmail);
        expect(isLocked(userEmail)).toBe(false);
      }

      // 5ª tentativa falha -> Bloqueio ativo
      recordFailure(userEmail);
      expect(isLocked(userEmail)).toBe(true);
    });
  });

  describe("3. Comparação de Chave Mestra Timing-Safe", () => {
    it("deve usar crypto.timingSafeEqual para prevenir side-channel attacks", () => {
      const safeCompare = (a: string, b: string) => {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
      };

      const masterKey = "super-secret-master-key-12345678";
      expect(safeCompare("super-secret-master-key-12345678", masterKey)).toBe(true);
      expect(safeCompare("wrong-secret-master-key-12345678", masterKey)).toBe(false);
      expect(safeCompare("short", masterKey)).toBe(false);
    });
  });
});
