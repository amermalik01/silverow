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
      where += ` AND (e.department_id = $${values.length} OR e.department_ids @> to_jsonb($${values.length}::text))`;
    }

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
      where += ` AND (e.department_id = $${values.length} OR e.department_ids @> to_jsonb($${values.length}::text))`;
    }

    if (params.designation_id) {
      values.push(params.designation_id);
      where += ` AND (e.designation_id = $${values.length} OR e.designation_ids @> to_jsonb($${values.length}::text))`;
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
      const emp = payload.employee;

      const employeeResult = await client.query(
        `
        INSERT INTO employees (
          company_id, employee_code, first_name, middle_name, last_name, display_name, job_title,
          department_id, department_ids, designation_id, designation_ids, manager_id,
          employment_type_id, job_status, start_date, hours_per_week, status,
          email, phone, mobile, work_telephone, home_telephone, personal_email, work_email, skype, linkedin,
          date_of_birth, gender, national_insurance_no, marital_status, number_of_children, ethnic_origin,
          passport_id_no, driving_licence_no, driving_licence_points,
          bank_account_name, bank_sort_code, bank_account_no, bank_swift_bic, bank_iban, bank_name, bank_address,
          emergency_contact_name, emergency_contact_relation, emergency_contact_mobile, emergency_contact_phone, emergency_contact_email, emergency_contact_telephone,
          basic_salary, salary_currency, salary_frequency, commission_rate, commission_effective_date,
          overtime_rate, company_bonus, entitled_holidays, salary_effective_date, salary_review_date,
          employee_pension_percentage, employee_pension_start_date, employee_pension_change_date, employee_pension_end_date,
          employer_pension_percentage, employer_pension_start_date, employer_pension_change_date, employer_pension_end_date,
          has_company_car, car_make, car_model, car_vin_reg, car_co2, car_market_value, car_fuel_type, car_engine_size, car_date_from, car_date_to,
          has_fuel_card, fuel_card_number, fuel_cost_deductions,
          has_company_laptop, laptop_make, laptop_model, laptop_serial, laptop_date_from, laptop_date_to,
          has_company_tablet, tablet_make, tablet_model, tablet_serial, tablet_date_from, tablet_date_to,
          has_company_mobile, mobile_make, mobile_model, mobile_imei, mobile_date_from, mobile_date_to,
          p11d_value
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35,
          $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53,
          $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71,
          $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89,
          $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102
        )
        RETURNING *
        `,
        [
          companyId,
          employeeCode,
          emp.first_name,
          emp.middle_name || null,
          emp.last_name,
          emp.display_name || null,
          emp.job_title || null,
          emp.department_id || null,
          null, // JSON.stringify(emp.department_ids || []),
          emp.designation_id || null,
          null, // JSON.stringify(emp.designation_ids || []),
          emp.manager_id || null,
          emp.employment_type_id || null,
          emp.job_status || null,
          emp.start_date || null,
          emp.hours_per_week || null,
          emp.status || "active",
          emp.email || null,
          emp.phone || null,
          emp.mobile || null,
          emp.work_telephone || null,
          emp.home_telephone || null,
          emp.personal_email || null,
          emp.work_email || null,
          emp.skype || null,
          emp.linkedin || null,
          emp.date_of_birth || null,
          emp.gender || null,
          emp.national_insurance_no || null,
          emp.marital_status || null,
          emp.number_of_children || 0,
          emp.ethnic_origin || null,
          emp.passport_id_no || null,
          emp.driving_licence_no || null,
          emp.driving_licence_points || 0,
          emp.bank_account_name || null,
          emp.bank_sort_code || null,
          emp.bank_account_no || null,
          emp.bank_swift_bic || null,
          emp.bank_iban || null,
          emp.bank_name || null,
          emp.bank_address || null,
          emp.emergency_contact_name || null,
          emp.emergency_contact_relation || null,
          emp.emergency_contact_mobile || null,
          emp.emergency_contact_phone || null,
          emp.emergency_contact_email || null,
          emp.emergency_contact_telephone || null,
          emp.basic_salary || 0,
          emp.salary_currency || "GBP",
          emp.salary_frequency || "Monthly",
          emp.commission_rate || null,
          emp.commission_effective_date || null,
          emp.overtime_rate || null,
          emp.company_bonus || 0,
          emp.entitled_holidays || 14,
          emp.salary_effective_date || null,
          emp.salary_review_date || null,
          emp.employee_pension_percentage || null,
          emp.employee_pension_start_date || null,
          emp.employee_pension_change_date || null,
          emp.employee_pension_end_date || null,
          emp.employer_pension_percentage || null,
          emp.employer_pension_start_date || null,
          emp.employer_pension_change_date || null,
          emp.employer_pension_end_date || null,
          emp.has_company_car || false,
          emp.car_make || null,
          emp.car_model || null,
          emp.car_vin_reg || null,
          emp.car_co2 || null,
          emp.car_market_value || null,
          emp.car_fuel_type || null,
          emp.car_engine_size || null,
          emp.car_date_from || null,
          emp.car_date_to || null,
          emp.has_fuel_card || false,
          emp.fuel_card_number || null,
          emp.fuel_cost_deductions || false,
          emp.has_company_laptop || false,
          emp.laptop_make || null,
          emp.laptop_model || null,
          emp.laptop_serial || null,
          emp.laptop_date_from || null,
          emp.laptop_date_to || null,
          emp.has_company_tablet || false,
          emp.tablet_make || null,
          emp.tablet_model || null,
          emp.tablet_serial || null,
          emp.tablet_date_from || null,
          emp.tablet_date_to || null,
          emp.has_company_mobile || false,
          emp.mobile_make || null,
          emp.mobile_model || null,
          emp.mobile_imei || null,
          emp.mobile_date_from || null,
          emp.mobile_date_to || null,
          emp.p11d_value || null,
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

  static async update(companyId: string, id: string, payload: EmployeePayload) {
    this.validateEmployeePayload(payload);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const emp = payload.employee;

      const updateResult = await client.query(
        `
        UPDATE employees
        SET
          first_name = $1, middle_name = $2, last_name = $3, display_name = $4, job_title = $5,
          department_id = $6, department_ids = $7::jsonb, designation_id = $8, designation_ids = $9::jsonb,
          manager_id = $10, employment_type_id = $11, job_status = $12, start_date = $13, hours_per_week = $14,
          status = $15, email = $16, phone = $17, mobile = $18, work_telephone = $19, home_telephone = $20,
          personal_email = $21, work_email = $22, skype = $23, linkedin = $24, date_of_birth = $25, gender = $26,
          national_insurance_no = $27, marital_status = $28, number_of_children = $29, ethnic_origin = $30,
          passport_id_no = $31, driving_licence_no = $32, driving_licence_points = $33, bank_account_name = $34,
          bank_sort_code = $35, bank_account_no = $36, bank_swift_bic = $37, bank_iban = $38, bank_name = $39,
          bank_address = $40, emergency_contact_name = $41, emergency_contact_relation = $42, emergency_contact_mobile = $43,
          emergency_contact_phone = $44, emergency_contact_email = $45, emergency_contact_telephone = $46, basic_salary = $47,
          salary_currency = $48, salary_frequency = $49, commission_rate = $50, commission_effective_date = $51,
          overtime_rate = $52, company_bonus = $53, entitled_holidays = $54, salary_effective_date = $55, salary_review_date = $56,
          employee_pension_percentage = $57, employee_pension_start_date = $58, employee_pension_change_date = $59, employee_pension_end_date = $60,
          employer_pension_percentage = $61, employer_pension_start_date = $62, employer_pension_change_date = $63, employer_pension_end_date = $64,
          has_company_car = $65, car_make = $66, car_model = $67, car_vin_reg = $68, car_co2 = $69, car_market_value = $70,
          car_fuel_type = $71, car_engine_size = $72, car_date_from = $73, car_date_to = $74, has_fuel_card = $75,
          fuel_card_number = $76, fuel_cost_deductions = $77, has_company_laptop = $78, laptop_make = $79, laptop_model = $80,
          laptop_serial = $81, laptop_date_from = $82, laptop_date_to = $83, has_company_tablet = $84, tablet_make = $85,
          tablet_model = $86, tablet_serial = $87, tablet_date_from = $88, tablet_date_to = $89, has_company_mobile = $90,
          mobile_make = $91, mobile_model = $92, mobile_imei = $93, mobile_date_from = $94, mobile_date_to = $95, p11d_value = $96,
          updated_at = now()
        WHERE id = $97 AND company_id = $98
        `,
        [
          emp.first_name,
          emp.middle_name || null,
          emp.last_name,
          emp.display_name || null,
          emp.job_title || null,
          emp.department_id || null,
          null, //JSON.stringify(emp.department_ids || []),
          emp.designation_id || null,
          null, //JSON.stringify(emp.designation_ids || []),
          emp.manager_id || null,
          emp.employment_type_id || null,
          emp.job_status || null,
          emp.start_date || null,
          emp.hours_per_week || null,
          emp.status || "active",
          emp.email || null,
          emp.phone || null,
          emp.mobile || null,
          emp.work_telephone || null,
          emp.home_telephone || null,
          emp.personal_email || null,
          emp.work_email || null,
          emp.skype || null,
          emp.linkedin || null,
          emp.date_of_birth || null,
          emp.gender || null,
          emp.national_insurance_no || null,
          emp.marital_status || null,
          emp.number_of_children || 0,
          emp.ethnic_origin || null,
          emp.passport_id_no || null,
          emp.driving_licence_no || null,
          emp.driving_licence_points || 0,
          emp.bank_account_name || null,
          emp.bank_sort_code || null,
          emp.bank_account_no || null,
          emp.bank_swift_bic || null,
          emp.bank_iban || null,
          emp.bank_name || null,
          emp.bank_address || null,
          emp.emergency_contact_name || null,
          emp.emergency_contact_relation || null,
          emp.emergency_contact_mobile || null,
          emp.emergency_contact_phone || null,
          emp.emergency_contact_email || null,
          emp.emergency_contact_telephone || null,
          emp.basic_salary || 0,
          emp.salary_currency || "GBP",
          emp.salary_frequency || "Monthly",
          emp.commission_rate || null,
          emp.commission_effective_date || null,
          emp.overtime_rate || null,
          emp.company_bonus || 0,
          emp.entitled_holidays || 14,
          emp.salary_effective_date || null,
          emp.salary_review_date || null,
          emp.employee_pension_percentage || null,
          emp.employee_pension_start_date || null,
          emp.employee_pension_change_date || null,
          emp.employee_pension_end_date || null,
          emp.employer_pension_percentage || null,
          emp.employer_pension_start_date || null,
          emp.employer_pension_change_date || null,
          emp.employer_pension_end_date || null,
          emp.has_company_car || false,
          emp.car_make || null,
          emp.car_model || null,
          emp.car_vin_reg || null,
          emp.car_co2 || null,
          emp.car_market_value || null,
          emp.car_fuel_type || null,
          emp.car_engine_size || null,
          emp.car_date_from || null,
          emp.car_date_to || null,
          emp.has_fuel_card || false,
          emp.fuel_card_number || null,
          emp.fuel_cost_deductions || false,
          emp.has_company_laptop || false,
          emp.laptop_make || null,
          emp.laptop_model || null,
          emp.laptop_serial || null,
          emp.laptop_date_from || null,
          emp.laptop_date_to || null,
          emp.has_company_tablet || false,
          emp.tablet_make || null,
          emp.tablet_model || null,
          emp.tablet_serial || null,
          emp.tablet_date_from || null,
          emp.tablet_date_to || null,
          emp.has_company_mobile || false,
          emp.mobile_make || null,
          emp.mobile_model || null,
          emp.mobile_imei || null,
          emp.mobile_date_from || null,
          emp.mobile_date_to || null,
          emp.p11d_value || null,
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

/* import bcrypt from "bcryptjs";
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
          payload.employee.start_date,
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
          payload.employee.start_date || null,
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
} */
