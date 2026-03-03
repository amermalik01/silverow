// /app/api/auth/[...nextauth]/route.ts

import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";

import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

//   callbacks: {
//     async jwt(params) {
//       const { token, user } = params;
//       if (user) {
//         token.sub = user.id;
//         token.role = user.role;
//         token.company_id = user.company_id || null;
//         token.is_platform_admin = user.is_platform_admin;
//         token.company_slug = user.company_slug ?? null; // add this
//       }
//       return token;
//     },
//     async session(params) {
//       const { session, token } = params;
//       if (session.user) {
//         session.user.id = token.sub as string;
//         session.user.role = token.role as string;
//         session.user.company_id = (token.company_id as string | null) ?? null;
//         session.user.is_platform_admin = token.is_platform_admin as boolean;
//         session.user.company_slug = token.company_slug ?? null;
//       }
//       return session;
//     },
//   },

//   async authorize(credentials, req) {
//     if (!credentials?.email || !credentials.password) return null;

//     const host = req.headers?.host || "";
//     const subdomain = host.split(".")[0];

//     const client = await pool.connect();
//     try {
//       let query = "";
//       let values: string[] = [];

//       if (subdomain === "admin") {
//         // Only platform admins
//         query = `
//     SELECT * FROM users
//     WHERE email = $1
//     AND is_platform_admin = true
//     AND status = 'active'
//   `;
//         values = [credentials.email];
//       } else {
//         // Company users
//         query = `
//     SELECT u.*, c.slug as company_slug FROM users u
//     JOIN companies c ON u.company_id = c.id
//     WHERE u.email = $1
//     AND c.slug = $2
//     AND u.status = 'active'
//   `;
//         values = [credentials.email, subdomain];
//       }

//       const result = await client.query(query, values);
//       const user = result.rows[0];
//       if (!user) return null;

//       const isValid = await bcrypt.compare(
//         credentials.password,
//         user.password_hash,
//       );
//       if (!isValid) return null;

//       return {
//         id: user.id,
//         email: user.email,
//         name: user.name,
//         role: user.role,
//         company_id: user.company_id,
//         is_platform_admin: user.is_platform_admin,
//         company_slug: user.company_slug ?? null,
//       };
//     } finally {
//       client.release();
//     }
//   },

// async redirect({ url, baseUrl, token }) {
//   if (token?.is_platform_admin) {
//     return `https://admin.crmsystem.com`;
//   }

//   if (token?.company_id) {
//     // fetch company slug from DB if not stored in token
//     return `https://${token.company_slug}.crmsystem.com`;
//   }

//   return baseUrl;
// },

/* import NextAuth, { AuthOptions, User as NextAuthUser, JWT as NextAuthJWT, Session as NextAuthSession } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export authOptions so it can be imported elsewhere
export const authOptions = {
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

        // Get subdomain from host header
        const host = req.headers?.host || "admin.localhost";
        const subdomain = host.split(".")[0];

        const client = await pool.connect();

        try {
          let query = "";
          let values: string[] = [];

          if (subdomain === "admin") {
            query = `
              SELECT * FROM users
              WHERE email = $1 AND is_platform_admin = true AND status = 'active'
            `;
            values = [credentials.email];
          } else {
            query = `
              SELECT u.* FROM users u
              JOIN companies c ON u.company_id = c.id
              WHERE u.email = $1 AND c.slug = $2 AND u.status = 'active'
            `;
            values = [credentials.email, subdomain];
          }

          const result = await client.query(query, values);
          const user = result.rows[0];
          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

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
  // token: JWT object, user: returned from authorize() | undefined
  async jwt({
    token,
    user,
  }: {
    token: NextAuthJWT & { role?: string; company_id?: string | null; is_platform_admin?: boolean };
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      company_id?: string | null;
      is_platform_admin: boolean;
    };
  }) {
    if (user) {
      token.sub = user.id;
      token.role = user.role;
      token.company_id = user.company_id || null;
      token.is_platform_admin = user.is_platform_admin;
    }
    return token;
  },

  async session({
    session,
    token,
  }: {
    session: NextAuthSession & { user?: any };
    token: NextAuthJWT & { role?: string; company_id?: string | null; is_platform_admin?: boolean };
  }) {
    if (session.user) {
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      session.user.company_id = token.company_id || null;
      session.user.is_platform_admin = token.is_platform_admin as boolean;
    }
    return session;
  },
},
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Export the NextAuth handler for GET/POST
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
 */

// import bcrypt from "bcrypt";
/* export const authOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const client = await pool.connect();

        try {
          const host = req.headers?.host || "";
          const subdomain = host.split(".")[0];

          let query = "";
        //   let values: any[] = [];
          let values: string[] = [];

          // PLATFORM ADMIN LOGIN
          if (subdomain === "admin") {
            query = `
              SELECT * FROM users 
              WHERE email = $1 
              AND is_platform_admin = true
              AND status = 'active'
            `;
            values = [credentials.email];
          } else {
            // COMPANY LOGIN
            query = `
              SELECT u.* FROM users u
              JOIN companies c ON u.company_id = c.id
              WHERE u.email = $1
              AND c.slug = $2
              AND u.status = 'active'
            `;
            values = [credentials.email, subdomain];
          }

          const result = await client.query(query, values);

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          const valid = await bcrypt.compare(
            credentials.password,
            user.password_hash,
          );

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            is_platform_admin: user.is_platform_admin,
            company_id: user.company_id,
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
        token.sub = user.id; // important
        token.role = user.role;
        token.company_id = user.company_id || null;
        token.is_platform_admin = user.is_platform_admin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.company_id = token.company_id || null;
        session.user.is_platform_admin = token.is_platform_admin;
      }
      return session;
    },
  },
  //   callbacks: {
  //     async jwt({ token, user }) {
  //       if (user) {
  //         token.role = user.role;
  //         token.company_id = user.company_id;
  //         token.is_platform_admin = user.is_platform_admin;
  //       }
  //       return token;
  //     },
  //     async session({ session, token }) {
  //       session.user.id = token.sub;
  //       session.user.role = token.role;
  //       session.user.company_id = token.company_id;
  //       session.user.is_platform_admin = token.is_platform_admin;
  //       return session;
  //     },
  //   },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};


const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
 */
