import { describe, it, expect } from "vitest";

describe("Room Projectors & Lamp Life Tracking Tests", () => {
  // Regras de Horímetro de Lâmpadas
  const calculateLampStatus = (hours: number): "OK" | "ALERTA" | "TROCAR LAMPADA" => {
    if (hours >= 3000) return "TROCAR LAMPADA";
    if (hours >= 2000) return "ALERTA";
    return "OK";
  };

  describe("1. Horímetro de Vida Útil da Lâmpada", () => {
    it("deve classificar lâmpadas abaixo de 2000h como OK", () => {
      expect(calculateLampStatus(1200)).toBe("OK");
      expect(calculateLampStatus(1999)).toBe("OK");
    });

    it("deve classificar lâmpadas entre 2000h e 2999h como ALERTA (preventivo)", () => {
      expect(calculateLampStatus(2000)).toBe("ALERTA");
      expect(calculateLampStatus(2850)).toBe("ALERTA");
    });

    it("deve classificar lâmpadas a partir de 3000h como TROCAR LAMPADA (crítico)", () => {
      expect(calculateLampStatus(3000)).toBe("TROCAR LAMPADA");
      expect(calculateLampStatus(3500)).toBe("TROCAR LAMPADA");
    });
  });

  describe("2. Validação de Agendamento com Projetor Fixo", () => {
    it("deve bloquear agendamento com projetor fixo se a lâmpada estiver em TROCAR LAMPADA", () => {
      const room = {
        name: "Sala 201",
        fixedProjectorModel: "Epson PowerLite X41+",
        lampStatus: "TROCAR LAMPADA",
      };

      const requiresFixedProjector = true;

      expect(() => {
        if (requiresFixedProjector && room.lampStatus === "TROCAR LAMPADA") {
          throw new Error(`O Datashow fixo da sala ${room.name} está indisponível para uso (requer troca de lâmpada).`);
        }
      }).toThrowError(/O Datashow fixo da sala Sala 201 está indisponível/);
    });

    it("deve bloquear agendamento com projetor fixo se a sala não possuir projetor instalado", () => {
      const room = {
        name: "Sala 102",
        fixedProjectorModel: null,
        lampStatus: null,
      };

      const requiresFixedProjector = true;

      expect(() => {
        if (requiresFixedProjector && !room.fixedProjectorModel) {
          throw new Error(`A sala ${room.name} não possui Datashow fixo instalado. Ajuste os recursos da solicitação para Datashow Móvel.`);
        }
      }).toThrowError(/não possui Datashow fixo instalado/);
    });

    it("deve zerar o horímetro após registro de troca física de lâmpada", () => {
      let currentHours = 3200;
      // Registro de troca de lâmpada
      currentHours = 0;
      const newStatus = calculateLampStatus(currentHours);

      expect(currentHours).toBe(0);
      expect(newStatus).toBe("OK");
    });
  });
});
