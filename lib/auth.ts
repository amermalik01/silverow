// lib/auth.ts

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import * as bcrypt from "bcryptjs";
// import { pool } from "./db";

import { AuthService } from "@/lib/services/auth/auth.service";

/* =========================================================
   AUTH OPTIONS
========================================================= */

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",

    maxAge: 60 * 60 * 2, // 2 hours
  },

  /* =========================================================
     PROVIDERS
  ========================================================= */

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
          if (
            !credentials?.email ||
            !credentials?.password
          ) {
            return null;
          }

          const user =
            await AuthService.validateUser(
              credentials.email,
              credentials.password,
            );

          if (!user) {
            return null;
          }

          return user;
        } catch (err) {
          console.error(
            "AUTH AUTHORIZE ERROR:",
            err,
          );

          return null;
        }
      },
    }),
  ],

  /* =========================================================
     CALLBACKS
  ========================================================= */

  callbacks: {
    /**
     * JWT CALLBACK
     */
    async jwt({ token, user }) {
      /**
       * FIRST LOGIN
       */
      if (user) {
        token.sub = user.id;

        token.id = user.id;

        /* =========================
           CORE
        ========================= */
        token.role = user.role;

        /* =========================
           RBAC
        ========================= */
        token.roles = user.roles || [];

        token.permissions =
          user.permissions || [];

        /* =========================
           COMPANY
        ========================= */
        token.company_id =
          user.company_id ?? null;

        token.company_slug =
          user.company_slug ?? null;

        /* =========================
           PLATFORM
        ========================= */
        token.is_platform_admin =
          user.is_platform_admin;

        /* =========================
           EMPLOYEE
        ========================= */
        token.employee_id =
          user.employee_id ?? null;

        token.employee_code =
          user.employee_code ?? null;

        token.employee_name =
          user.employee_name ?? null;
      }

      return token;
    },

    /**
     * SESSION CALLBACK
     */
    async session({ session, token }) {
      if (session.user) {
        /* =========================
           CORE
        ========================= */
        session.user.id =
          token.sub as string;

        session.user.role =
          token.role as string;

        /* =========================
           RBAC
        ========================= */
        session.user.roles =
          (token.roles as string[]) || [];

        session.user.permissions =
          (token.permissions as string[]) ||
          [];

        /* =========================
           COMPANY
        ========================= */
        session.user.company_id =
          (token.company_id as
            | string
            | null
            | undefined) ?? null;

        session.user.company_slug =
          (token.company_slug as
            | string
            | null
            | undefined) ?? null;

        /* =========================
           PLATFORM
        ========================= */
        session.user.is_platform_admin =
          token.is_platform_admin as boolean;

        /* =========================
           EMPLOYEE
        ========================= */
        session.user.employee_id =
          (token.employee_id as
            | string
            | null
            | undefined) ?? null;

        session.user.employee_code =
          (token.employee_code as
            | string
            | null
            | undefined) ?? null;

        session.user.employee_name =
          (token.employee_name as
            | string
            | null
            | undefined) ?? null;
      }

      return session;
    },

    /**
     * SIGN IN
     */
    async signIn() {
      return true;
    },

    /**
     * REDIRECT
     */
    async redirect({
      url,
      baseUrl,
    }) {
      return url.startsWith(baseUrl)
        ? url
        : baseUrl;
    },
  },

  /* =========================================================
     PAGES
  ========================================================= */

  pages: {
    signIn: "/login",
  },

  /* =========================================================
     SECRET
  ========================================================= */

  secret: process.env.NEXTAUTH_SECRET,
};


/* export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 2, // 2 hours
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const client = await pool.connect();

        try {
          const result = await client.query(
            `
            SELECT u.*, c.slug as company_slug
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = $1
            AND u.status = 'active'
            `,
            [credentials.email],
          );

          const user = result.rows[0];

          if (!user) return null;

          const valid = await bcrypt.compare(
            credentials.password,
            user.password_hash,
          );

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id ?? null,
            is_platform_admin: user.is_platform_admin,
            company_slug: user.company_slug ?? null,
          };
        } finally {
          client.release();
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
        token.company_id = user.company_id ?? null;
        token.is_platform_admin = user.is_platform_admin;
        token.company_slug = user.company_slug ?? null;
      }

      return token;
    },

    async signIn() {
      return true;
    },

    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.company_id =
          (token.company_id as string | null | undefined) ?? null;
        session.user.is_platform_admin = token.is_platform_admin as boolean;
        session.user.company_slug =
          (token.company_slug as string | null | undefined) ?? null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
}; */
