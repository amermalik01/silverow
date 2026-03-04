// lib/auth.ts

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import { pool } from "./db";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
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
            [credentials.email]
          );

          const user = result.rows[0];
          if (!user) return null;

          const valid = await bcrypt.compare(
            credentials.password,
            user.password_hash
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
        token.role = user.role;
        token.company_id = user.company_id ?? null;
        token.is_platform_admin = user.is_platform_admin;
        token.company_slug = user.company_slug ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.company_id =
          (token.company_id as string | null | undefined) ?? null;
        session.user.is_platform_admin =
          token.is_platform_admin as boolean;
        session.user.company_slug =
          (token.company_slug as string | null | undefined) ?? null;
      }

      return session;
    },
  },

  // cookies: {
  //   sessionToken: {
  //     name: `__Secure-next-auth.session-token`,
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       path: '/',
  //       domain: process.env.NODE_ENV === 'production' 
  //         ? '.crmsystem.com' 
  //         : '.localhost', 
  //       secure: process.env.NODE_ENV === 'production',
  //     },
  //   },
  // },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};