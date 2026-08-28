import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Valida se a origem da requisição mutante confere com a origem da aplicação,
 * oferecendo proteção contra CSRF e requisições cross-origin não autorizadas.
 */
export function validateRequestOrigin(req: NextRequest): NextResponse | null {
  if (!MUTATING_METHODS.has(req.method)) {
    return null;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // Permite chamadas locais de servidor sem header origin
    return null;
  }

  try {
    const requestOrigin = new URL(req.url).origin;
    if (origin !== requestOrigin) {
      return NextResponse.json(
        {
          success: false,
          error: "Origem da requisição não permitida (bloqueio CSRF/Origin).",
        },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Cabeçalho de origem inválido." },
      { status: 400 }
    );
  }

  return null;
}
