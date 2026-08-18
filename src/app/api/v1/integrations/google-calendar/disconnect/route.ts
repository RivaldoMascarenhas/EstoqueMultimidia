import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    await prisma.googleIntegration.updateMany({
      data: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        accountEmail: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conta Google desconectada com sucesso.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao desconectar conta Google." },
      { status: 500 }
    );
  }
}
