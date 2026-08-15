import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
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
        },
      });
    }

    const cleanQuery = q.replace(/^#/, ""); // Remove '#' se o usuário digitou #123458 ou #OS-2026-0001

    // Executar buscas paralelas
    const [items, assets, boxes, loans, maintenances] = await Promise.all([
      // 1. Itens do Catálogo
      prisma.item.findMany({
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
      }),

      // 2. Equipamentos Patrimoniais
      prisma.asset.findMany({
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
      }),

      // 3. Caixas Físicas do Armário
      prisma.box.findMany({
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
      }),

      // 4. Empréstimos
      prisma.loan.findMany({
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
      }),

      // 5. Ordens de Serviço (Manutenção)
      prisma.maintenance.findMany({
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
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        assets,
        boxes,
        loans,
        maintenances,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro na busca global." },
      { status: 500 }
    );
  }
}
