import { describe, it, expect } from "vitest";
import { ShiftService, DEFAULT_SHIFTS } from "@/services/shift.service";
import { Shift } from "@prisma/client";

describe("ShiftService - Determinação de Turnos e Limites Exatos", () => {
  it("deve mapear corretamente os limites exatos da Manhã (07:00 às 11:59)", () => {
    // 07:00 exato -> MORNING (início do turno da manhã)
    expect(ShiftService.getShiftFromTime("07:00", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    // 07:01 -> MORNING
    expect(ShiftService.getShiftFromTime("07:01", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    // 09:30 -> MORNING
    expect(ShiftService.getShiftFromTime("09:30", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    // 11:59 exato -> MORNING (último minuto antes da tarde)
    expect(ShiftService.getShiftFromTime("11:59", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
  });

  it("deve mapear corretamente os limites exatos da Tarde (12:00 às 17:59)", () => {
    // 12:00 exato -> AFTERNOON (transição exata de meio-dia)
    expect(ShiftService.getShiftFromTime("12:00", DEFAULT_SHIFTS)).toBe(Shift.AFTERNOON);
    // 13:00 -> AFTERNOON
    expect(ShiftService.getShiftFromTime("13:00", DEFAULT_SHIFTS)).toBe(Shift.AFTERNOON);
    // 15:45 -> AFTERNOON
    expect(ShiftService.getShiftFromTime("15:45", DEFAULT_SHIFTS)).toBe(Shift.AFTERNOON);
    // 17:59 exato -> AFTERNOON (último minuto antes da noite)
    expect(ShiftService.getShiftFromTime("17:59", DEFAULT_SHIFTS)).toBe(Shift.AFTERNOON);
  });

  it("deve mapear corretamente os limites exatos da Noite (18:00 às 22:30)", () => {
    // 18:00 exato -> NIGHT (transição exata das 18h)
    expect(ShiftService.getShiftFromTime("18:00", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    // 18:30 -> NIGHT
    expect(ShiftService.getShiftFromTime("18:30", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    // 21:59 -> NIGHT
    expect(ShiftService.getShiftFromTime("21:59", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    // 22:00 -> NIGHT
    expect(ShiftService.getShiftFromTime("22:00", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    // 22:29 -> NIGHT
    expect(ShiftService.getShiftFromTime("22:29", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
  });

  it("deve mapear horários anteriores a 07:00 para o primeiro turno (Manhã - preparo antecipado)", () => {
    expect(ShiftService.getShiftFromTime("06:00", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    expect(ShiftService.getShiftFromTime("06:30", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    expect(ShiftService.getShiftFromTime("06:59", DEFAULT_SHIFTS)).toBe(Shift.MORNING);
  });

  it("deve mapear horários posteriores a 22:30 para o último turno (Noite)", () => {
    expect(ShiftService.getShiftFromTime("22:30", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    expect(ShiftService.getShiftFromTime("22:45", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
    expect(ShiftService.getShiftFromTime("23:15", DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
  });

  it("deve suportar Date objects e strings ISO completas", () => {
    const morningDate = new Date("2026-08-18T08:30:00");
    const afternoonDate = new Date("2026-08-18T14:15:00");
    const nightDate = new Date("2026-08-18T19:00:00");

    expect(ShiftService.getShiftFromTime(morningDate, DEFAULT_SHIFTS)).toBe(Shift.MORNING);
    expect(ShiftService.getShiftFromTime(afternoonDate, DEFAULT_SHIFTS)).toBe(Shift.AFTERNOON);
    expect(ShiftService.getShiftFromTime(nightDate, DEFAULT_SHIFTS)).toBe(Shift.NIGHT);
  });

  it("deve respeitar configurações customizadas de horários", () => {
    const customConfigs = [
      {
        shift: Shift.MORNING,
        startTime: "08:00",
        endTime: "13:00",
        label: "Manhã Custom",
        emoji: "🌅",
        orderIndex: 1,
      },
      {
        shift: Shift.AFTERNOON,
        startTime: "13:00",
        endTime: "19:00",
        label: "Tarde Custom",
        emoji: "☀️",
        orderIndex: 2,
      },
      {
        shift: Shift.NIGHT,
        startTime: "19:00",
        endTime: "23:00",
        label: "Noite Custom",
        emoji: "🌙",
        orderIndex: 3,
      },
    ];

    // Com faixa customizada, 12:30 é Manhã (termina às 13:00)
    expect(ShiftService.getShiftFromTime("12:30", customConfigs)).toBe(Shift.MORNING);
    // 13:00 é Tarde
    expect(ShiftService.getShiftFromTime("13:00", customConfigs)).toBe(Shift.AFTERNOON);
    // 18:30 é Tarde (termina às 19:00)
    expect(ShiftService.getShiftFromTime("18:30", customConfigs)).toBe(Shift.AFTERNOON);
    // 19:00 é Noite
    expect(ShiftService.getShiftFromTime("19:00", customConfigs)).toBe(Shift.NIGHT);
  });
});
