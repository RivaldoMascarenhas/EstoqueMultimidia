import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovementType, Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const itemId = searchParams.get("itemId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const whereClause: any = {};

    if (itemId) {
      whereClause.itemId = itemId;
    }

    if (type && type !== "ALL") {
      whereClause.type = type as MovementType;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        whereClause.createdAt.gte = isNaN(start.getTime()) ? new Date(startDate) : start;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        whereClause.createdAt.lte = isNaN(end.getTime()) ? new Date(endDate) : end;
      }
    }

    if (search) {
      whereClause.OR = [
        { observation: { contains: search, mode: "insensitive" } },
        { item: { name: { contains: search, mode: "insensitive" } } },
        { item: { sku: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { sourceBox: { code: { contains: search, mode: "insensitive" } } },
        { destBox: { code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        item: {
          include: {
            category: true,
          },
        },
        sourceBox: {
          include: {
            door: true,
          },
        },
        destBox: {
          include: {
            door: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: movements,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar movimentações." },
      { status: 500 }
    );
  }
}
