// types/next-auth.d.ts

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      permissions: string[];
      company_id?: string | null;
      company_slug?: string | null;
      is_platform_admin: boolean;
      employee_id?: string | null;
      employee_code?: string | null;
      employee_name?: string | null;
      base_currency_id: string | null;
      base_currency_code: string | null;
      base_currency_symbol: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    roles: string[];
    permissions: string[];
    company_id?: string | null;
    company_slug?: string | null;
    is_platform_admin: boolean;
    employee_id?: string | null;
    employee_code?: string | null;
    employee_name?: string | null;
    base_currency_id: string | null;
    base_currency_code: string | null;
    base_currency_symbol: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string;
    role: string;
    roles: string[];
    permissions: string[];
    company_id?: string | null;
    company_slug?: string | null;
    is_platform_admin: boolean;
    employee_id?: string | null;
    employee_code?: string | null;
    employee_name?: string | null;
    base_currency_id: string | null;
    base_currency_code: string | null;
    base_currency_symbol: string | null;
  }
}
