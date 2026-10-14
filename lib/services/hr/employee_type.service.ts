// lib/services/hr/employee_type.service.ts

import { pool } from "@/lib/db";
import { EmployeeType } from "@/types/hr/employee_type";

export class EmployeeTypeService {
  static async list(companyId: string): Promise<EmployeeType[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_employee_type
      WHERE company_id = $1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(
    companyId: string,
    data: EmployeeType,
  ): Promise<EmployeeType> {

    const result = await pool.query(
      `
      INSERT INTO hr_employee_type (
        company_id,
        name,
        status
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        companyId,
        data.name,
        data.status || "active",
      ],
    );

    return result.rows[0];
  }

  static async update(companyId: string, id: string, data: EmployeeType) {
    await pool.query(
      `
      UPDATE hr_employee_type
      SET
        name = $1,
        status = $2
      WHERE id = $3
      AND company_id = $4
      `,
      [
        data.name,
        data.status || "active",
        id,
        companyId,
      ],
    );
  }

  static async delete(companyId: string, id: string) {
    await pool.query(
      `
      DELETE FROM hr_employee_type
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );
  }
}
