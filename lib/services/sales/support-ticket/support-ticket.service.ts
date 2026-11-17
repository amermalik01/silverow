// lib/services/sales/support-ticket/support-ticket.service.ts

import { pool } from "@/lib/db";
import type { PoolClient, QueryResultRow } from "pg";
import type { FetchParams, FetchResponse } from "@/types/table";

import {
  SupportTicketPayloadSchema,
  type SupportTicketInput,
  type SupportTicketNoteInput,
  type SupportTicketPayload,
  type SupportTicketStage,
} from "@/lib/validations/support-ticket.schema";

interface SupportTicketRecord extends QueryResultRow {
  id: string;
  company_id: string;
  ticket_no: string;
  customer_no: string;
  customer_name: string;
  open_date: string;
  close_date: string | null;
  status: SupportTicketStage;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface SupportTicketNoteRecord extends QueryResultRow {
  id: string;
  ticket_no: string;
  author: string;
  title: string;
  content: string;
  timestamp: string;
}

interface SupportTicketDetails {
  ticket: SupportTicketRecord;
  notes: SupportTicketNoteRecord[];
}

export interface SupportTicketListRecord extends QueryResultRow {
  id: string;
  ticket_no: string;
  customer_no: string;
  customer_name: string;
  open_date: string;
  close_date: string | null;
  status: SupportTicketStage;
  apply_to_si: string | null;
  apply_to_item: string | null;
  ref_no: string | null;
  batch_frame_no: string | null;
  cust_order_no: string | null;
  city: string | null;
  docs_attached: number;
}

export class SupportTicketService {
  static async list(companyId: string): Promise<SupportTicketRecord[]> {
    const result = await pool.query<SupportTicketRecord>(
      `
      SELECT *
      FROM support_tickets
      WHERE company_id = $1
      ORDER BY created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<SupportTicketListRecord>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const filters = params.filters ?? {};
    const search =
      typeof params.search === "string" ? params.search.trim() : "";

    const sortFields: Record<string, string> = {
      open_date: "st.open_date",
      close_date: "st.close_date",
      ticket_no: "st.ticket_no",
      customer_name: "COALESCE(NULLIF(st.customer_name, ''), p.name, '')",
      status: "st.status",
      docs_attached: "COALESCE(att.docs_attached, 0)",
      apply_to_si: "st.apply_to_si",
      apply_to_item: "st.apply_to_item",
      ref_no: "st.ref_no",
      batch_frame_no: "st.batch_frame_no",
      cust_order_no: "st.cust_order_no",
      city: "st.city",
    };

    const sortColumn =
      params.sortBy && sortFields[params.sortBy]
        ? sortFields[params.sortBy]
        : "st.created_at";

    const sortDirection =
      params.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const values: (string | number)[] = [companyId];
    const whereClauses = ["st.company_id = $1"];

    const addValue = (value: string | number): number => {
      values.push(value);
      return values.length;
    };

    if (search) {
      const index = addValue(`%${search}%`);

      whereClauses.push(`
        (
          st.ticket_no ILIKE $${index}
          OR COALESCE(st.customer_name, '') ILIKE $${index}
          OR COALESCE(p.name, '') ILIKE $${index}
          OR COALESCE(st.status::text, '') ILIKE $${index}
          OR COALESCE(st.apply_to_si, '') ILIKE $${index}
          OR COALESCE(st.apply_to_item, '') ILIKE $${index}
          OR COALESCE(st.ref_no, '') ILIKE $${index}
          OR COALESCE(st.batch_frame_no, '') ILIKE $${index}
          OR COALESCE(st.cust_order_no, '') ILIKE $${index}
          OR COALESCE(st.city, '') ILIKE $${index}
        )
      `);
    }

    for (const [columnKey, filter] of Object.entries(filters)) {
      if (!filter) continue;

      const filterableFields: Record<string, string> = {
        ticket_no: "st.ticket_no",
        customer_name: "COALESCE(NULLIF(st.customer_name, ''), p.name, '')",
        status: "st.status::text",
        apply_to_si: "st.apply_to_si",
        apply_to_item: "st.apply_to_item",
        ref_no: "st.ref_no",
        batch_frame_no: "st.batch_frame_no",
        cust_order_no: "st.cust_order_no",
        city: "st.city",
      };

      const filterColumn = filterableFields[columnKey];

      if (filter.value !== undefined && filter.value !== "") {
        if (filterColumn) {
          const index = addValue(`%${String(filter.value).trim()}%`);
          whereClauses.push(`${filterColumn} ILIKE $${index}`);
        }
      }

      if (columnKey === "open_date" || columnKey === "close_date") {
        const dateColumn =
          columnKey === "open_date" ? "st.open_date" : "st.close_date";

        if (filter.from) {
          const index = addValue(String(filter.from));
          whereClauses.push(`${dateColumn} >= $${index}::date`);
        }

        if (filter.to) {
          const index = addValue(String(filter.to));
          whereClauses.push(`${dateColumn} <= $${index}::date`);
        }
      }
    }

    const whereSql = whereClauses.join(" AND ");

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM support_tickets st
      LEFT JOIN parties p
        ON p.id = st.customer_no
       AND p.company_id = st.company_id
      WHERE ${whereSql}
    `;

    const dataQuery = `
      SELECT
        st.id,
        st.ticket_no,
        st.customer_no,
        COALESCE(
          NULLIF(st.customer_name, ''),
          p.name,
          ''
        ) AS customer_name,
        TO_CHAR(st.open_date, 'YYYY-MM-DD') AS open_date,
        TO_CHAR(st.close_date, 'YYYY-MM-DD') AS close_date,
        st.status,
        st.apply_to_si,
        st.apply_to_item,
        st.ref_no,
        st.batch_frame_no,
        st.cust_order_no,
        st.city,
        COALESCE(att.docs_attached, 0)::int AS docs_attached
      FROM support_tickets st
      LEFT JOIN parties p
        ON p.id = st.customer_no
       AND p.company_id = st.company_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS docs_attached
        FROM attachments a
        WHERE a.module = 'support_ticket'
          AND a.record_id = st.id
      ) att ON TRUE
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST,
               st.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query<{ total: number }>(countQuery, values),
      pool.query<SupportTicketListRecord>(dataQuery, [
        ...values,
        pageSize,
        offset,
      ]),
    ]);

    return {
      data: dataResult.rows,
      totalRecords: countResult.rows[0]?.total ?? 0,
    };
  }

  static async getById(
    companyId: string,
    id: string,
  ): Promise<SupportTicketDetails | null> {
    const ticketResult = await pool.query<SupportTicketRecord>(
      `
      SELECT *
      FROM support_tickets
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [id, companyId],
    );

    if (!ticketResult.rows.length) return null;

    const notesResult = await pool.query<SupportTicketNoteRecord>(
      `
      SELECT
        id,
        ticket_no,
        author,
        title,
        content,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS timestamp
      FROM support_ticket_notes
      WHERE support_ticket_id = $1
        AND company_id = $2
      ORDER BY created_at DESC
      `,
      [id, companyId],
    );

    return {
      ticket: ticketResult.rows[0],
      notes: notesResult.rows,
    };
  }

