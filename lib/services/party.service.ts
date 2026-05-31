// lib/services/party.service.ts

import { pool } from "@/lib/db";
import { Party } from "@/types/erp";

import {
  PartyUpdateDTO,
  PartyContactDTO,
  PartyAddressDTO,
} from "@/types/erp.dto";

export type PartyType = "lead" | "customer" | "supplier" | "both";

export type PartyStatus = "active" | "inactive";

export interface PartyFilters {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  type?: PartyType;
  status?: PartyStatus;
}

export interface PartyListResponse<T> {
  data: T[];
  total: number;
}

export class PartyService {
  static async list(filters: PartyFilters): Promise<PartyListResponse<Party>> {
    const { companyId, page, limit, search, type, status } = filters;

    const offset = (page - 1) * limit;

    let where = `WHERE company_id = $1`;
    const values: (string | number)[] = [companyId];

    let i = 2;

    if (search) {
      where += `
        AND (
          name ILIKE $${i}
          OR crm_code ILIKE $${i}
          OR customer_code ILIKE $${i}
          OR srm_code ILIKE $${i}
          OR email ILIKE $${i}
          OR phone ILIKE $${i}
        )
      `;
      values.push(`%${search}%`);
      i++;
    }

    if (type) {
      where += ` AND type = $${i}`;
      values.push(type);
      i++;
    }

    if (status) {
      where += ` AND status = $${i}`;
      values.push(status);
      i++;
    }

    const dataQuery = `
      SELECT
        id,
        company_id,
        crm_code,
        customer_code,
        srm_code,
        name,
        type,
        status,
        email,
        phone,
        mobile,
        website,
        credit_limit,
        currency_id,
        salesperson_id,
        bucket_id,
        created_at
      FROM parties
      ${where}
      ORDER BY created_at DESC
      LIMIT $${i}
      OFFSET $${i + 1}
    `;

    values.push(limit, offset);

    const totalQuery = `
      SELECT COUNT(*)::int AS count
      FROM parties
      ${where}
    `;

    const client = await pool.connect();

    try {
      const dataResult = await client.query<Party>(dataQuery, values);
      const totalResult = await client.query<{ count: number }>(
        totalQuery,
        values.slice(0, i - 1),
      );

      return {
        data: dataResult.rows,
        total: totalResult.rows[0].count,
      };
    } finally {
      client.release();
    }
  }

  static async findById(id: string) {
    const client = await pool.connect();

    try {
      const account = await client.query<Party>(
        `SELECT * FROM parties WHERE id = $1`,
        [id],
      );

      const contacts = await client.query(
        `SELECT * FROM party_contacts WHERE party_id = $1`,
        [id],
      );

      const addresses = await client.query(
        `SELECT * FROM party_addresses WHERE party_id = $1`,
        [id],
      );

      const socials = await client.query(
        `SELECT * FROM party_socials WHERE party_id = $1`,
        [id],
      );

      return {
        account: account.rows[0] || null,
        contacts: contacts.rows,
        addresses: addresses.rows,
        socials: socials.rows,
      };
    } finally {
      client.release();
    }
  }

  static async update(
    id: string,
    body: {
      account: PartyUpdateDTO;
      contacts?: PartyContactDTO[];
      addresses?: PartyAddressDTO[];
    },
  ) {
    const client = await pool.connect();

    const { account, contacts = [], addresses = [] } = body;

    try {
      await client.query("BEGIN");

      await client.query(
        `
        UPDATE parties
        SET
          name = $1,
          email = $2,
          phone = $3,
          mobile = $4,
          website = $5,
          credit_limit = $6,
          currency_id = $7,
          salesperson_id = $8,
          status = $9
        WHERE id = $10
        `,
        [
          account.name,
          account.email ?? null,
          account.phone ?? null,
          account.mobile ?? null,
          account.website ?? null,
          account.credit_limit ?? null,
          account.currency_id ?? null,
          account.salesperson_id ?? null,
          account.status ?? "active",
          id,
        ],
      );

      await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [
        id,
      ]);

      for (const c of contacts) {
        await client.query(
          `
          INSERT INTO party_contacts
          (party_id, name, email, phone, mobile, job_title, is_primary)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            id,
            c.name,
            c.email ?? null,
            c.phone ?? null,
            c.mobile ?? null,
            c.job_title ?? null,
            c.is_primary ?? false,
          ],
        );
      }

      await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [
        id,
      ]);

      for (const a of addresses) {
        await client.query(
          `
          INSERT INTO party_addresses
          (party_id, address_1, address_2, city, country, postcode, is_primary)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            id,
            a.address_1 ?? null,
            a.address_2 ?? null,
            a.city ?? null,
            a.country ?? null,
            a.postcode ?? null,
            a.is_primary ?? false,
          ],
        );
      }

      await client.query("COMMIT");

      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
