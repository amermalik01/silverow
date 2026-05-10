// lib/services/hr/designation.service.ts

import { pool } from "@/lib/db";

import { Designation } from "@/types/hr/designation";

export class DesignationService {
  /**
   * LIST
   */

  static async list(companyId: string): Promise<Designation[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_designations
      WHERE company_id = $1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return result.rows;
  }

  /**
   * GET
   */

  static async get(companyId: string, id: string): Promise<Designation | null> {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_designations
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );

    return result.rows[0] || null;
  }

  /**
   * CREATE
   */

  static async create(
    companyId: string,
    data: Designation,
  ): Promise<Designation> {
    const seqRes = await pool.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "hr_designation"],
    );

    const code = seqRes.rows[0].code;

    const result = await pool.query(
      `
      INSERT INTO hr_designations (
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

  /**
   * UPDATE
   */

  static async update(
    companyId: string,
    id: string,
    data: Designation,
  ): Promise<void> {
    await pool.query(
      `
      UPDATE hr_designations
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

  /**
   * DELETE
   */

  static async delete(companyId: string, id: string): Promise<void> {
    await pool.query(
      `
      DELETE FROM hr_designations
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );
  }
}

/* import { pool } from "@/lib/db";

export class DesignationService {
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_designations
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
      [companyId, "hr_designation"],
    );

    const code = seqRes.rows[0].code;

    const result = await pool.query(
      `
      INSERT INTO hr_designations (
        company_id,
        code,
        name
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [companyId, code, data.name],
    );

    return result.rows[0];
  }
} */
