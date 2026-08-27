import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportService } from "@/services/import.service";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { maskCpf, maskEmail, maskPhone } from "@/lib/maskData";

describe("Security Hardening & Vulnerability Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. CSV / Formula Injection Mitigation (CWE-1236)", () => {
    it("should sanitize dangerous formula prefixes from CSV and Excel imports", () => {
      expect(ImportService.sanitizeField("=cmd|'/C calc'!A0")).toBe("cmd|'/C calc'!A0");
      expect(ImportService.sanitizeField("+SUM(1,2)")).toBe("SUM(1,2)");
      expect(ImportService.sanitizeField("-10+20")).toBe("10+20");
      expect(ImportService.sanitizeField("@SUM(1+1)")).toBe("SUM(1+1)");
      expect(ImportService.sanitizeField("\t=1+1")).toBe("1+1");
      expect(ImportService.sanitizeField("Maria da Silva")).toBe("Maria da Silva");
      expect(ImportService.sanitizeField(null)).toBe("");
    });
  });

  describe("2. Password Security Policy Validation", () => {
    it("should reject weak passwords and enforce minimum security constraints", () => {
      // Too short (< 8 chars)
      expect(validatePasswordPolicy("Ab1!").isValid).toBe(false);
      // No letters
      expect(validatePasswordPolicy("123456789!").isValid).toBe(false);
      // No numbers
      expect(validatePasswordPolicy("PasswordOnly!").isValid).toBe(false);
      // Valid strong password
      expect(validatePasswordPolicy("UniFAP@2026!").isValid).toBe(true);
    });
  });

  describe("3. Data Minimization & Privacy Protection", () => {
    it("should properly mask CPFs and sensitive info in public feeds", () => {
      expect(maskCpf("01234567890")).toBe("***.345.678-**");
      expect(maskEmail("joao.silva@unifapce.edu.br")).toBe("j*****a@unifapce.edu.br");
      expect(maskPhone("88998877665")).toBe("(88) 9****-7665");
    });
  });
});
