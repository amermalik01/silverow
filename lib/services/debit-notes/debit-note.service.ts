// lib/services/debit-notes/debit-note.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";

import {
  DebitNote,
  DebitNoteAddress,
  DebitNoteLine,
  DebitNotePayload,
} from "@/types/debit-note";
import { DebitNotePayloadSchema } from "@/lib/validations/debit-note.schema";

export class DebitNoteService {
  static async list(companyId: string): Promise<DebitNote[]> {
    const result = await pool.query(
      `
      SELECT dn.*, p.name AS supplier_name
      FROM debit_notes dn
      LEFT JOIN parties p ON p.id = dn.supplier_id
      WHERE dn.company_id = $1
      ORDER BY dn.created_at DESC
      `,
      [companyId],
    );
    return result.rows;
  }

  static async get(companyId: string, id: string) {
    const noteResult = await pool.query(
      `SELECT * FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!noteResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT dnl.*
      FROM debit_note_lines dnl
      WHERE dnl.debit_note_id = $1 AND dnl.is_deleted = false
      ORDER BY dnl.line_no
      `,
      [id],
    );

    const addressResult = await pool.query(
      `SELECT * FROM debit_note_addresses WHERE debit_note_id = $1`,
      [id],
    );

    return {
      note: noteResult.rows[0],
      lines: linesResult.rows,
      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
  }

  static async create(
    companyId: string,
    rawPayload: unknown,
  ): Promise<DebitNote> {
    const payload = DebitNotePayloadSchema.parse(
      rawPayload,
    ) as DebitNotePayload;
    this.validatePayload(payload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const note = payload.debitNote;

      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "debit_note"],
      );
      const debitNoteNo = seqResult.rows[0].code;

      const supplierResult = await client.query(
        `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
        [note.supplier_id, companyId],
      );
      if (!supplierResult.rows.length) throw new Error("Supplier not found");

      const noteResult = await client.query(
        `
        INSERT INTO debit_notes (
          company_id, debit_note_no, supplier_id, document_date,
          warehouse_id, currency_id, reference, notes, 
          subtotal, tax_amount, total_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
        RETURNING *
        `,
        [
          companyId,
          debitNoteNo,
          note.supplier_id,
          note.document_date || null,
          note.warehouse_id || null,
          note.currency_id,
          note.reference || null,
          note.notes || null,
          note.subtotal,
          note.tax_amount,
          note.total_amount,
          note.status,
        ],
      );

      const createdNote = noteResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        const entriesWithUndefined = Object.entries(line).map(
          ([key, value]) => [key, value === null ? undefined : value],
        );
        const sanitizedLine = Object.fromEntries(
          entriesWithUndefined,
        ) as DebitNoteLine;

        await this.insertLine(
          client,
          companyId,
          createdNote.id,
          sanitizedLine,
          lineNo,
        );
        lineNo += 10000;
      }

      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdNote.id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdNote.id,
          payload.shipping_address,
          companyId,
        );
      }

      await client.query("COMMIT");
      return createdNote;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<void> {
    const payload = DebitNotePayloadSchema.parse(
      rawPayload,
    ) as DebitNotePayload;
    this.validatePayload(payload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const note = payload.debitNote;

      const existingResult = await client.query(
        `SELECT status, is_posted FROM debit_notes WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      if (!existingResult.rows.length) throw new Error("Debit note not found");
      if (existingResult.rows[0].is_posted) {
        throw new Error("Posted debit notes cannot be modified");
      }

      await client.query(
        `
        UPDATE debit_notes
        SET
          supplier_id = $1, document_date = $2, warehouse_id = $3,
          currency_id = $4, reference = $5, notes = $6,
          subtotal = $7, tax_amount = $8, total_amount = $9, updated_at = now()
        WHERE id = $10
        `,
        [
          note.supplier_id,
          note.document_date || null,
          note.warehouse_id || null,
          note.currency_id,
          note.reference || null,
          note.notes || null,
          note.subtotal,
          note.tax_amount,
          note.total_amount,
          id,
        ],
      );

      const existingLinesResult = await client.query(
        `SELECT id FROM debit_note_lines WHERE debit_note_id = $1 AND is_deleted = false`,
        [id],
      );
      const existingLineIds = existingLinesResult.rows.map((x) => x.id);
      const incomingLineIds = payload.lines.map((x) => x.id).filter(Boolean);

      for (const existingId of existingLineIds) {
        if (!incomingLineIds.includes(existingId)) {
          await client.query(
            `UPDATE debit_note_lines SET is_deleted = true, updated_at = now() WHERE id = $1`,
            [existingId],
          );
        }
      }

      let lineNo = 10000;
      for (const line of payload.lines) {
        if (line.id) {
          await client.query(
            `
            UPDATE debit_note_lines
            SET
              line_type = $1, item_id = $2, gl_account_id = $3, description = $4,
              warehouse_id = $5, warehouse_location_id = $6, uom_id = $7, quantity = $8,
              unit_cost = $9, discount_type = $10, discount_value = $11, discount_amount = $12,
              vat_percent = $13, vat_amount = $14, net_amount = $15, gross_amount = $16,
              line_no = $17, updated_at = now()
            WHERE id = $18
            `,
            [
              line.line_type,
              line.item_id,
              line.gl_account_id,
              line.description,
              line.warehouse_id,
              line.warehouse_location_id,
              line.uom_id,
              line.quantity,
              line.unit_cost,
              line.discount_type,
              line.discount_value,
              line.discount_amount,
              line.vat_percent,
              line.vat_amount,
              line.net_amount,
              line.gross_amount,
              lineNo,
              line.id,
            ],
          );
        } else {
          const entriesWithUndefined = Object.entries(line).map(
            ([key, value]) => [key, value === null ? undefined : value],
          );
          const sanitizedLine = Object.fromEntries(
            entriesWithUndefined,
          ) as DebitNoteLine;
          await this.insertLine(client, companyId, id, sanitizedLine, lineNo);
        }
        lineNo += 10000;
      }

      await client.query(
        `DELETE FROM debit_note_addresses WHERE debit_note_id = $1`,
        [id],
      );

      if (payload.billing_address) {
        await this.insertAddress(
          client,
          id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          id,
          payload.shipping_address,
          companyId,
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT is_posted FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!existing.rows.length) throw new Error("Debit note not found");
    if (existing.rows[0].is_posted) {
      throw new Error(
        "Cannot delete a posted debit note shell with finalized journal linkages.",
      );
    }

    const result = await pool.query(
      `DELETE FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount) throw new Error("Debit note not found");
  }

  static async postTransactional(
    client: PoolClient,
    companyId: string,
    id: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT is_posted FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rows.length) throw new Error("Debit note not found");
    if (result.rows[0].is_posted) throw new Error("Debit note already posted");

    await client.query(
      `UPDATE debit_notes SET is_posted = true, status = 'posted', posted_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    );

    // Ledger integration components can hook here directly using the shared transactional client client
  }

  private static async insertLine(
    client: PoolClient,
    companyId: string,
    debitNoteId: string,
    line: DebitNoteLine,
    lineNo: number,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO debit_note_lines (
        company_id, debit_note_id, line_no, line_type,
        item_id, gl_account_id, description, warehouse_id, 
        warehouse_location_id, uom_id, quantity, unit_cost,
        discount_type, discount_value, discount_amount,
        vat_percent, vat_amount, net_amount, gross_amount,
        is_deleted, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        $13, $14, $15, $16, $17, $18, $19, false, now()
      )
      `,
      [
        companyId,
        debitNoteId,
        lineNo,
        line.line_type,
        line.item_id || null,
        line.gl_account_id || null,
        line.description || null,
        line.warehouse_id || null,
        line.warehouse_location_id || null,
        line.uom_id || null,
        line.quantity || 0,
        line.unit_cost || 0,
        line.discount_type || null,
        line.discount_value || 0,
        line.discount_amount || 0,
        line.vat_percent || 0,
        line.vat_amount || 0,
        line.net_amount || 0,
        line.gross_amount || 0,
      ],
    );
  }

  private static async insertAddress(
    client: PoolClient,
    debitNoteId: string,
    address: DebitNoteAddress,
    companyId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO debit_note_addresses (
        debit_note_id, address_type, name, phone, email, 
        address_1, address_2, city, state, postcode, country, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        debitNoteId,
        address.address_type,
        address.name || null,
        address.phone || null,
        address.email || null,
        address.address_1 || null,
        address.address_2 || null,
        address.city || null,
        address.state || null,
        address.postcode || null,
        address.country || null,
        companyId,
      ],
    );
  }

  private static validatePayload(payload: DebitNotePayload): void {
    const note = payload.debitNote;
    if (!note.supplier_id) throw new Error("Supplier parameter is required");
    if (!note.document_date)
      throw new Error("Document date context is required");
    if (!payload.lines.length)
      throw new Error("Debit note matrix requires at least one line row item");

    payload.lines.forEach((line, idx) => {
      const r = idx + 1;
      if (!line.line_type)
        throw new Error(`Row ${r}: Line schema type assignment is mandatory`);

      if (line.line_type === "ITEM") {
        if (!line.item_id)
          throw new Error(
            `Row ${r}: Material inventory item reference is required`,
          );
        if (!line.uom_id)
          throw new Error(
            `Row ${r}: Measurement identity group context is missing`,
          );
        if (Number(line.quantity) <= 0)
          throw new Error(
            `Row ${r}: Operational quantity scale must be positive`,
          );
      } else if (line.line_type === "GL_ACCOUNT") {
        if (!line.gl_account_id)
          throw new Error(
            `Row ${r}: Direct financial GL Account relation is mandatory`,
          );
        if (Number(line.quantity) <= 0)
          throw new Error(
            `Row ${r}: Calculation scale quantity must be positive`,
          );
      }
    });

    if (!payload.billing_address)
      throw new Error("Billing location context layout structure is required");
  }
}
