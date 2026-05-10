// lib/services/hr/payroll.service.ts

/* import { pool } from "@/lib/db";

export class PayrollService {
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        p.*,
        e.first_name,
        e.last_name
      FROM hr_payroll p
      LEFT JOIN employees e
      ON e.id = p.employee_id
      WHERE p.company_id = $1
      ORDER BY p.created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async create(companyId: string, data: any) {
    const netSalary =
      Number(data.basic_salary || 0) +
      Number(data.allowances || 0) -
      Number(data.deductions || 0);

    const result = await pool.query(
      `
      INSERT INTO hr_payroll (
        company_id,
        employee_id,
        payroll_month,
        basic_salary,
        allowances,
        deductions,
        net_salary
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        companyId,
        data.employee_id,
        data.payroll_month,
        data.basic_salary || 0,
        data.allowances || 0,
        data.deductions || 0,
        netSalary,
      ],
    );

    return result.rows[0];
  }
} */
