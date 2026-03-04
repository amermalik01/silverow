// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      company_id?: string | null;
      is_platform_admin: boolean;
      company_slug?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    company_id?: string | null;
    is_platform_admin: boolean;
    company_slug?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    company_id?: string | null;
    is_platform_admin: boolean;
    company_slug?: string | null;
  }
}
/* import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      company_id?: string | null;
      is_platform_admin: boolean;
      company_slug?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    company_id?: string | null;
    is_platform_admin: boolean;
    company_slug?: string | null;
  }

  interface JWT {
    sub: string;
    role: string;
    company_id?: string | null;
    is_platform_admin: boolean;
    company_slug?: string | null;
  }
} */

