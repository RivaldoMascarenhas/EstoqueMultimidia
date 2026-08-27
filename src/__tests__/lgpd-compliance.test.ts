import { describe, it, expect, vi, beforeEach } from "vitest";
import { maskCpf, maskEmail, maskPhone } from "@/lib/maskData";
import { PersonService } from "@/services/person.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "user-operator" }),
      },
      person: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      faceEmbedding: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-lgpd-1" }),
      },
    },
  };
});

describe("LGPD Compliance & Data Protection Suite (Lei 13.709/2018)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Data Masking & Minimization (Art. 6º, III)", () => {
    it("should mask CPFs correctly to avoid exposing sensitive tax ID in public views", () => {
      expect(maskCpf("12345678900")).toBe("***.456.789-**");
      expect(maskCpf("123.456.789-00")).toBe("***.456.789-**");
      expect(maskCpf(null)).toBe("");
      expect(maskCpf("")).toBe("");
    });

    it("should mask email addresses preserving domain for recognition while protecting identity", () => {
      expect(maskEmail("rivaldo@unifapce.edu.br")).toBe("r*****o@unifapce.edu.br");
      expect(maskEmail("ana@gmail.com")).toBe("a*a@gmail.com");
      expect(maskEmail(null)).toBe("");
    });

    it("should mask phone numbers hiding middle digits", () => {
      expect(maskPhone("88999887766")).toBe("(88) 9****-7766");
      expect(maskPhone(null)).toBe("");
    });
  });

  describe("2. Biometric Data Revocation & Right to Erasure (Art. 18, VI e IX)", () => {
    it("should delete all biometric embeddings and log audit trail when revocation is requested", () => {
      const mockPerson = {
        id: "person-123",
        name: "Maria Oliveira",
        registration: "20241009",
      };

      vi.mocked(prisma.person.findUnique).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.faceEmbedding.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as any);

      return PersonService.deleteBiometrics("person-123", "user-operator", "192.168.1.1").then(
        (result) => {
          expect(result.success).toBe(true);
          expect(result.deletedCount).toBe(1);
          expect(prisma.faceEmbedding.deleteMany).toHaveBeenCalledWith({
            where: { personId: "person-123" },
          });
          expect(prisma.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                action: "BIOMETRIC_DATA_DELETED",
                entity: "Person",
                entityId: "person-123",
              }),
            })
          );
        }
      );
    });

    it("should throw an error if person does not exist upon revocation request", async () => {
      vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

      await expect(PersonService.deleteBiometrics("invalid-id")).rejects.toThrow(
        "Pessoa não encontrada."
      );
    });
  });
});
