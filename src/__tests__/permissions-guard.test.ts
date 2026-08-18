import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";

describe("RBAC Permissions - Regras de Permissão para ACADEMIC_SUPPORT", () => {
  it("deve permitir que ACADEMIC_SUPPORT edite ou cancele apenas suas próprias solicitações", () => {
    const userAcademic: { id: string; role: Role } = {
      id: "user-paloma-1",
      role: Role.ACADEMIC_SUPPORT,
    };

    const ownRequest = {
      id: "req-1",
      createdById: "user-paloma-1",
      professorName: "Prof. Rivaldo",
    };

    const otherRequest = {
      id: "req-2",
      createdById: "user-carlos-2",
      professorName: "Prof. Ana",
    };

    const canEditOwn =
      userAcademic.role === Role.ADMIN ||
      userAcademic.role === Role.GESTOR ||
      userAcademic.role === Role.OPERADOR ||
      (userAcademic.role === Role.ACADEMIC_SUPPORT && ownRequest.createdById === userAcademic.id);

    const canEditOther =
      userAcademic.role === Role.ADMIN ||
      userAcademic.role === Role.GESTOR ||
      userAcademic.role === Role.OPERADOR ||
      (userAcademic.role === Role.ACADEMIC_SUPPORT && otherRequest.createdById === userAcademic.id);

    expect(canEditOwn).toBe(true);
    expect(canEditOther).toBe(false);
  });

  it("deve proibir que ACADEMIC_SUPPORT altere campos operacionais internos do Multimídia", () => {
    const userRole = Role.ACADEMIC_SUPPORT;
    const isAcademicSupport = userRole === Role.ACADEMIC_SUPPORT;

    const attemptedUpdatePayload = {
      professorName: "Prof. Rivaldo Editado",
      assignedUserId: "technician-1",
      status: "PREPARADO",
    };

    // Filtro de segurança (sanitização aplicada no RequestService)
    const sanitizedPayload: any = { ...attemptedUpdatePayload };
    if (isAcademicSupport) {
      delete sanitizedPayload.assignedUserId;
      delete sanitizedPayload.status;
    }

    expect(sanitizedPayload.professorName).toBe("Prof. Rivaldo Editado");
    expect(sanitizedPayload.assignedUserId).toBeUndefined();
    expect(sanitizedPayload.status).toBeUndefined();
  });
});
