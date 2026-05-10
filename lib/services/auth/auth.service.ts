// lib/services/auth/auth.service.ts

import bcrypt from "bcryptjs";

import { pool } from "@/lib/db";

export class AuthService {
  /**
   * VALIDATE USER LOGIN
   */
  static async validateUser(email: string, password: string) {
    const result = await pool.query(
      `
      SELECT
        u.*,
        c.slug AS company_slug
      FROM users u
      LEFT JOIN companies c
        ON c.id = u.company_id
      WHERE u.email = $1
      AND u.status = 'active'
      `,
      [email],
    );

    const user = result.rows[0];

    if (!user) {
      return null;
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return null;
    }

    // LOAD ROLES
    const roles = await this.getUserRoles(user.id);

    // LOAD PERMISSIONS
    const permissions = await this.getUserPermissions(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles,
      permissions,
      company_id: user.company_id,
      company_slug: user.company_slug,
      is_platform_admin: user.is_platform_admin,
    };
  }

  /**
   * GET USER ROLES
   */
  static async getUserRoles(userId: string): Promise<string[]> {
    const result = await pool.query(
      `
      SELECT r.code
      FROM user_roles ur
      INNER JOIN auth_roles r
        ON r.id = ur.role_id
      WHERE ur.user_id = $1
      `,
      [userId],
    );

    return result.rows.map((r) => r.code);
  }

  /**
   * GET USER PERMISSIONS
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    const result = await pool.query(
      `
      SELECT DISTINCT p.code
      FROM user_roles ur
      INNER JOIN auth_role_permissions rp
        ON rp.role_id = ur.role_id
      INNER JOIN auth_permissions p
        ON p.id = rp.permission_id
      WHERE ur.user_id = $1
      `,
      [userId],
    );

    return result.rows.map((p) => p.code);
  }
}