  static async create(
    companyId: string,
    userId: string,
    rawPayload: unknown,
  ): Promise<SupportTicketRecord> {
    const payload = SupportTicketPayloadSchema.parse(
      rawPayload,
    ) as SupportTicketPayload;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await this.validateReferences(client, companyId, payload.ticket);

      const sequenceResult = await client.query<{ code: string }>(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "support_ticket"],
      );

      const ticketNo = sequenceResult.rows[0]?.code;

      if (!ticketNo) {
        throw new Error("Unable to generate support ticket number.");
      }

      const ticket = await this.insertTicket(
        client,
        companyId,
        userId,
        ticketNo,
        payload.ticket,
      );

      await this.insertNewNotes(
        client,
        companyId,
        ticket.id,
        ticketNo,
        userId,
        payload.notes,
      );

      await client.query(
        `
        INSERT INTO support_ticket_status_history (
          company_id,
          support_ticket_id,
          previous_status,
          new_status,
          changed_by
        )
        VALUES ($1, $2, NULL, $3, $4)
        `,
        [companyId, ticket.id, ticket.status, userId],
      );

      await client.query("COMMIT");

      return ticket;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(
    companyId: string,
    userId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<SupportTicketRecord> {
    const payload = SupportTicketPayloadSchema.parse(
      rawPayload,
    ) as SupportTicketPayload;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<{
        id: string;
        ticket_no: string;
        status: SupportTicketStage;
      }>(
        `
        SELECT id, ticket_no, status
        FROM support_tickets
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [id, companyId],
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw new Error("Support ticket not found.");
      }

      await this.validateReferences(client, companyId, payload.ticket);

      const ticket = await this.updateTicket(
        client,
        companyId,
        userId,
        id,
        payload.ticket,
      );

      await this.insertNewNotes(
        client,
        companyId,
        id,
        existing.ticket_no,
        userId,
        payload.notes,
      );

      if (existing.status !== ticket.status) {
        await client.query(
          `
          INSERT INTO support_ticket_status_history (
            company_id,
            support_ticket_id,
            previous_status,
            new_status,
            changed_by
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [companyId, id, existing.status, ticket.status, userId],
        );
      }

      await client.query("COMMIT");

      return ticket;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async changeStage(
    companyId: string,
    userId: string,
    id: string,
    stage: SupportTicketStage,
  ): Promise<SupportTicketRecord> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<{
        status: SupportTicketStage;
      }>(
        `
      SELECT status
      FROM support_tickets
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
      `,
        [id, companyId],
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw new Error("Support ticket not found.");
      }

      // No update or history entry is needed when the stage is unchanged.
      if (existing.status === stage) {
        const unchangedResult = await client.query<SupportTicketRecord>(
          `
        SELECT *
        FROM support_tickets
        WHERE id = $1
          AND company_id = $2
        `,
          [id, companyId],
        );

        await client.query("COMMIT");

        return unchangedResult.rows[0];
      }

      const updateResult = await client.query<SupportTicketRecord>(
        `
      UPDATE support_tickets
      SET
        status = $1::VARCHAR(30),
        updated_by = $2,
        updated_at = NOW(),
        close_date = CASE
          WHEN $1::VARCHAR(30) = 'Closed'
            THEN COALESCE(close_date, CURRENT_DATE)
          ELSE close_date
        END
      WHERE id = $3
        AND company_id = $4
      RETURNING *
      `,
        [stage, userId, id, companyId],
      );

      const updatedTicket = updateResult.rows[0];

      if (!updatedTicket) {
        throw new Error("Support ticket not found.");
      }

      await client.query(
        `
      INSERT INTO support_ticket_status_history (
        company_id,
        support_ticket_id,
        previous_status,
        new_status,
        changed_by
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
        [companyId, id, existing.status, stage, userId],
      );

      await client.query("COMMIT");

      return updatedTicket;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const result = await pool.query(
      `
      DELETE FROM support_tickets
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      throw new Error("Support ticket not found.");
    }
  }

  private static async validateReferences(
    client: PoolClient,
    companyId: string,
    ticket: SupportTicketInput,
  ): Promise<void> {
    const customerResult = await client.query(
      `
      SELECT id
      FROM parties
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [ticket.customer_no, companyId],
    );

    if (!customerResult.rows.length) {
      throw new Error("Selected customer was not found in this company.");
    }

    if (ticket.assign_person_id) {
      const employeeResult = await client.query(
        `
        SELECT id
        FROM employees
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
        `,
        [ticket.assign_person_id, companyId],
      );

      if (!employeeResult.rows.length) {
        throw new Error("Selected assigned employee was not found.");
      }
    }

    if (ticket.partner_id) {
      const partnerResult = await client.query(
        `
        SELECT id
        FROM parties
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
        `,
        [ticket.partner_id, companyId],
      );

      if (!partnerResult.rows.length) {
        throw new Error("Selected partner was not found in this company.");
      }
    }
  }

  private static async insertTicket(
    client: PoolClient,
    companyId: string,
    userId: string,
    ticketNo: string,
    ticket: SupportTicketInput,
  ): Promise<SupportTicketRecord> {
    const result = await client.query<SupportTicketRecord>(
      `
      INSERT INTO support_tickets (
        company_id,
        ticket_no,
        customer_no,
        customer_name,
        apply_to_si,
        apply_to_item,
        ref_no,
        batch_frame_no,
        address_1,
        address_2,
        city,
        county,
        postcode,
        country,
        cons_no,
        contact_person,
        telephone,
        email,
        assign_person_id,
        assign_person,
        cust_order_no,
        partner_id,
        partner,
        open_date,
        close_date,
        issue_type,
        warranty_check,
        link_to_so,
        link_to_po,
        link_to_cn,
        general_description,
        status,
        created_by,
        updated_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24::date, $25::date, $26, $27, $28,
        $29, $30, $31, $32, $33, $34
      )
      RETURNING *
      `,
      [
        companyId,
        ticketNo,
        ticket.customer_no,
        ticket.customer_name,
        ticket.apply_to_si,
        ticket.apply_to_item,
        ticket.ref_no,
        ticket.batch_frame_no,
        ticket.address_1,
        ticket.address_2,
        ticket.city,
        ticket.county,
        ticket.postcode,
        ticket.country,
        ticket.cons_no,
        ticket.contact_person,
        ticket.telephone,
        ticket.email,
        ticket.assign_person_id,
        ticket.assign_person,
        ticket.cust_order_no,
        ticket.partner_id,
        ticket.partner,
        ticket.open_date,
        ticket.close_date,
        String(ticket.issue_type ?? ""),
        ticket.warranty_check,
        ticket.link_to_so,
        ticket.link_to_po,
        ticket.link_to_cn,
        ticket.general_description,
        ticket.status,
        userId,
        userId,
      ],
    );

    return result.rows[0];
  }

  private static async updateTicket(
    client: PoolClient,
    companyId: string,
    userId: string,
    id: string,
    ticket: SupportTicketInput,
  ): Promise<SupportTicketRecord> {
    const result = await client.query<SupportTicketRecord>(
      `
      UPDATE support_tickets
      SET
        customer_no = $1,
        customer_name = $2,
        apply_to_si = $3,
        apply_to_item = $4,
        ref_no = $5,
        batch_frame_no = $6,
        address_1 = $7,
        address_2 = $8,
        city = $9,
        county = $10,
        postcode = $11,
        country = $12,
        cons_no = $13,
        contact_person = $14,
        telephone = $15,
        email = $16,
        assign_person_id = $17,
        assign_person = $18,
        cust_order_no = $19,
        partner_id = $20,
        partner = $21,
        open_date = $22::date,
        close_date = $23::date,
        issue_type = $24,
        warranty_check = $25,
        link_to_so = $26,
        link_to_po = $27,
        link_to_cn = $28,
        general_description = $29,
        status = $30,
        updated_by = $31,
        updated_at = NOW()
      WHERE id = $32
        AND company_id = $33
      RETURNING *
      `,
      [
        ticket.customer_no,
        ticket.customer_name,
        ticket.apply_to_si,
        ticket.apply_to_item,
        ticket.ref_no,
        ticket.batch_frame_no,
        ticket.address_1,
        ticket.address_2,
        ticket.city,
        ticket.county,
        ticket.postcode,
        ticket.country,
        ticket.cons_no,
        ticket.contact_person,
        ticket.telephone,
        ticket.email,
        ticket.assign_person_id,
        ticket.assign_person,
        ticket.cust_order_no,
        ticket.partner_id,
        ticket.partner,
        ticket.open_date,
        ticket.close_date,
        String(ticket.issue_type ?? ""),
        ticket.warranty_check,
        ticket.link_to_so,
        ticket.link_to_po,
        ticket.link_to_cn,
        ticket.general_description,
        ticket.status,
        userId,
        id,
        companyId,
      ],
    );

    if (!result.rows.length) {
      throw new Error("Support ticket not found.");
    }

    return result.rows[0];
  }

  private static async insertNewNotes(
    client: PoolClient,
    companyId: string,
    ticketId: string,
    ticketNo: string,
    userId: string,
    notes: SupportTicketNoteInput[],
  ): Promise<void> {
    for (const note of notes) {
      // Existing notes already have IDs. Do not insert them again on every save.
      if (note.id) continue;

      await client.query(
        `
        INSERT INTO support_ticket_notes (
          company_id,
          support_ticket_id,
          ticket_no,
          author_id,
          author,
          title,
          content
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          companyId,
          ticketId,
          ticketNo,
          userId,
          note.author || "Current User",
          note.title || "General Note Entry",
          note.content,
        ],
      );
    }
  }
}
