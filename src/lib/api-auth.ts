import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface ApiAuthResult {
  authenticated: boolean;
  role?: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  error?: string;
}

export async function validateApiRequest(req: NextRequest): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");

  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  } else if (xApiKey) {
    token = xApiKey.trim();
  }

  if (!token) {
    return {
      authenticated: false,
      error: "Token de autorização ausente.",
    };
  }

  // 1. Validar contra Chave Mestre de Integração (se configurada)
  const masterApiKey = process.env.EXTERNAL_API_MASTER_KEY;
  if (masterApiKey && token === masterApiKey) {
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", active: true },
      select: { id: true, name: true, role: true },
    });

    return {
      authenticated: true,
      role: "ADMIN",
      user: adminUser || {
        id: "n8n-system-admin",
        name: "Serviço de Integração n8n",
        role: "ADMIN",
      },
    };
  }

  // 2. Validar contra chaves de API cadastradas no banco de dados via Hash SHA-256
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: {
      keyHash: tokenHash,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!apiKeyRecord) {
    return {
      authenticated: false,
      error: "Chave de API inválida.",
    };
  }

  if (!apiKeyRecord.active) {
    return {
      authenticated: false,
      error: "Chave de API inativa ou revogada.",
    };
  }

  // Verificar se a chave expirou
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      authenticated: false,
      error: "Chave de API expirada.",
    };
  }

  // Atualizar timestamp de último uso
  prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    authenticated: true,
    role: apiKeyRecord.role,
    user: apiKeyRecord.user,
  };
}
