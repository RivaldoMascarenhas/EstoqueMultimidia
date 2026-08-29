import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface PresentationAuthResult {
  isAuthorized: boolean;
  event?: any;
  errorResponse?: NextResponse;
}

function safeCompareTokens(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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

  if (event.status === "CANCELLED") {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Este evento foi cancelado." },
        { status: 403 }
      ),
    };
  }

  if (!safeCompareTokens(event.presentationToken, token)) {
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
