import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { requirePresentationToken } from "@/lib/presentation-guard";
import { POST as recognize } from "@/app/api/v1/biometrics/recognize/route";
import { POST as enroll } from "@/app/api/v1/biometrics/enroll/route";
import { POST as testFace } from "@/app/api/v1/biometrics/test/route";
import { POST as importPeople } from "@/app/api/v1/biometrics/import/route";
import { BiometricApiService } from "@/services/biometric-api.service";
import { EventService } from "@/services/event.service";
import { ImportService } from "@/services/import.service";
import { validateBiometricImage } from "@/lib/biometric-upload";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: vi.fn() }, event: { findUnique: vi.fn() }, eventUser: { findUnique: vi.fn() },
} }));
vi.mock("@/lib/rate-limiter", () => ({ RateLimiter: { consume: vi.fn().mockResolvedValue({ allowed: true }) } }));
vi.mock("@/services/event.service", () => ({ EventService: { isCheckinAllowed: vi.fn() } }));
vi.mock("@/services/import.service", () => ({ ImportService: { parseFile: vi.fn(), processImport: vi.fn(), processZipPackage: vi.fn() } }));
vi.mock("@/services/biometric-api.service", () => ({ BiometricApiService: {
  recognizeFace: vi.fn().mockResolvedValue({ success: true }), enrollFace: vi.fn().mockResolvedValue({ success: true }),
  testBiometrics: vi.fn().mockResolvedValue({ success: true }),
} }));

const jpeg = () => new Blob([new Uint8Array([255, 216, 255, 224, 0, 0])], { type: "image/jpeg" });
function session(role = "ADMIN", active = true, pending = false) {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "operator", role: "ADMIN" } } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "operator", role, active, mustChangePassword: pending } as any);
}
function upload(field = "crop", value: string | Blob = jpeg()) {
  const form = new FormData();
  form.set(field, value);
  form.set("eventId", "event-test"); form.set("personId", "person-test");
  return new NextRequest("http://localhost:3000/api/v1/biometrics/test", { method: "POST", body: form });
}
beforeEach(() => {
  vi.clearAllMocks(); session();
  vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event-test", status: "OPEN", presentationToken: "test-token" } as any);
  vi.mocked(prisma.eventUser.findUnique).mockResolvedValue(null);
  vi.mocked(EventService.isCheckinAllowed).mockReturnValue({ isAllowed: true } as any);
});

describe("Apresentação: sessão revalidada e escopo do evento", () => {
  const req = () => new NextRequest("http://localhost:3000/api/v1/public/events/event-test");
  it.each([["ADMIN", false, false], ["ADMIN", true, true], ["CONSULTA", true, false], ["ACADEMIC_SUPPORT", true, false]])(
    "bloqueia sessão antiga com papel %s, ativa=%s, troca pendente=%s", async (role, active, pending) => {
      session(role as string, active as boolean, pending as boolean);
      const result = await requirePresentationToken(req(), "event-test");
      expect(result.isAuthorized).toBe(false);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });
  it("nega EVENTOS sem vínculo mesmo com papel ADMIN no JWT", async () => {
    session("EVENTOS");
    const result = await requirePresentationToken(req(), "event-test");
    expect(result.errorResponse?.status).toBe(403);
  });
  it("permite EVENTOS vinculado e ADMIN ativo", async () => {
    session("EVENTOS");
    vi.mocked(prisma.eventUser.findUnique).mockResolvedValue({ id: "assignment" } as any);
    expect((await requirePresentationToken(req(), "event-test")).isAuthorized).toBe(true);
    session();
    expect((await requirePresentationToken(req(), "event-test")).isAuthorized).toBe(true);
  });
  it("mantém apresentação anônima com token válido", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const request = new NextRequest(`${req().url}?token=test-token`);
    expect((await requirePresentationToken(request, "event-test")).isAuthorized).toBe(true);
  });
});

describe("Uploads biométricos e autorização de check-in", () => {
  it.each([[enroll, "image"], [recognize, "crop"], [testFace, "crop"]] as const)("rejeita texto no lugar do arquivo em %s", async (handler, field) => {
    expect((await handler(upload(field, "not-a-file"))).status).toBe(400);
    expect(BiometricApiService.enrollFace).not.toHaveBeenCalled();
    expect(BiometricApiService.recognizeFace).not.toHaveBeenCalled();
    expect(BiometricApiService.testBiometrics).not.toHaveBeenCalled();
  });
  it("rejeita conteúdo falso com MIME de imagem", async () => {
    expect((await enroll(upload("image", new Blob(["<script>bad</script>"], { type: "image/jpeg" })))).status).toBe(400);
    expect(BiometricApiService.enrollFace).not.toHaveBeenCalled();
  });
  it("nega reconhecimento em evento sem vínculo antes de chamar o serviço facial", async () => {
    session("EVENTOS");
    expect((await recognize(upload())).status).toBe(403);
    expect(BiometricApiService.recognizeFace).not.toHaveBeenCalled();
  });
  it("permite reconhecimento com vínculo e janela aberta", async () => {
    session("EVENTOS"); vi.mocked(prisma.eventUser.findUnique).mockResolvedValue({ id: "assignment" } as any);
    expect((await recognize(upload())).status).toBe(200);
    expect(BiometricApiService.recognizeFace).toHaveBeenCalledWith(expect.objectContaining({ eventId: "event-test", operatorUserId: "operator" }));
  });
  it("mantém bloqueio fora da janela de check-in", async () => {
    vi.mocked(EventService.isCheckinAllowed).mockReturnValue({ isAllowed: false, message: "Fechado" } as any);
    expect(await (await recognize(upload())).json()).toMatchObject({ success: false, status: "EVENT_NOT_OPEN" });
    expect(BiometricApiService.recognizeFace).not.toHaveBeenCalled();
  });
  it("nega importação para evento sem vínculo antes de processar a planilha", async () => {
    session("EVENTOS");
    expect((await importPeople(upload("file", new Blob(["Nome,Matricula\nTeste,123"], { type: "text/csv" })))).status).toBe(403);
    expect(ImportService.parseFile).not.toHaveBeenCalled();
  });
  it("rejeita arquivo vazio e arquivo maior que 10 MB", async () => {
    expect(await validateBiometricImage(new Blob([], { type: "image/jpeg" }))).not.toBeNull();
    expect(await validateBiometricImage(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/jpeg" }))).not.toBeNull();
  });
  it("aceita assinaturas JPEG, PNG e WebP e rejeita tipo divergente", async () => {
    expect(await validateBiometricImage(jpeg())).toBeNull();
    expect(await validateBiometricImage(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: "image/png" }))).toBeNull();
    expect(await validateBiometricImage(new Blob(["RIFF0000WEBP"], { type: "image/webp" }))).toBeNull();
    expect(await validateBiometricImage(new Blob(["RIFF0000WEBP"], { type: "image/png" }))).not.toBeNull();
  });
});
