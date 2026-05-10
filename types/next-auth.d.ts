// types/next-auth.d.ts

import NextAuth, {
  DefaultSession,
  DefaultUser,
} from "next-auth";

import { JWT as NextAuthJWT } from "next-auth/jwt";

/* =========================================================
   NEXT-AUTH SESSION TYPES
========================================================= */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;

      /* =================================
         LEGACY / CORE
      ================================= */
      role: string;

      /* =================================
         RBAC
      ================================= */
      roles: string[];

      permissions: string[];

      /* =================================
         COMPANY
      ================================= */
      company_id?: string | null;

      company_slug?: string | null;

      /* =================================
         PLATFORM
      ================================= */
      is_platform_admin: boolean;

      /* =================================
         OPTIONAL EMPLOYEE LINK
      ================================= */
      employee_id?: string | null;

      employee_code?: string | null;

      employee_name?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;

    /* =================================
       LEGACY / CORE
    ================================= */
    role: string;

    /* =================================
       RBAC
    ================================= */
    roles: string[];

    permissions: string[];

    /* =================================
       COMPANY
    ================================= */
    company_id?: string | null;

    company_slug?: string | null;

    /* =================================
       PLATFORM
    ================================= */
    is_platform_admin: boolean;

    /* =================================
       OPTIONAL EMPLOYEE LINK
    ================================= */
    employee_id?: string | null;

    employee_code?: string | null;

    employee_name?: string | null;
  }
}

/* =========================================================
   JWT TYPES
========================================================= */

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string;

    /* =================================
       LEGACY / CORE
    ================================= */
    role: string;

    /* =================================
       RBAC
    ================================= */
    roles: string[];

    permissions: string[];

    /* =================================
       COMPANY
    ================================= */
    company_id?: string | null;

    company_slug?: string | null;

    /* =================================
       PLATFORM
    ================================= */
    is_platform_admin: boolean;

    /* =================================
       OPTIONAL EMPLOYEE LINK
    ================================= */
    employee_id?: string | null;

    employee_code?: string | null;

    employee_name?: string | null;
  }
}
/* import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
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
} */

