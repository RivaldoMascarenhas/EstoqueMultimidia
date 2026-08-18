import { describe, it, expect, vi } from "vitest";
import { GoogleCalendarService } from "@/services/google-calendar.service";

describe("GoogleCalendarService - Sincronização Unilateral e Resiliência", () => {
  it("deve construir payload formatado com sala, professor e itens", () => {
    const mockRequest = {
      id: "req-test-sync",
      date: new Date("2026-08-18"),
      startTime: new Date("2026-08-18T08:00:00Z"),
      endTime: new Date("2026-08-18T10:00:00Z"),
      professorName: "Prof. Rivaldo",
      discipline: "Sistemas Distribuídos",
      attendanceType: "Aula Teórica",
      room: { name: "1A", floor: "1 Andar", fixedProjectorModel: "Epson s41+" },
      items: [{ label: "Datashow (Fixo)", quantity: 1 }],
      notes: "Testar áudio",
    };

    const payload = GoogleCalendarService.buildEventPayload(mockRequest);

    expect(payload.summary).toContain("Sala 1A");
    expect(payload.summary).toContain("Prof. Rivaldo");
    expect(payload.location).toContain("Sala 1A");
    expect(payload.description).toContain("Sistemas Distribuídos");
  });

  it("deve retornar mock eventId e não quebrar quando credentials não estão no .env em dev", async () => {
    const payload = {
      summary: "Sala 1A - Prof. Rivaldo",
      location: "Sala 1A",
      description: "Aula Teórica",
      startTime: new Date("2026-08-18T08:00:00Z"),
      endTime: new Date("2026-08-18T10:00:00Z"),
    };

    const authSpy = vi.spyOn(GoogleCalendarService, "getActiveAuth").mockResolvedValueOnce({
      mode: "MOCK",
      calendarId: "primary",
    });

    const result = await GoogleCalendarService.createEvent(payload);
    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();
    authSpy.mockRestore();
  });

  it("deve simular atualização e exclusão graciosamente em ambiente sem credenciais", async () => {
    const payload = {
      summary: "Sala 1A - Atualizado",
      location: "Sala 1A",
      description: "Aula Teórica",
      startTime: new Date("2026-08-18T08:00:00Z"),
      endTime: new Date("2026-08-18T10:00:00Z"),
    };

    const updateResult = await GoogleCalendarService.updateEvent("gcal_evt_12345", payload);
    expect(updateResult.success).toBe(true);

    const deleteResult = await GoogleCalendarService.deleteEvent("gcal_evt_12345");
    expect(deleteResult.success).toBe(true);
  });
});
