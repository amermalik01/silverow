// lib/auth.ts

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthService } from "@/lib/services/auth/auth.service";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",

    maxAge: 60 * 60 * 2, // 2 hours
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "text",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await AuthService.validateUser(
            credentials.email,
            credentials.password,
          );

          if (!user) {
            return null;
          }

          return user;
        } catch (err) {
          console.error("AUTH AUTHORIZE ERROR:", err);

          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role;
        token.roles = user.roles || [];
        token.permissions = user.permissions || [];
        token.company_id = user.company_id ?? null;
        token.company_slug = user.company_slug ?? null;
        token.is_platform_admin = user.is_platform_admin;
        token.employee_id = user.employee_id ?? null;
        token.employee_code = user.employee_code ?? null;
        token.employee_name = user.employee_name ?? null;

        // Persist currency attributes into JWT token storage
        token.base_currency_id = user.base_currency_id ?? null;
        token.base_currency_code = user.base_currency_code ?? null;
        token.base_currency_symbol = user.base_currency_symbol ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.roles = (token.roles as string[]) || [];
        session.user.permissions = (token.permissions as string[]) || [];
        session.user.company_id =
          (token.company_id as string | null | undefined) ?? null;
        session.user.company_slug =
          (token.company_slug as string | null | undefined) ?? null;
        session.user.is_platform_admin = token.is_platform_admin as boolean;
        session.user.employee_id =
          (token.employee_id as string | null | undefined) ?? null;
        session.user.employee_code =
          (token.employee_code as string | null | undefined) ?? null;
        session.user.employee_name =
          (token.employee_name as string | null | undefined) ?? null;

        // Expose currency primitives directly to server components and Client hooks
        session.user.base_currency_id = token.base_currency_id as string | null;
        session.user.base_currency_code = token.base_currency_code as
          | string
          | null;
        session.user.base_currency_symbol = token.base_currency_symbol as
          | string
          | null;
      }
      return session;
    },

    async signIn() {
      return true;
    },

    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
