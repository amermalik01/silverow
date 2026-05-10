// lib/services/auth/role.service.ts

import { pool } from "@/lib/db";

export class RoleService {
  /**
   * LIST
   */
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM auth_roles
      WHERE company_id = $1
      ORDER BY name
      `,
      [companyId],
    );

    return result.rows;
  }

  /**
   * CREATE ROLE
   */
  static async create(
    companyId: string,
    payload: {
      code: string;
      name: string;
      description?: string;
    },
  ) {
    const result = await pool.query(
      `
      INSERT INTO auth_roles (
        company_id,
        code,
        name,
        description
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [companyId, payload.code, payload.name, payload.description || null],
    );

    return result.rows[0];
  }

  /**
   * GET PERMISSIONS
   */
  static async getPermissions(roleId: string): Promise<string[]> {
    const result = await pool.query(
      `
    SELECT permission_id
    FROM auth_role_permissions
    WHERE role_id = $1
    `,
      [roleId],
    );

    return result.rows.map((r) => r.permission_id);
  }

  /**
   * ASSIGN PERMISSIONS
   */
  static async assignPermissions(roleId: string, permissionIds: string[]) {
    await pool.query(
      `
      DELETE FROM auth_role_permissions
      WHERE role_id = $1
      `,
      [roleId],
    );

    for (const permissionId of permissionIds) {
      await pool.query(
        `
        INSERT INTO auth_role_permissions (
          role_id,
          permission_id
        )
        VALUES ($1,$2)
        `,
        [roleId, permissionId],
      );
    }
  }

  /**
   * ASSIGN ROLE TO USER
   */
  static async assignUserRole(
    companyId: string,
    userId: string,
    roleId: string,
  ) {
    await pool.query(
      `
      INSERT INTO user_roles (
        company_id,
        user_id,
        role_id
      )
      VALUES ($1,$2,$3)
      ON CONFLICT (user_id, role_id)
      DO NOTHING
      `,
      [companyId, userId, roleId],
    );
  }
}
