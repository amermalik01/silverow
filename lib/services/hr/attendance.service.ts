// lib/services/hr/attendance.service.ts

import { pool } from "@/lib/db";

import { Attendance } from "@/types/hr/attendance";

export class AttendanceService {
  /**
   * LIST
   */
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        a.*,

        CONCAT(e.first_name,' ',e.last_name) AS employee_name

      FROM hr_attendance a

      LEFT JOIN employees e
      ON e.id = a.employee_id

      WHERE a.company_id = $1

      ORDER BY a.attendance_date DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  /**
   * GET
   */
  static async get(companyId: string, id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM hr_attendance
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
  static async create(companyId: string, data: Attendance) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // SEQUENCE

      const seqRes = await client.query(
        `
        SELECT get_next_sequence($1,$2) AS code
        `,
        [companyId, "employee_attendance"],
      );

      const attendanceNo = seqRes.rows[0].code;

      // TOTAL HOURS

      const totalHours = this.calculateHours(
        data.check_in,
        data.check_out,
        data.break_minutes || 0,
      );

      const result = await client.query(
        `
        INSERT INTO hr_attendance (
          company_id,
          attendance_no,
          employee_id,
          attendance_date,
          check_in,
          check_out,
          break_minutes,
          total_hours,
          overtime_hours,
          attendance_status,
          remarks
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
        `,
        [
          companyId,
          attendanceNo,

          data.employee_id,
          data.attendance_date,

          data.check_in || null,
          data.check_out || null,

          data.break_minutes || 0,

          totalHours,

          data.overtime_hours || 0,

          data.attendance_status,

          data.remarks || null,
        ],
      );

      await client.query("COMMIT");

      return result.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");

      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * UPDATE
   */
  static async update(companyId: string, id: string, data: Attendance) {
    const totalHours = this.calculateHours(
      data.check_in,
      data.check_out,
      data.break_minutes || 0,
    );

    await pool.query(
      `
      UPDATE hr_attendance
      SET
        employee_id = $1,
        attendance_date = $2,
        check_in = $3,
        check_out = $4,
        break_minutes = $5,
        total_hours = $6,
        overtime_hours = $7,
        attendance_status = $8,
        remarks = $9
      WHERE id = $10
      AND company_id = $11
      `,
      [
        data.employee_id,
        data.attendance_date,

        data.check_in || null,
        data.check_out || null,

        data.break_minutes || 0,

        totalHours,

        data.overtime_hours || 0,

        data.attendance_status,

        data.remarks || null,

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
      DELETE FROM hr_attendance
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );
  }

  /**
   * CALCULATE HOURS
   */
  private static calculateHours(
    checkIn?: string,
    checkOut?: string,
    breakMinutes = 0,
  ) {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(`1970-01-01T${checkIn}`);
    const end = new Date(`1970-01-01T${checkOut}`);

    const diffMs = end.getTime() - start.getTime();

    const hours = diffMs / 1000 / 60 / 60;

    return Number((hours - breakMinutes / 60).toFixed(2));
  }
}

/* import { pool } from "@/lib/db";

export class AttendanceService {
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        a.*,
        e.first_name,
        e.last_name
      FROM hr_attendance a
      LEFT JOIN employees e
      ON e.id = a.employee_id
      WHERE a.company_id = $1
      ORDER BY a.attendance_date DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(companyId: string, data: any) {
    const result = await pool.query(
      `
      INSERT INTO hr_attendance (
        company_id,
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        companyId,
        data.employee_id,
        data.attendance_date,
        data.check_in || null,
        data.check_out || null,
        data.status || "present",
      ],
    );

    return result.rows[0];
  }
} */
