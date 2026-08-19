import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export interface RequireSessionOptions {
  allowPendingPasswordChange?: boolean;
}

export async function requireSession(
  allowedRoles?: Role[],
  options?: RequireSessionOptions
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      ),
    };
  }

  // Trava de segurança: impede o uso da API se a troca obrigatória de senha estiver pendente
  if (session.user.mustChangePassword && !options?.allowPendingPasswordChange) {
    return {
      session: null,
      error: NextResponse.json(
        { 
          success: false, 
          error: "Troca obrigatória de senha pendente. Por favor, redefina sua senha antes de continuar.",
          mustChangePassword: true,
        },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Permissão insuficiente." },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

export function requireRole(userRole: Role, allowedRoles: Role[]) {
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { success: false, error: "Permissão insuficiente para esta operação." },
      { status: 403 }
    );
  }
  return null;
}
