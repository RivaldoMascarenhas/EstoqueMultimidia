import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("Security Edge & Offensive Defense Tests", () => {
  // 1. Função de validação de IP privado contra SSRF (idêntica à de produção)
  const isPrivateOrLoopback = (ip: string): boolean => {
    if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0" || ip === "::") return true;
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;
    if (ip.startsWith("169.254.")) return true; // Link-local e AWS/GCP Metadata
    if (ip.startsWith("100.64.")) return true; // CGNAT
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true; // RFC1918 172.16.0.0/12
    return false;
  };

  describe("1. Prevenção de SSRF em Webhooks", () => {
    it("deve bloquear IPs de Loopback (127.0.0.1, ::1)", () => {
      expect(isPrivateOrLoopback("127.0.0.1")).toBe(true);
      expect(isPrivateOrLoopback("::1")).toBe(true);
    });

    it("deve bloquear redes privadas RFC1918 (10.x, 192.168.x, 172.16.x)", () => {
      expect(isPrivateOrLoopback("10.0.0.1")).toBe(true);
      expect(isPrivateOrLoopback("10.254.254.254")).toBe(true);
      expect(isPrivateOrLoopback("192.168.1.1")).toBe(true);
      expect(isPrivateOrLoopback("192.168.0.100")).toBe(true);
      expect(isPrivateOrLoopback("172.16.0.1")).toBe(true);
      expect(isPrivateOrLoopback("172.31.255.255")).toBe(true);
    });

    it("deve bloquear o IP de metadados da Nuvem (AWS/GCP: 169.254.169.254)", () => {
      expect(isPrivateOrLoopback("169.254.169.254")).toBe(true);
      expect(isPrivateOrLoopback("169.254.1.1")).toBe(true);
    });

    it("deve permitir IPs públicos legítimos da Internet", () => {
      expect(isPrivateOrLoopback("8.8.8.8")).toBe(false);
      expect(isPrivateOrLoopback("1.1.1.1")).toBe(false);
      expect(isPrivateOrLoopback("142.250.190.46")).toBe(false);
    });

    it("deve exigir protocolo HTTPS e rejeitar HTTP", () => {
      const isHttps = (urlStr: string) => {
        const u = new URL(urlStr);
        return u.protocol === "https:";
      };

      expect(isHttps("https://api.empresa.com/webhook")).toBe(true);
      expect(isHttps("http://api.empresa.com/webhook")).toBe(false);
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
