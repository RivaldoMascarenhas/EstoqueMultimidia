import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getClientIp } from "./ip-utils";

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  throw new Error(
    "NEXTAUTH_SECRET não está definida. Defina uma variável de ambiente segura (ex: `openssl rand -base64 32`) antes de iniciar a aplicação."
  );
}

import { RateLimiter } from "./rate-limiter";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
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

        let rawInput = credentials.email.toLowerCase().trim();
        let inputEmail = rawInput.includes("@") ? rawInput : `${rawInput}@fapce.edu.br`;
        const clientIp = getClientIp(req);

        const accountKey = `login:acc:${inputEmail}`;
        const ipKey = `login:ip:${clientIp}`;

        // 0. Checar Rate Limit por Conta (5 tentativas / 15 min)
        const accountCheck = await RateLimiter.check(accountKey, 5, 15 * 60 * 1000);
        if (!accountCheck.allowed) {
          throw new Error(`Muitas tentativas incorretas para esta conta. Bloqueio temporário por ${accountCheck.waitMinutes || 15} minutos.`);
        }

        // 0.1 Checar Rate Limit por IP contra Password Spraying (15 tentativas / 15 min por IP)
        if (clientIp !== "unknown") {
          const ipCheck = await RateLimiter.check(ipKey, 15, 15 * 60 * 1000);
          if (!ipCheck.allowed) {
            throw new Error(`Limite de tentativas excedido para o seu endereço IP. Bloqueio temporário por ${ipCheck.waitMinutes || 15} minutos.`);
          }
        }

        const registerFailedAttempt = async () => {
          await RateLimiter.recordFailure(accountKey, 5, 15 * 60 * 1000);
          if (clientIp !== "unknown") {
            await RateLimiter.recordFailure(ipKey, 15, 15 * 60 * 1000);
          }
        };

        // 1. Tentar busca exata por e-mail
        let user = await prisma.user.findUnique({
          where: { email: inputEmail },
        });

        if (!user || !user.active) {
          await registerFailedAttempt();
          throw new Error("Credenciais inválidas ou usuário inativo");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          await registerFailedAttempt();
          throw new Error("Credenciais inválidas");
        }

        // Sucesso: limpar contagem de tentativas falhas da conta e do IP
        await RateLimiter.clear(accountKey);
        if (clientIp !== "unknown") {
          await RateLimiter.clear(ipKey);
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

      // Quando a sessão é atualizada (ex: após troca de senha ou alteração de perfil)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, role: true, mustChangePassword: true, avatarUrl: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.avatarUrl = dbUser.avatarUrl
            ? dbUser.avatarUrl.startsWith("data:")
              ? `/api/v1/users/${token.id}/avatar?v=${Date.now()}`
              : dbUser.avatarUrl
            : null;
        }
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
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
