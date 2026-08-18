import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function requireSession(allowedRoles?: Role[]) {
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
