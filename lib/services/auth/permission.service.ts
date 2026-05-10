// lib/services/auth/permission.service.ts

import { pool } from "@/lib/db";

export class PermissionService {
  /**
   * LIST
   */
  static async list() {
    const result = await pool.query(
      `
      SELECT *
      FROM auth_permissions
      ORDER BY module, action
      `,
    );

    return result.rows;
  }

  /**
   * LIST BY MODULE
   */
  static async byModule(module: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM auth_permissions
      WHERE module = $1
      ORDER BY action
      `,
      [module],
    );

    return result.rows;
  }

  /**
   * USER PERMISSIONS
   */
  static async getUserPermissions(
    userId: string,
  ): Promise<string[]> {
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

    return result.rows.map((r) => r.code);
  }
}