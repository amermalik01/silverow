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
  /**
   * LIST
   */

  static async list(
    companyId: string,
    filters?: {
      search?: string;
      status?: string;
    },
  ) {
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

      where += `
      AND e.status = $${values.length}
    `;
    }

    const query = `
              SELECT
                  e.*,
                  d.name AS department_name,
                  des.name AS designation_name,

                  CONCAT(m.first_name, ' ', m.last_name)
                  AS manager_name
              FROM employees e
              LEFT JOIN hr_departments d ON d.id = e.department_id
              LEFT JOIN hr_designations des ON des.id = e.designation_id
              LEFT JOIN employees m ON m.id = e.manager_id
              ${where}
              ORDER BY e.created_at DESC
          `;

    const result = await pool.query(query, values);

    return result.rows;
  }

  /**
   * GET ONE
   */

  static async get(companyId: string, id: string) {
    const result = await pool.query(
      `
        SELECT
          e.*,

          d.name AS department_name,

          des.name AS designation_name,

          CONCAT(m.first_name,' ',m.last_name)
            AS manager_name,

          u.email AS login_email,

          u.role AS login_role

        FROM employees e

        LEFT JOIN hr_departments d
          ON d.id = e.department_id

        LEFT JOIN hr_designations des
          ON des.id = e.designation_id

        LEFT JOIN employees m
          ON m.id = e.manager_id

        LEFT JOIN users u
          ON u.employee_id = e.id

        WHERE e.id = $1
        AND e.company_id = $2
      `,
      [id, companyId],
    );

    return result.rows[0] || null;
  }

  /**
   * CREATE
   */

  static async create(companyId: string, payload: EmployeePayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // GENERATE EMPLOYEE CODE
      const seqRes = await client.query(
        `
        SELECT get_next_sequence($1,$2) AS code
        `,
        [companyId, "employees"],
      );

      const employeeCode = seqRes.rows[0].code;

      // INSERT EMPLOYEE

      const employeeResult = await client.query(
        `
        INSERT INTO employees (
            company_id,
            employee_code,
            first_name,
            last_name,
            email,
            mobile,
            hire_date,
            department_id,
            designation_id,
            manager_id,
            employment_type_id,
            basic_salary,
            status
        )
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
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

      // CREATE LOGIN ACCESS

      if (payload.access?.enable_login) {
        const passwordHash = await bcrypt.hash(
          payload.access.password || "123456",
          10,
        );

        await client.query(
          `
            INSERT INTO users (
              company_id,
              employee_id,
              email,
              password_hash,
              role,
              status
            )
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

      // INSERT CONTACTS

      for (const contact of payload.contacts || []) {
        await this.insertContact(client, companyId, employee.id, contact);
      }

      // INSERT ADDRESSES

      for (const address of payload.addresses || []) {
        await this.insertAddress(client, companyId, employee.id, address);
      }

      // COMMIT

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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
      UPDATE employees
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        mobile = $4,
        hire_date = $5,
        department_id = $6,
        designation_id = $7,
        manager_id = $8,
        employment_type_id = $9,
        basic_salary = $10,
        status = $11,
        updated_at = now()
      WHERE id = $12
      AND company_id = $13
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

      /**
       * DELETE OLD CONTACTS
       */

      await client.query(
        `
      DELETE FROM employee_contacts
      WHERE employee_id = $1
      `,
        [id],
      );

      /**
       * INSERT CONTACTS
       */

      for (const contact of payload.contacts || []) {
        await this.insertContact(client, companyId, id, contact);
      }

      /**
       * DELETE OLD ADDRESSES
       */

      await client.query(
        `
      DELETE FROM employee_addresses
      WHERE employee_id = $1
      `,
        [id],
      );

      /**
       * INSERT ADDRESSES
       */

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
   * (Hard delete for now — can be converted to soft delete later)
   */
  static async delete(companyId: string, id: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /**
       * 1. Delete child records first (IMPORTANT for integrity)
       */

      await client.query(
        `DELETE FROM employee_contacts WHERE employee_id = $1`,
        [id],
      );

      await client.query(
        `DELETE FROM employee_addresses WHERE employee_id = $1`,
        [id],
      );

      await client.query(`DELETE FROM employee_users WHERE employee_id = $1`, [
        id,
      ]);

      /**
       * 2. Delete employee itself
       */

      const result = await client.query(
        `
      DELETE FROM employees
      WHERE id = $1
      AND company_id = $2
      `,
        [id, companyId],
      );

      if (!result.rowCount) {
        throw new Error("Employee not found");
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
    await client.query(
      `
    INSERT INTO employee_contacts (
      company_id,
      employee_id,
      name,
      relation,
      phone,
      email,
      is_emergency
    )
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
    INSERT INTO employee_addresses (
      company_id,
      employee_id,
      address_1,
      address_2,
      city,
      county,
      postcode,
      country_id,
      is_primary
    )
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
/* 
      if (payload.access?.enable_login) {
        const passwordHash = await bcrypt.hash(
          payload.access.password || "123456",
          10,
        );

        const userResult = await client.query(
          `
            INSERT INTO auth_users (
                company_id,
                email,
                password_hash,
                role
            )
            VALUES ($1,$2,$3,$4)
            RETURNING *
            `,
          [
            companyId,
            payload.access.email,
            passwordHash,
            payload.access.role || "employee",
          ],
        );

        const user = userResult.rows[0];

        // LINK EMPLOYEE

        await client.query(
          `
            INSERT INTO employee_users (
                company_id,
                employee_id,
                user_id
            )
            VALUES ($1,$2,$3)
            `,
          [companyId, employee.id, user.id],
        ); 
      }*/
