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

// Rate limiter in-memory para tentativas de login (5 tentativas por 15 minutos por conta/email)
const loginAttemptsMap = new Map<string, { count: number; blockedUntil: number }>();

function checkLoginRateLimit(identifier: string, maxAttempts = 5, blockDurationMs = 15 * 60 * 1000): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttemptsMap.get(identifier);

  if (record) {
    if (record.blockedUntil > now) {
      const waitMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return { allowed: false, waitMinutes };
    }
    // Se o período de bloqueio já passou, reinicia contagem
    if (record.blockedUntil > 0 && record.blockedUntil <= now) {
      loginAttemptsMap.set(identifier, { count: 1, blockedUntil: 0 });
      return { allowed: true };
    }
  }

  return { allowed: true };
}

function recordFailedLogin(identifier: string, maxAttempts = 5, blockDurationMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = loginAttemptsMap.get(identifier);

  if (record) {
    record.count += 1;
    if (record.count >= maxAttempts) {
      record.blockedUntil = now + blockDurationMs;
    }
  } else {
    loginAttemptsMap.set(identifier, { count: 1, blockedUntil: 0 });
  }
}

function resetLoginAttempts(identifier: string) {
  loginAttemptsMap.delete(identifier);
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Informe o e-mail e a senha");
        }

        const inputEmail = credentials.email.toLowerCase().trim();
        const username = inputEmail.split("@")[0];

        // 0. Checar Rate Limit de tentativas
        const rateLimitCheck = checkLoginRateLimit(inputEmail);
        if (!rateLimitCheck.allowed) {
          throw new Error(`Muitas tentativas incorretas. Conta bloqueada temporariamente. Tente novamente em ${rateLimitCheck.waitMinutes || 15} minutos.`);
        }

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
          recordFailedLogin(inputEmail);
          throw new Error("Credenciais inválidas ou usuário inativo");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          recordFailedLogin(inputEmail);
          throw new Error("Credenciais inválidas");
        }

        // Sucesso: limpar contagem de tentativas falhas
        resetLoginAttempts(inputEmail);

        // Registrar log de auditoria de login
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
            details: { email: user.email, role: user.role },
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
      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.avatarUrl !== undefined) {
          token.avatarUrl = session.user.avatarUrl
            ? session.user.avatarUrl.startsWith("data:")
              ? `/api/v1/users/${token.id}/avatar?v=${Date.now()}`
              : session.user.avatarUrl
            : null;
        }
        if (session.user.mustChangePassword !== undefined) token.mustChangePassword = session.user.mustChangePassword;
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
