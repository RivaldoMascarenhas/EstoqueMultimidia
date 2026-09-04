import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.CONSULTA,
    ]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (entity && entity !== "ALL") {
      where.entity = entity;
    }

    if (userId && userId !== "ALL") {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error("Erro ao listar logs de auditoria:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar registros de auditoria." },
      { status: 500 }
    );
  }
}
