import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    
    const userRole = session?.user?.role;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          assets: [],
          boxes: [],
          loans: [],
          maintenances: [],
          events: [],
          people: [],
        },
      });
    }

    const cleanQuery = q.replace(/^#/, ""); // Remove '#' se o usuário digitou #123458 ou #OS-2026-0001

    // Determinar escopo de busca por Role (RBAC)
    const canSearchStock = userRole !== Role.EVENTOS;
    const canSearchPatrimony = userRole !== Role.EVENTOS;
    const canSearchBoxes = userRole === Role.ADMIN || userRole === Role.GESTOR || userRole === Role.OPERADOR || userRole === Role.CONSULTA;
    const canSearchLoans = userRole === Role.ADMIN || userRole === Role.GESTOR || userRole === Role.OPERADOR;
    const canSearchMaintenance = userRole === Role.ADMIN || userRole === Role.GESTOR || userRole === Role.OPERADOR;
    const canSearchEvents = userRole !== Role.ACADEMIC_SUPPORT;
    const canSearchPeople = userRole !== Role.ACADEMIC_SUPPORT;

    // Executar buscas paralelas respeitando o perfil RBAC
    const [items, assets, boxes, loans, maintenances, events, rawPeople] = await Promise.all([
      // 1. Itens do Catálogo
      canSearchStock
        ? prisma.item.findMany({
            where: {
              active: true,
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
                { manufacturer: { contains: q, mode: "insensitive" } },
              ],
            },
            include: {
              category: true,
              inventories: {
                include: {
                  box: {
                    include: { door: true },
                  },
                },
              },
            },
            take: 5,
          })
        : Promise.resolve([]),

      // 2. Equipamentos Patrimoniais
      canSearchPatrimony
        ? prisma.asset.findMany({
            where: {
              active: true,
              OR: [
                { assetTag: { contains: cleanQuery, mode: "insensitive" } },
                { serialNumber: { contains: cleanQuery, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
                { item: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
            include: {
              item: {
                include: { category: true },
              },
              currentBox: {
                include: { door: true },
              },
            },
            take: 6,
          })
        : Promise.resolve([]),

      // 3. Caixas Físicas do Armário
      canSearchBoxes
        ? prisma.box.findMany({
            where: {
              active: true,
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { door: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
            include: {
              door: true,
              inventories: {
                include: { item: true },
              },
              assets: {
                where: { active: true },
                include: { item: true },
              },
            },
            take: 4,
          })
        : Promise.resolve([]),

      // 4. Empréstimos
      canSearchLoans
        ? prisma.loan.findMany({
            where: {
              OR: [
                { borrowerName: { contains: q, mode: "insensitive" } },
                { borrowerEmail: { contains: q, mode: "insensitive" } },
                { borrowerPhone: { contains: q, mode: "insensitive" } },
                { destination: { contains: q, mode: "insensitive" } },
                { asset: { assetTag: { contains: cleanQuery, mode: "insensitive" } } },
                { asset: { item: { name: { contains: q, mode: "insensitive" } } } },
              ],
            },
            include: {
              asset: {
                include: { item: true },
              },
              createdByUser: {
                select: { name: true },
              },
            },
            orderBy: { loanDate: "desc" },
            take: 4,
          })
        : Promise.resolve([]),

      // 5. Ordens de Serviço (Manutenção)
      canSearchMaintenance
        ? prisma.maintenance.findMany({
            where: {
              OR: [
                { orderNumber: { contains: cleanQuery, mode: "insensitive" } },
                { issueDescription: { contains: q, mode: "insensitive" } },
                { serviceProvider: { contains: q, mode: "insensitive" } },
                { asset: { assetTag: { contains: cleanQuery, mode: "insensitive" } } },
                { asset: { item: { name: { contains: q, mode: "insensitive" } } } },
              ],
            },
            include: {
              asset: {
                include: { item: true },
              },
            },
            orderBy: { entryDate: "desc" },
            take: 4,
          })
        : Promise.resolve([]),

      // 6. Eventos & Sorteios
      canSearchEvents
        ? prisma.event.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { location: { contains: q, mode: "insensitive" } },
              ],
            },
            include: {
              _count: {
                select: {
                  participants: true,
                  presences: true,
                  prizes: true,
                  winners: true,
                },
              },
            },
            orderBy: { date: "desc" },
            take: 5,
          })
        : Promise.resolve([]),

      // 7. Pessoas & Biometria
      canSearchPeople
        ? prisma.person.findMany({
            where: {
              active: true,
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { registration: { contains: cleanQuery, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { affiliation: { contains: q, mode: "insensitive" } },
              ],
            },
            include: {
              _count: {
                select: {
                  participations: true,
                  presences: true,
                  faceEmbeddings: true,
                },
              },
            },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    // Sanitizar dados de pessoas (LGPD: CPF mascarado/removido)
    const people = rawPeople.map((p: any) => ({
      id: p.id,
      name: p.name,
      registration: p.registration,
      email: p.email,
      category: p.category,
      affiliation: p.affiliation,
      photoUrl: p.photoUrl,
      hasFaceEnrolled: (p._count?.faceEmbeddings || 0) > 0 || !!p.photoUrl,
      participantsCount: p._count?.participations || 0,
      presencesCount: p._count?.presences || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        assets,
        boxes,
        loans,
        maintenances,
        events,
        people,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" || "Erro na busca global." },
      { status: 500 }
    );
  }
}
