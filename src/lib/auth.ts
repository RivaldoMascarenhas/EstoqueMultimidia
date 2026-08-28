import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET não está definida. Defina uma variável de ambiente segura (ex: `openssl rand -base64 32`) antes de iniciar a aplicação."
  );
}

// Rate limiter em memória com proteção contra Força Bruta por Conta e por IP (Cloudflare / Proxies)
const loginAttemptsMap = new Map<string, { count: number; blockedUntil: number }>();

function checkRateLimit(key: string, maxAttempts: number, blockDurationMs: number): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);

  if (record) {
    if (record.blockedUntil > now) {
      const waitMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return { allowed: false, waitMinutes };
    }
    // Se o período de bloqueio já passou, reinicia contagem
    if (record.blockedUntil > 0 && record.blockedUntil <= now) {
      loginAttemptsMap.set(key, { count: 1, blockedUntil: 0 });
      return { allowed: true };
    }
  }

  return { allowed: true };
}

function recordFailure(key: string, maxAttempts: number, blockDurationMs: number) {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);

  if (record) {
    record.count += 1;
    if (record.count >= maxAttempts) {
      record.blockedUntil = now + blockDurationMs;
    }
  } else {
    loginAttemptsMap.set(key, { count: 1, blockedUntil: 0 });
  }
}

function clearAttempts(key: string) {
  loginAttemptsMap.delete(key);
}

function getClientIp(req: any): string {
  if (!req?.headers) return "unknown";
  const headers = req.headers;
  const cfIp = headers["cf-connecting-ip"] || headers["CF-Connecting-IP"];
  if (typeof cfIp === "string" && cfIp) return cfIp.trim();
  
  const xForwardedFor = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (typeof xForwardedFor === "string" && xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  
  const xRealIp = headers["x-real-ip"] || headers["X-Real-IP"];
  if (typeof xRealIp === "string" && xRealIp) return xRealIp.trim();
  
  return "unknown";
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email", placeholder: "nome.sobrenome@fapce.edu.br" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Informe o e-mail e a senha");
        }

        const inputEmail = credentials.email.toLowerCase().trim();
        const username = inputEmail.split("@")[0];
        const clientIp = getClientIp(req);

        const accountKey = `acc:${inputEmail}`;
        const ipKey = `ip:${clientIp}`;

        // 0. Checar Rate Limit por Conta (5 tentativas / 15 min)
        const accountCheck = checkRateLimit(accountKey, 5, 15 * 60 * 1000);
        if (!accountCheck.allowed) {
          throw new Error(`Muitas tentativas incorretas para esta conta. Bloqueio temporário por ${accountCheck.waitMinutes || 15} minutos.`);
        }

        // 0.1 Checar Rate Limit por IP contra Password Spraying (15 tentativas / 15 min por IP)
        if (clientIp !== "unknown") {
          const ipCheck = checkRateLimit(ipKey, 15, 15 * 60 * 1000);
          if (!ipCheck.allowed) {
            throw new Error(`Limite de tentativas excedido para o seu endereço IP. Bloqueio temporário por ${ipCheck.waitMinutes || 15} minutos.`);
          }
        }

        const registerFailedAttempt = () => {
          recordFailure(accountKey, 5, 15 * 60 * 1000);
          if (clientIp !== "unknown") {
            recordFailure(ipKey, 15, 15 * 60 * 1000);
          }
        };

        // 1. Tentar busca exata por e-mail
        let user = await prisma.user.findUnique({
          where: { email: inputEmail },
        });

        // 2. Se não encontrar, tentar busca por prefixo (ex: rivaldo ou rivaldo.mascarenhas)
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { startsWith: username + "@" } },
                { email: { startsWith: username + "." } },
              ],
            },
          });
        }

        if (!user || !user.active) {
          registerFailedAttempt();
          throw new Error("Credenciais inválidas ou usuário inativo");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          registerFailedAttempt();
          throw new Error("Credenciais inválidas");
        }

        // Sucesso: limpar contagem de tentativas falhas da conta e do IP
        clearAttempts(accountKey);
        if (clientIp !== "unknown") {
          clearAttempts(ipKey);
        }

        // Registrar log de auditoria de login
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
            details: { email: user.email, role: user.role, clientIp },
          },
        }).catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.avatarUrl = user.avatarUrl
          ? user.avatarUrl.startsWith("data:")
            ? `/api/v1/users/${user.id}/avatar`
            : user.avatarUrl
          : null;
      }

      // O cliente pode solicitar apenas alterações de perfil visual não privilegiadas
      if (trigger === "update" && session?.user) {
        if (typeof session.user.name === "string" && session.user.name.trim()) {
          token.name = session.user.name.trim();
        }
        if (session.user.avatarUrl !== undefined) {
          token.avatarUrl = session.user.avatarUrl
            ? session.user.avatarUrl.startsWith("data:")
              ? `/api/v1/users/${token.id}/avatar?v=${Date.now()}`
              : session.user.avatarUrl
            : null;
        }
        // Jamais aceitar token.role, token.mustChangePassword ou token.id do cliente
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as Role;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
