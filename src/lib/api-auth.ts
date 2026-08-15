import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const MASTER_API_KEY = process.env.EXTERNAL_API_MASTER_KEY || "unifap_sec_n8n_master_integration_key_2026";

export interface ApiAuthResult {
  authenticated: boolean;
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
      error: "Cabeçalho de autenticação ausente. Forneça 'Authorization: Bearer <chave>' ou 'x-api-key: <chave>'.",
    };
  }

  // 1. Validar contra Chave Mestre de Integração
  if (token === MASTER_API_KEY) {
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", active: true },
      select: { id: true, name: true, role: true },
    });

    return {
      authenticated: true,
      user: adminUser || {
        id: "n8n-system-admin",
        name: "Serviço de Integração n8n",
        role: "ADMIN",
      },
    };
  }

  // 2. Validar contra chaves cadastradas no banco de dados
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      active: true,
      OR: [
        { keyHash: token },
        { id: token },
      ],
    },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  if (!apiKeyRecord) {
    return {
      authenticated: false,
      error: "Chave de API inválida ou revogada.",
    };
  }

  // Atualizar timestamp de último uso
  prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    authenticated: true,
    user: apiKeyRecord.user,
  };
}
