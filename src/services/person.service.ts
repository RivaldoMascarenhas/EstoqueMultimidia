import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import { CreatePersonInput, UpdatePersonInput } from "@/schemas/person.schema";
import { Prisma } from "@prisma/client";

export class PersonService {
  /**
   * Creates a new Person record
   */
  public static async createPerson(
    data: CreatePersonInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    // Check CPF or Registration uniqueness if provided
    if (data.cpf) {
      const existingCpf = await prisma.person.findUnique({
        where: { cpf: data.cpf },
      });
      if (existingCpf) {
        throw new Error(`Já existe uma pessoa cadastrada com o CPF ${data.cpf}.`);
      }
    }

    if (data.registration) {
      const existingReg = await prisma.person.findUnique({
        where: { registration: data.registration },
      });
      if (existingReg) {
        throw new Error(`Já existe uma pessoa com a matrícula ${data.registration}.`);
      }
    }

    const person = await prisma.person.create({
      data: {
        name: data.name,
        cpf: data.cpf || null,
        registration: data.registration || null,
        email: data.email || null,
        phone: data.phone || null,
        category: data.category || null,
        notes: data.notes || null,
        active: data.active ?? true,
      },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "CREATE_PERSON",
      entity: "Person",
      entityId: person.id,
      details: { name: person.name, registration: person.registration, cpf: person.cpf },
      ipAddress,
    });

    return person;
  }

  /**
   * Updates an existing Person record
   */
  public static async updatePerson(
    id: string,
    data: UpdatePersonInput,
    operatorUserId?: string,
    ipAddress?: string
  ) {
    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Pessoa não encontrada.");
    }

    if (data.cpf && data.cpf !== existing.cpf) {
      const conflict = await prisma.person.findUnique({ where: { cpf: data.cpf } });
      if (conflict) {
        throw new Error(`Já existe uma pessoa cadastrada com o CPF ${data.cpf}.`);
      }
    }

    if (data.registration && data.registration !== existing.registration) {
      const conflict = await prisma.person.findUnique({ where: { registration: data.registration } });
      if (conflict) {
        throw new Error(`Já existe uma pessoa com a matrícula ${data.registration}.`);
      }
    }

    const updated = await prisma.person.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        cpf: data.cpf !== undefined ? (data.cpf || null) : undefined,
        registration: data.registration !== undefined ? (data.registration || null) : undefined,
        email: data.email !== undefined ? (data.email || null) : undefined,
        phone: data.phone !== undefined ? (data.phone || null) : undefined,
        category: data.category !== undefined ? (data.category || null) : undefined,
        notes: data.notes !== undefined ? (data.notes || null) : undefined,
        active: data.active !== undefined ? data.active : undefined,
      },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "UPDATE_PERSON",
      entity: "Person",
      entityId: updated.id,
      details: { diff: data },
      ipAddress,
    });

    return updated;
  }

  /**
   * Retrieves a Person by ID with biometric status
   */
  public static async getPersonById(id: string) {
    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        faceEmbeddings: {
          where: { active: true },
          select: { id: true, model: true, active: true, createdAt: true, updatedAt: true },
        },
        _count: {
          select: {
            participations: true,
            presences: true,
            drawsWon: true,
          },
        },
      },
    });

    if (!person) return null;

    return {
      ...person,
      hasFaceEnrolled: person.faceEmbeddings.length > 0,
      activeEmbedding: person.faceEmbeddings[0] || null,
    };
  }

  /**
   * Paginated list of persons with search filters
   */
  public static async listPersons(params: {
    query?: string;
    category?: string;
    hasFace?: boolean;
    active?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PersonWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.query) {
      const q = params.query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { registration: { contains: q, mode: "insensitive" } },
        { cpf: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    if (params.hasFace === true) {
      where.faceEmbeddings = { some: { active: true } };
    } else if (params.hasFace === false) {
      where.faceEmbeddings = { none: { active: true } };
    }

    const [total, items] = await Promise.all([
      prisma.person.count({ where }),
      prisma.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          faceEmbeddings: {
            where: { active: true },
            select: { id: true, model: true, updatedAt: true },
          },
          _count: {
            select: {
              participations: true,
              presences: true,
            },
          },
        },
      }),
    ]);

    const formatted = items.map((p) => ({
      id: p.id,
      name: p.name,
      cpf: p.cpf,
      registration: p.registration,
      email: p.email,
      phone: p.phone,
      photoUrl: p.photoUrl,
      category: p.category,
      active: p.active,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      hasFaceEnrolled: p.faceEmbeddings.length > 0,
      activeEmbedding: p.faceEmbeddings[0] || null,
      participationsCount: p._count.participations,
      presencesCount: p._count.presences,
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Deactivates or soft deletes a person
   */
  public static async deletePerson(id: string, operatorUserId?: string, ipAddress?: string) {
    const person = await prisma.person.update({
      where: { id },
      data: { active: false },
    });

    await safeAuditLog({
      userId: operatorUserId,
      action: "DEACTIVATE_PERSON",
      entity: "Person",
      entityId: id,
      details: { name: person.name },
      ipAddress,
    });

    return person;
  }

  /**
   * Retrieves all Person categories with counts of total and with biometrics
   */
  public static async getCategoriesWithStats() {
    const people = await prisma.person.findMany({
      where: { active: true },
      select: {
        id: true,
        category: true,
        faceEmbeddings: {
          where: { active: true },
          select: { id: true },
        },
      },
    });

    const categoryMap = new Map<
      string,
      { name: string; total: number; withBiometrics: number }
    >();

    const standardCategories = [
      "Aluno",
      "Professor",
      "Colaborador Administrativo",
      "Técnico Administrativo",
      "Geral",
      "Convidado",
    ];

    for (const cat of standardCategories) {
      categoryMap.set(cat, { name: cat, total: 0, withBiometrics: 0 });
    }

    for (const p of people) {
      const cat = p.category?.trim() || "Geral";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { name: cat, total: 0, withBiometrics: 0 });
      }
      const item = categoryMap.get(cat)!;
      item.total += 1;
      if (p.faceEmbeddings.length > 0) {
        item.withBiometrics += 1;
      }
    }

    return Array.from(categoryMap.values());
  }
}
