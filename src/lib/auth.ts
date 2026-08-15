import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

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
        email: { label: "E-mail", type: "email", placeholder: "usuario@unifap.br" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Informe o e-mail e a senha");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.active) {
          throw new Error("Credenciais inválidas ou usuário inativo");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Credenciais inválidas");
        }

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
  secret: process.env.NEXTAUTH_SECRET || "unifap_secret_key_super_secure_development_2026_jwt_token",
};
