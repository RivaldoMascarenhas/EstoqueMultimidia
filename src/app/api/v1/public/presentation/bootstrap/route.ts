import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompareTokens } from "@/lib/presentation-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, token } = body;

    if (!eventId || !token) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'eventId' e 'token' são obrigatórios." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, presentationToken: true, name: true },
    });

    if (!event || !safeCompareTokens(event.presentationToken, token)) {
      return NextResponse.json(
        { success: false, error: "Token de apresentação inválido." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Sessão de apresentação autenticada com sucesso.",
      eventId: event.id,
      eventName: event.name,
    });

    // Set secure cookie for public presentation session
    response.cookies.set({
      name: "presentation_session",
      value: token.trim(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return response;
  } catch (error: any) {
    console.error("Erro no bootstrap de apresentação:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao inicializar sessão de apresentação." },
      { status: 500 }
    );
  }
}
