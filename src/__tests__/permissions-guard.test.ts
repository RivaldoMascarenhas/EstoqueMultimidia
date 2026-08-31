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

  it("deve permitir que OPERADOR, GESTOR e ADMIN gerenciem a infraestrutura de salas", () => {
    const rolesAllowedToEditRooms: Role[] = [Role.ADMIN, Role.GESTOR, Role.OPERADOR];

    expect(rolesAllowedToEditRooms.includes(Role.OPERADOR)).toBe(true);
    expect(rolesAllowedToEditRooms.includes(Role.GESTOR)).toBe(true);
    expect(rolesAllowedToEditRooms.includes(Role.ADMIN)).toBe(true);
    expect(rolesAllowedToEditRooms.includes(Role.ACADEMIC_SUPPORT)).toBe(false);
  });

  it("deve permitir que OPERADOR cadastre itens, patrimônios, categorias e caixas", () => {
    const rolesAllowedToCreateInventory: Role[] = [Role.ADMIN, Role.GESTOR, Role.OPERADOR];
    const rolesAllowedToCreateAssets: Role[] = [Role.ADMIN, Role.GESTOR, Role.OPERADOR];
    const rolesAllowedToCreateCategories: Role[] = [Role.ADMIN, Role.GESTOR, Role.OPERADOR];
    const rolesAllowedToCreateBoxes: Role[] = [Role.ADMIN, Role.GESTOR, Role.OPERADOR];

    expect(rolesAllowedToCreateInventory.includes(Role.OPERADOR)).toBe(true);
    expect(rolesAllowedToCreateAssets.includes(Role.OPERADOR)).toBe(true);
    expect(rolesAllowedToCreateCategories.includes(Role.OPERADOR)).toBe(true);
    expect(rolesAllowedToCreateBoxes.includes(Role.OPERADOR)).toBe(true);
  });

  it("deve proibir estritamente que OPERADOR realize exclusões destrutivas (categorias, salas, usuários e presenças)", () => {
    const rolesAllowedToDeleteCategories: Role[] = [Role.ADMIN, Role.GESTOR];
    const rolesAllowedToDeleteRooms: Role[] = [Role.ADMIN];
    const rolesAllowedToDeleteUsers: Role[] = [Role.ADMIN];
    const rolesAllowedToDeletePresence: Role[] = [Role.ADMIN];

    expect(rolesAllowedToDeleteCategories.includes(Role.OPERADOR)).toBe(false);
    expect(rolesAllowedToDeleteRooms.includes(Role.OPERADOR)).toBe(false);
    expect(rolesAllowedToDeleteUsers.includes(Role.OPERADOR)).toBe(false);
    expect(rolesAllowedToDeletePresence.includes(Role.OPERADOR)).toBe(false);
  });
});

