import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSignedReportCode, verifyReportCode } from "@/lib/report-signature";

describe("Cryptographic Report Signing & Validation (REL-*)", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test_super_secret_for_report_hmac_signing_123456";
  });

  it("should generate a valid signed report code with correct format", () => {
    const code = generateSignedReportCode("INVENTORY");
    expect(code).toMatch(/^REL-INVENTORY-\d+-[A-F0-9]{10}$/);
  });

  it("should verify a legitimately signed report code successfully", () => {
    const now = Date.now();
    const code = generateSignedReportCode("STOCK", now);
    const result = verifyReportCode(code);

    expect(result.isValid).toBe(true);
    expect(result.reportType).toBe("STOCK");
    expect(result.reportTitle).toContain("Inventário");
    expect(result.issuedAt).toBe(new Date(now).toISOString());
  });

  it("should reject tampered or forged report codes (anti-spoofing)", () => {
    const validCode = generateSignedReportCode("MAINTENANCE");
    // Change signature character
    const tampered = validCode.slice(0, -1) + (validCode.endsWith("A") ? "B" : "A");
    const result = verifyReportCode(tampered);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("inválida ou adulterada");
  });

  it("should reject completely fabricated REL codes without valid HMAC", () => {
    const fakeCode = "REL-STOCK-QUALQUERCOISA";
    const result = verifyReportCode(fakeCode);

    expect(result.isValid).toBe(false);
  });

  it("should reject report codes with timestamp far in the future", () => {
    const futureTimestamp = Date.now() + 24 * 60 * 60 * 1000; // tomorrow
    const futureCode = generateSignedReportCode("LOANS", futureTimestamp);
    const result = verifyReportCode(futureCode);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("inconsistente");
  });
});
