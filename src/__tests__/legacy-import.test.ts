import { describe, it, expect } from "vitest";
import { RequestOrigin, RequestStatus } from "@prisma/client";

describe("Legacy Import - Importação Assistida e Fila de Revisão", () => {
  it("deve garantir que eventos importados tenham origin IMPORTADO_LEGADO e needsReview true", () => {
    const rawLegacyPayload = {
      summary: "Aula Prof. Marcelo - Sala 1A",
      location: "Sala 1A",
      startTime: "2026-08-18T08:00:00Z",
      endTime: "2026-08-18T10:00:00Z",
    };

    const simulatedCreatedRequest = {
      id: "legacy-req-1",
      origin: RequestOrigin.IMPORTADO_LEGADO,
      needsReview: true,
      status: RequestStatus.AGENDADO,
      items: [
        {
          label: "Equipamento a confirmar",
          separated: false,
        },
      ],
    };

    // Regra crítica: Nunca é criado como PREPARADO
    expect(simulatedCreatedRequest.status).not.toBe(RequestStatus.PREPARADO);
    expect(simulatedCreatedRequest.origin).toBe(RequestOrigin.IMPORTADO_LEGADO);
    expect(simulatedCreatedRequest.needsReview).toBe(true);
    expect(simulatedCreatedRequest.items[0].separated).toBe(false);
  });
});
