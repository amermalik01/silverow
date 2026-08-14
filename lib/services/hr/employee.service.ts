//  lib/services/hr/employee.service.ts

import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

import {
  EmployeePayload,
  EmployeeContact,
  EmployeeAddress,
} from "@/types/hr/employee";
import { PoolClient } from "pg";

export class EmployeeService {
  private static validateEmployeePayload(payload: EmployeePayload) {
    if (!payload?.employee) {
      throw new Error("Missing structural employee data wrapper.");
    }
    const { first_name, last_name, email } = payload.employee;
    if (!first_name || first_name.trim() === "") {
      throw new Error("First name is a required field.");
    }
    if (!last_name || last_name.trim() === "") {
      throw new Error("Last name is a required field.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Provided employee record email format is invalid.");
    }
  }

  static async list(
    companyId: string,
    filters?: {
      search?: string;
      status?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, filters?.limit || 10);
    const offset = (page - 1) * limit;

    const values: unknown[] = [companyId];
    let where = `WHERE e.company_id = $1`;

    if (filters?.search) {
      values.push(`%${filters.search}%`);
      where += `
        AND (
          e.first_name ILIKE $${values.length}
          OR e.last_name ILIKE $${values.length}
          OR e.employee_code ILIKE $${values.length}
        )
      `;
    }

    if (filters?.status) {
      values.push(filters.status);
      where += ` AND e.status = $${values.length}`;
    }

    if (filters?.departmentId) {
      values.push(filters.departmentId);
      where += ` AND e.department_id = $${values.length}`;
    }

    // Pass structural pagination limits safely
    values.push(limit, offset);
    const limitPlaceholder = `$${values.length - 1}`;
    const offsetPlaceholder = `$${values.length}`;

    const query = `
      SELECT
        e.*,
        d.name AS department_name,
        des.name AS designation_name,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        COUNT(*) OVER() as total_count
      FROM employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_designations des ON des.id = e.designation_id
      LEFT JOIN employees m ON m.id = e.manager_id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const result = await pool.query(query, values);
    const totalCount = parseInt(result.rows[0]?.total_count || "0", 10);

    return {
      rows: result.rows.map((row) => {
        const { total_count, ...cleanRow } = row;
        return cleanRow;
      }),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  static async listPaginated(
    companyId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      department_id?: string;
      designation_id?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    },
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 10);
    const offset = (page - 1) * limit;

    const values: unknown[] = [companyId];
    let where = `WHERE e.company_id = $1`;

    if (params.search && params.search.trim() !== "") {
      values.push(`%${params.search.trim()}%`);
      where += `
      AND (
        e.first_name ILIKE $${values.length}
        OR e.last_name ILIKE $${values.length}
        OR e.display_name ILIKE $${values.length}
        OR e.employee_code ILIKE $${values.length}
        OR e.email ILIKE $${values.length}
      )
    `;
    }

    if (params.status) {
      values.push(params.status);
      where += ` AND e.status = $${values.length}`;
    }

    if (params.department_id) {
      values.push(params.department_id);
      where += ` AND e.department_id = $${values.length}`;
    }

    if (params.designation_id) {
      values.push(params.designation_id);
      where += ` AND e.designation_id = $${values.length}`;
    }

    const allowedSortColumns: Record<string, string> = {
      employee_code: "e.employee_code",
      display_name: "e.first_name",
      email: "e.email",
      department_name: "d.name",
      designation_name: "des.name",
      status: "e.status",
      created_at: "e.created_at",
    };

    const sortColumn =
      allowedSortColumns[params.sort_by || ""] || "e.created_at";
    const sortDirection =
      params.sort_order?.toLowerCase() === "asc" ? "ASC" : "DESC";

    values.push(limit, offset);
    const limitPlaceholder = `$${values.length - 1}`;
    const offsetPlaceholder = `$${values.length}`;

    const query = `
      SELECT
        e.*,
        d.name AS department_name,
        des.name AS designation_name,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        COUNT(*) OVER() as total_count
      FROM employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_designations des ON des.id = e.designation_id
      LEFT JOIN employees m ON m.id = e.manager_id
      ${where}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const result = await pool.query(query, values);
    const totalCount = parseInt(result.rows[0]?.total_count || "0", 10);

    return {
      data: result.rows.map((row) => {
        const { total_count, ...cleanRow } = row;
        return cleanRow;
      }),
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  static async get(companyId: string, id: string) {
    const result = await pool.query(
      `
      SELECT
        e.*,
        d.name AS department_name,
        des.name AS designation_name,
        CONCAT(m.first_name,' ',m.last_name) AS manager_name,
        u.email AS login_email,
        u.role AS login_role,
        COALESCE(
          (SELECT json_agg(c) FROM employee_contacts c WHERE c.employee_id = e.id), '[]'::json
        ) AS contacts,
        COALESCE(
          (SELECT json_agg(a) FROM employee_addresses a WHERE a.employee_id = e.id), '[]'::json
        ) AS addresses
      FROM employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_designations des ON des.id = e.designation_id
      LEFT JOIN employees m ON m.id = e.manager_id
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE e.id = $1 AND e.company_id = $2
      `,
      [id, companyId],
    );

    return result.rows[0] || null;
  }

  static async create(companyId: string, payload: EmployeePayload) {
    this.validateEmployeePayload(payload);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const seqRes = await client.query(
        `SELECT get_next_sequence($1,$2) AS code`,
        [companyId, "employees"],
      );
      const employeeCode = seqRes.rows[0].code;

      const employeeResult = await client.query(
        `
        INSERT INTO employees (
          company_id, employee_code, first_name, last_name, email,
          mobile, hire_date, department_id, designation_id, manager_id,
          employment_type_id, basic_salary, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
        `,
        [
          companyId,
          employeeCode,
          payload.employee.first_name,
          payload.employee.last_name,
          payload.employee.email || null,
          payload.employee.mobile || null,
          payload.employee.hire_date,
          payload.employee.department_id || null,
          payload.employee.designation_id || null,
          payload.employee.manager_id || null,
          payload.employee.employment_type_id || null,
          payload.employee.basic_salary || 0,
          payload.employee.status || "active",
        ],
      );

      const employee = employeeResult.rows[0];

      if (payload.access?.enable_login) {
        if (!payload.access.email) throw new Error("Login email required.");
        const passwordHash = await bcrypt.hash(
          payload.access.password || "123456",
          10,
        );

        await client.query(
          `
          INSERT INTO users (company_id, employee_id, email, password_hash, role, status)
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            companyId,
            employee.id,
            payload.access.email,
            passwordHash,
            payload.access.role || "employee",
            "active",
          ],
        );
      }

      for (const contact of payload.contacts || []) {
        await this.insertContact(client, companyId, employee.id, contact);
      }

      for (const address of payload.addresses || []) {
        await this.insertAddress(client, companyId, employee.id, address);
      }

      await client.query("COMMIT");
      return employee;
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
  static async update(companyId: string, id: string, payload: EmployeePayload) {
    this.validateEmployeePayload(payload);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateResult = await client.query(
        `
        UPDATE employees
        SET
          first_name = $1, last_name = $2, email = $3, mobile = $4, hire_date = $5,
          department_id = $6, designation_id = $7, manager_id = $8, employment_type_id = $9,
          basic_salary = $10, status = $11, updated_at = now()
        WHERE id = $12 AND company_id = $13
        `,
        [
          payload.employee.first_name,
          payload.employee.last_name,
          payload.employee.email || null,
          payload.employee.mobile || null,
          payload.employee.hire_date || null,
          payload.employee.department_id || null,
          payload.employee.designation_id || null,
          payload.employee.manager_id || null,
          payload.employee.employment_type_id || null,
          payload.employee.basic_salary || 0,
          payload.employee.status || "active",
          id,
          companyId,
        ],
      );

      if (updateResult.rowCount === 0) {
        throw new Error(
          "Target update employee execution path failed or resource not found.",
        );
      }

      await client.query(
        `DELETE FROM employee_contacts WHERE employee_id = $1`,
        [id],
      );
      for (const contact of payload.contacts || []) {
        await this.insertContact(client, companyId, id, contact);
      }

      await client.query(
        `DELETE FROM employee_addresses WHERE employee_id = $1`,
        [id],
      );
      for (const address of payload.addresses || []) {
        await this.insertAddress(client, companyId, id, address);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * DELETE EMPLOYEE
   */
  static async delete(companyId: string, id: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `DELETE FROM employee_contacts WHERE employee_id = $1`,
        [id],
      );
      await client.query(
        `DELETE FROM employee_addresses WHERE employee_id = $1`,
        [id],
      );
      await client.query(`DELETE FROM users WHERE employee_id = $1`, [id]);

      const result = await client.query(
        `DELETE FROM employees WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );

      if (!result.rowCount) {
        throw new Error("Employee target was not found under current context.");
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private static async insertContact(
    client: PoolClient,
    companyId: string,
    employeeId: string,
    contact: EmployeeContact,
  ) {
    if (!contact.name) throw new Error("Contact name is required.");
    await client.query(
      `
      INSERT INTO employee_contacts (company_id, employee_id, name, relation, phone, email, is_emergency)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        companyId,
        employeeId,
        contact.name,
        contact.relation || null,
        contact.phone || null,
        contact.email || null,
        contact.is_emergency || false,
      ],
    );
  }

  private static async insertAddress(
    client: PoolClient,
    companyId: string,
    employeeId: string,
    address: EmployeeAddress,
  ) {
    await client.query(
      `
      INSERT INTO employee_addresses (company_id, employee_id, address_1, address_2, city, county, postcode, country_id, is_primary)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        companyId,
        employeeId,
        address.address_1 || null,
        address.address_2 || null,
        address.city || null,
        address.county || null,
        address.postcode || null,
        address.country_id || null,
        address.is_primary || false,
      ],
    );
  }
}
