// lib/services/hr/leave.service.ts

import { pool } from "@/lib/db";

import { LeaveRequest } from "@/types/hr/leave";

export class LeaveService {
  /**
   * LIST
   */

  static async list(companyId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      `
      SELECT
        l.*,

        CONCAT(
          e.first_name,
          ' ',
          e.last_name
        ) AS employee_name,

        lt.name AS leave_type_name

      FROM hr_leave_requests l

      LEFT JOIN employees e
      ON e.id = l.employee_id

      LEFT JOIN hr_leave_types lt
      ON lt.id = l.leave_type_id

      WHERE l.company_id = $1

      ORDER BY l.created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  /**
   * GET
   */

  static async get(
    companyId: string,
    id: string,
  ): Promise<LeaveRequest | null> {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_leave_requests
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
    data: LeaveRequest,
  ): Promise<LeaveRequest> {
    // SEQUENCE

    const seqRes = await pool.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "hr_leave"],
    );

    const leaveNo = seqRes.rows[0].code;

    // DAYS

    const start = new Date(data.start_date);

    const end = new Date(data.end_date);

    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    const result = await pool.query(
      `
      INSERT INTO hr_leave_requests (
        company_id,
        leave_no,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      RETURNING *
      `,
      [
        companyId,
        leaveNo,

        data.employee_id,

        data.leave_type_id,

        data.start_date,
        data.end_date,

        diff,

        data.reason || null,

        data.status || "pending",
      ],
    );

    return result.rows[0];
  }

  /**
   * UPDATE
   */

  static async update(companyId: string, id: string, data: LeaveRequest) {
    const start = new Date(data.start_date);

    const end = new Date(data.end_date);

    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    await pool.query(
      `
      UPDATE hr_leave_requests
      SET
        employee_id = $1,
        leave_type_id = $2,
        start_date = $3,
        end_date = $4,
        total_days = $5,
        reason = $6,
        status = $7
      WHERE id = $8
      AND company_id = $9
      `,
      [
        data.employee_id,
        data.leave_type_id,

        data.start_date,
        data.end_date,

        diff,

        data.reason || null,

        data.status || "pending",

        id,
        companyId,
      ],
    );
  }

  /**
   * DELETE
   */

  static async delete(companyId: string, id: string) {
    await pool.query(
      `
      DELETE FROM hr_leave_requests
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );
  }
}
/* import { pool } from "@/lib/db";

export class LeaveService {
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        l.*,
        e.first_name,
        e.last_name
      FROM hr_leaves l
      LEFT JOIN employees e
      ON e.id = l.employee_id
      WHERE l.company_id = $1
      ORDER BY l.created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(companyId: string, data: any) {
    const result = await pool.query(
      `
      INSERT INTO hr_leaves (
        company_id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        companyId,
        data.employee_id,
        data.leave_type,
        data.start_date,
        data.end_date,
        data.total_days,
        data.reason || null,
      ],
    );

    return result.rows[0];
  }
} */
