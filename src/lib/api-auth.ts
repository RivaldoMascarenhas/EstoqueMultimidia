import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface ApiAuthResult {
  authenticated: boolean;
  role?: string;
  permissions: string[];
  user?: {
    id: string;
    name: string;
    role: string;
  };
  apiKeyId?: string;
  error?: string;
}

export async function validateApiRequest(
  req: NextRequest
): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");

  let token = "";

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (xApiKey) {
    token = xApiKey.trim();
  }

  if (!token) {
    return {
      authenticated: false,
      permissions: [],
      error: "Token de autorização ausente.",
    };
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: {
      keyHash: tokenHash,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          active: true,
        },
      },
    },
  });

  if (!apiKeyRecord) {
    return {
      authenticated: false,
      permissions: [],
      error: "Chave de API inválida.",
    };
  }

  if (!apiKeyRecord.active) {
    return {
      authenticated: false,
      permissions: [],
      error: "Chave de API revogada ou inativa.",
    };
  }

  if (!apiKeyRecord.user || !apiKeyRecord.user.active) {
    return {
      authenticated: false,
      permissions: [],
      error: "Usuário proprietário da chave de API está inativo ou foi revogado.",
    };
  }

  if (
    apiKeyRecord.expiresAt &&
    apiKeyRecord.expiresAt <= new Date()
  ) {
    return {
      authenticated: false,
      permissions: [],
      error: "Chave de API expirada.",
    };
  }

  // Atualizar timestamp de último uso de forma assíncrona
  prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    authenticated: true,
    role: apiKeyRecord.role,
    permissions: apiKeyRecord.permissions || [],
    apiKeyId: apiKeyRecord.id,
    user: {
      id: apiKeyRecord.user.id,
      name: apiKeyRecord.user.name,
      role: apiKeyRecord.user.role,
    },
  };
}

export function requireApiPermission(
  auth: ApiAuthResult,
  permission: string
) {
  if (!auth.authenticated) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: auth.error || "Não autorizado.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      ),
    };
  }

  // Administradores ou chaves com permissão explícita ou permissão curinga '*'
  const hasPermission =
    auth.role === "ADMIN" ||
    auth.permissions.includes("*") ||
    auth.permissions.includes(permission);

  if (!hasPermission) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: `Permissão insuficiente. Requer escopo: '${permission}'.`,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      ),
    };
  }

  return {
    allowed: true,
    response: null,
  };
}
