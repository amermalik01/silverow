// lib/services/hr/department.service.ts

import { pool } from "@/lib/db";
import { Department } from "@/types/hr/department";

export class DepartmentService {
  static async list(companyId: string): Promise<Department[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_departments
      WHERE company_id = $1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(
    companyId: string,
    data: Department,
  ): Promise<Department> {
    const seqRes = await pool.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "hr_department"],
    );

    const code = seqRes.rows[0].code;

    const result = await pool.query(
      `
      INSERT INTO hr_departments (
        company_id,
        code,
        name,
        description,
        status
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        companyId,
        code,
        data.name,
        data.description || null,
        data.status || "active",
      ],
    );

    return result.rows[0];
  }

  static async update(companyId: string, id: string, data: Department) {
    await pool.query(
      `
      UPDATE hr_departments
      SET
        name = $1,
        description = $2,
        status = $3
      WHERE id = $4
      AND company_id = $5
      `,
      [
        data.name,
        data.description || null,
        data.status || "active",
        id,
        companyId,
      ],
    );
  }

  static async delete(companyId: string, id: string) {
    await pool.query(
      `
      DELETE FROM hr_departments
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );
  }
}
/* import { pool } from "@/lib/db";

export class DepartmentService {
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_departments
      WHERE company_id = $1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(companyId: string, data: any) {
    const seqRes = await pool.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "hr_department"],
    );

    const code = seqRes.rows[0].code;

    const result = await pool.query(
      `
      INSERT INTO hr_departments (
        company_id,
        code,
        name,
        description
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [companyId, code, data.name, data.description || null],
    );

    return result.rows[0];
  }
}
 */
