import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface PresentationAuthResult {
  isAuthorized: boolean;
  event?: any;
  errorResponse?: NextResponse;
}

/**
 * Validates access to public event endpoints using presentation token from query, header or cookie
 */
export async function requirePresentationToken(
  req: NextRequest,
  eventId: string
): Promise<PresentationAuthResult> {
  const { searchParams } = new URL(req.url);
  const tokenFromQuery = searchParams.get("token");
  const tokenFromHeader = req.headers.get("x-presentation-token");
  const tokenFromCookie = req.cookies.get("presentation_session")?.value;

  const token = (tokenFromQuery || tokenFromHeader || tokenFromCookie || "").trim();

  if (!token) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Token de apresentação obrigatório não fornecido." },
        { status: 401 }
      ),
    };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      theme: true,
      soundConfig: true,
      _count: {
        select: {
          participants: true,
          presences: true,
          prizes: true,
          winners: true,
        },
      },
    },
  });

  if (!event) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Evento não encontrado." },
        { status: 404 }
      ),
    };
  }

  if (event.presentationToken !== token) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Token de apresentação inválido ou expirado." },
        { status: 401 }
      ),
    };
  }

  return {
    isAuthorized: true,
    event,
  };
}
