import { describe, it, expect, vi } from "vitest";
import { RequestService } from "@/services/request.service";
import { prisma } from "@/lib/prisma";

describe("RequestService - Recorrência Semanal e Materialização de Séries", () => {
  it("deve calcular corretamente as datas das instâncias para 4 semanas consecutivas", async () => {
    const baseDate = new Date("2026-08-18"); // Terça-feira
    const occurrences = 4;

    const dates = [];
    for (let i = 0; i < occurrences; i++) {
      const occurrenceDate = new Date(baseDate);
      occurrenceDate.setDate(occurrenceDate.getDate() + i * 7);
      dates.push(occurrenceDate.toISOString().split("T")[0]);
    }

    expect(dates).toEqual([
      "2026-08-18",
      "2026-08-25",
      "2026-09-01",
      "2026-09-08",
    ]);
  });
});
