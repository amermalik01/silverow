// /app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// , { AuthOptions }
// import CredentialsProvider from "next-auth/providers/credentials";
// import * as bcrypt from "bcryptjs";
// import { Pool } from "pg";

// import type { JWT } from "next-auth/jwt";
// import type { Session } from "next-auth";
// PostgreSQL pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });
// AuthOptions
/* export const authOptions: AuthOptions = {
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

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        // Detect subdomain
        const host = req.headers?.host || "admin.localhost";
        const subdomain = host.split(".")[0];

        const client = await pool.connect();
        try {
          let query = "";
          let values: string[] = [];

          if (subdomain === "admin") {
            query = `
                SELECT * FROM users
                WHERE email = $1
                AND is_platform_admin = true
                AND status = 'active'
            `;
            values = [credentials.email];
          } else {
            query = `
                SELECT u.*, c.slug as company_slug
                FROM users u
                JOIN companies c ON u.company_id = c.id
                WHERE u.email = $1
                AND c.slug = $2
                AND u.status = 'active'
            `;
            values = [credentials.email, subdomain];
          }

          console.log("credentials === ", credentials);
          console.log("subdomain === ", subdomain);
          console.log("query === ", query);

          const result = await client.query(query, values);
          const user = result.rows[0];
          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password_hash,
          );
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            is_platform_admin: user.is_platform_admin,
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
        session.user.is_platform_admin = token.is_platform_admin as boolean;
        session.user.company_slug =
          (token.company_slug as string | null) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
}; */
