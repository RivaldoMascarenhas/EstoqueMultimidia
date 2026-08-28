import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RequireSessionOptions {
  allowPendingPasswordChange?: boolean;
  refreshFromDatabase?: boolean;
}

export async function requireSession(
  allowedRoles?: Role[],
  options: RequireSessionOptions = {}
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Revalidação em tempo real no banco de dados para segurança estrita
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      avatarUrl: true,
    },
  });

  if (!user || !user.active) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Conta inativa, revogada ou inexistente." },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Trava de segurança: impede o uso da API se a troca obrigatória de senha estiver pendente
  if (user.mustChangePassword && !options.allowPendingPasswordChange) {
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
      user,
    };
  }

  // Validação do papel/role atual do banco de dados (não confia cegamente no JWT)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Permissão insuficiente." },
        { status: 403 }
      ),
      user,
    };
  }

  const refreshedSession = {
    ...session,
    user: {
      ...session.user,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      avatarUrl: user.avatarUrl,
    },
  };

  return {
    session: refreshedSession,
    error: null,
    user,
  };
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
