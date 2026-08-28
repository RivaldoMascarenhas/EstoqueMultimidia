import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getLiveHealth } from "@/app/api/v1/health/live/route";
import { GET as getReadyHealth } from "@/app/api/v1/health/ready/route";
import { GET as getMainHealth } from "@/app/api/v1/health/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("Healthcheck Endpoints (/live, /ready, /health)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar 200 OK no endpoint ultra-leve /api/v1/health/live", async () => {
    const res = await getLiveHealth();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.timestamp).toBeDefined();
  });

  it("deve retornar 200 e status healthy no endpoint /api/v1/health/ready quando o banco responder", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }] as any);

    const res = await getReadyHealth();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("healthy");
    expect(json.services.database.status).toBe("UP");
  });

  it("deve retornar 503 e status degraded no endpoint /api/v1/health/ready quando o banco falhar", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const res = await getReadyHealth();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.services.database.status).toBe("DOWN");
  });
});
