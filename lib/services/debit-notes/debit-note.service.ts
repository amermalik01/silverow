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
      [companyId]
    );
    return result.rows;
  }

  static async get(companyId: string, id: string) {
    const noteResult = await pool.query(
      `SELECT * FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!noteResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT dnl.*
      FROM debit_note_lines dnl
      WHERE dnl.debit_note_id = $1 AND dnl.is_deleted = false
      ORDER BY dnl.line_no
      `,
      [id]
    );

    const addressResult = await pool.query(
      `SELECT * FROM debit_note_addresses WHERE debit_note_id = $1`,
      [id]
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
    rawPayload: unknown
  ): Promise<DebitNote> {
    const payload = DebitNotePayloadSchema.parse(
      rawPayload
    ) as DebitNotePayload;
    this.validatePayload(payload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const note = payload.debitNote;

      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "debit_note"]
      );
      const debitNoteNo = seqResult.rows[0].code;

      const supplierResult = await client.query(
        `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
        [note.supplier_id, companyId]
      );
      if (!supplierResult.rows.length) throw new Error("Supplier not found");

      const noteResult = await client.query(
        `
        INSERT INTO debit_notes (
          company_id, debit_note_no, supplier_id, supplier_no, warehouse_id, currency_id, 
          purchaser, consignment_no, supp_order_no, link_to_so_no, anonymous_supplier,
          order_date, req_receipt_date, receipt_date, expected_date, invoice_date, due_date,
          payable_bank, payable_bank_id, payment_terms, payment_terms_id, payment_method, payment_method_id,
          previous_code, contact, book_in_phone, book_in_contact, book_in_email, shipment_method_id,
          shipment_method, shipping_agent, shipment_ref_no, warehouse_booking_ref_no, supplier_booking_ref_no,
          shipment_po_not_req, reason, linked_po, exchange_rate, document_date, reference,
          freight_charges, shipment_date, delivery_date, delivery_time, notes, internal_notes,
          subtotal, tax_amount, total_amount, status, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, now()
        )
        RETURNING *
        `,
        [
          companyId,
          debitNoteNo,
          note.supplier_id,
          note.supplier_no || null,
          note.warehouse_id || null,
          note.currency_id || null,
          note.purchaser || null,
          note.consignment_no || null,
          note.supp_order_no || null,
          note.link_to_so_no || null,
          note.anonymous_supplier || false,
          note.order_date || null,
          note.req_receipt_date || null,
          note.receipt_date || null,
          note.expected_date || null,
          note.invoice_date || null,
          note.due_date || null,
          note.payable_bank || null,
          note.payable_bank_id || null,
          note.payment_terms || null,
          note.payment_terms_id || null,
          note.payment_method || null,
          note.payment_method_id || null,
          note.previous_code || null,
          note.contact || null,
          note.book_in_phone || null,
          note.book_in_contact || null,
          note.book_in_email || null,
          note.shipment_method_id || null,
          note.shipment_method || null,
          note.shipping_agent || null,
          note.shipment_ref_no || null,
          note.warehouse_booking_ref_no || null,
          note.supplier_booking_ref_no || null,
          note.shipment_po_not_req || false,
          note.reason || null,
          note.linked_po || null,
          note.exchange_rate || 1.0,
          note.document_date || null,
          note.reference || null,
          note.freight_charges || 0,
          note.shipment_date || null,
          note.delivery_date || null,
          note.delivery_time || null,
          note.notes || null,
          note.internal_notes || null,
          note.subtotal || 0,
          note.tax_amount || 0,
          note.total_amount || 0,
          note.status || "draft",
        ]
      );

      const createdNote = noteResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        await this.insertLine(
          client,
          companyId,
          createdNote.id,
          line,
          lineNo
        );
        lineNo += 10000;
      }

      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdNote.id,
          payload.billing_address,
          companyId
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdNote.id,
          payload.shipping_address,
          companyId
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
    client: PoolClient,
    companyId: string,
    id: string,
    rawPayload: unknown
  ): Promise<DebitNoteLine[]> {
    const payload = DebitNotePayloadSchema.parse(
      rawPayload
    ) as DebitNotePayload;
    this.validatePayload(payload);

    const note = payload.debitNote;

    const existingResult = await client.query(
      `SELECT status, is_posted FROM debit_notes WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [id, companyId]
    );
    if (!existingResult.rows.length) throw new Error("Debit note not found");
    if (existingResult.rows[0].is_posted) {
      throw new Error("Posted debit notes cannot be modified");
    }

    await client.query(
      `
      UPDATE debit_notes
      SET
        supplier_id = $1, supplier_no = $2, warehouse_id = $3, currency_id = $4,
        purchaser = $5, consignment_no = $6, supp_order_no = $7, link_to_so_no = $8,
        anonymous_supplier = $9, order_date = $10, req_receipt_date = $11, receipt_date = $12,
        expected_date = $13, invoice_date = $14, due_date = $15, payable_bank = $16,
        payable_bank_id = $17, payment_terms = $18, payment_terms_id = $19, payment_method = $20,
        payment_method_id = $21, previous_code = $22, contact = $23, book_in_phone = $24,
        book_in_contact = $25, book_in_email = $26, shipment_method_id = $27, shipment_method = $28,
        shipping_agent = $29, shipment_ref_no = $30, warehouse_booking_ref_no = $31,
        supplier_booking_ref_no = $32, shipment_po_not_req = $33, reason = $34, linked_po = $35,
        exchange_rate = $36, document_date = $37, reference = $38, freight_charges = $39,
        shipment_date = $40, delivery_date = $41, delivery_time = $42, notes = $43,
        internal_notes = $44, subtotal = $45, tax_amount = $46, total_amount = $47, status = $48,
        updated_at = now()
      WHERE id = $49 AND company_id = $50
      `,
      [
        note.supplier_id,
        note.supplier_no || null,
        note.warehouse_id || null,
        note.currency_id || null,
        note.purchaser || null,
        note.consignment_no || null,
        note.supp_order_no || null,
        note.link_to_so_no || null,
        note.anonymous_supplier || false,
        note.order_date || null,
        note.req_receipt_date || null,
        note.receipt_date || null,
        note.expected_date || null,
        note.invoice_date || null,
        note.due_date || null,
        note.payable_bank || null,
        note.payable_bank_id || null,
        note.payment_terms || null,
        note.payment_terms_id || null,
        note.payment_method || null,
        note.payment_method_id || null,
        note.previous_code || null,
        note.contact || null,
        note.book_in_phone || null,
        note.book_in_contact || null,
        note.book_in_email || null,
        note.shipment_method_id || null,
        note.shipment_method || null,
        note.shipping_agent || null,
        note.shipment_ref_no || null,
        note.warehouse_booking_ref_no || null,
        note.supplier_booking_ref_no || null,
        note.shipment_po_not_req || false,
        note.reason || null,
        note.linked_po || null,
        note.exchange_rate || 1.0,
        note.document_date || null,
        note.reference || null,
        note.freight_charges || 0,
        note.shipment_date || null,
        note.delivery_date || null,
        note.delivery_time || null,
        note.notes || null,
        note.internal_notes || null,
        note.subtotal || 0,
        note.tax_amount || 0,
        note.total_amount || 0,
        note.status || "draft",
        id,
        companyId,
      ]
    );

    // Delete existing unreferenced lines
    const existingLinesResult = await client.query(
      `SELECT id FROM debit_note_lines WHERE debit_note_id = $1 AND is_deleted = false`,
      [id]
    );
    const existingLineIds = existingLinesResult.rows.map((x) => x.id);
    const incomingLineIds = payload.lines.map((x) => x.id).filter(Boolean);

    for (const existingId of existingLineIds) {
      if (!incomingLineIds.includes(existingId)) {
        await client.query(
          `UPDATE debit_note_lines SET is_deleted = true, updated_at = now() WHERE id = $1`,
          [existingId]
        );
      }
    }

    let lineNo = 10000;
    const updatedLines: DebitNoteLine[] = [];

    for (const line of payload.lines) {
      if (line.id) {
        const updateLineRes = await client.query(
          `
          UPDATE debit_note_lines
          SET
            line_type = $1, item_id = $2, gl_account_id = $3, description = $4,
            warehouse_id = $5, warehouse_location_id = $6, uom_id = $7, quantity = $8,
            unit_cost = $9, discount_type = $10, discount_value = $11, discount_amount = $12,
            vat_percent = $13, vat_amount = $14, net_amount = $15, gross_amount = $16,
            line_no = $17, updated_at = now()
          WHERE id = $18
          RETURNING *
          `,
          [
            line.line_type,
            line.item_id || null,
            line.gl_account_id || null,
            line.description || null,
            line.warehouse_id || null,
            line.warehouse_location_id || null,
            line.uom_id || null,
            line.quantity || 0,
            line.unit_cost || 0,
            line.discount_type || "PERCENT",
            line.discount_value || 0,
            line.discount_amount || 0,
            line.vat_percent || 0,
            line.vat_amount || 0,
            line.net_amount || 0,
            line.gross_amount || 0,
            lineNo,
            line.id,
          ]
        );
        updatedLines.push(updateLineRes.rows[0]);
      } else {
        const insertedLine = await this.insertLine(
          client,
          companyId,
          id,
          line,
          lineNo
        );
        updatedLines.push(insertedLine);
      }
      lineNo += 10000;
    }

    // Re-insert addresses
    await client.query(
      `DELETE FROM debit_note_addresses WHERE debit_note_id = $1`,
      [id]
    );

    if (payload.billing_address) {
      await this.insertAddress(
        client,
        id,
        payload.billing_address,
        companyId
      );
    }
    if (payload.shipping_address) {
      await this.insertAddress(
        client,
        id,
        payload.shipping_address,
        companyId
      );
    }

    return updatedLines;
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT is_posted FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (!existing.rows.length) throw new Error("Debit note not found");
    if (existing.rows[0].is_posted) {
      throw new Error("Cannot delete a posted debit note.");
    }

    await pool.query(
      `DELETE FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
  }

  private static async insertLine(
    client: PoolClient,
    companyId: string,
    debitNoteId: string,
    line: DebitNoteLine,
    lineNo: number
  ): Promise<DebitNoteLine> {
    const res = await client.query(
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
      RETURNING *
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
        line.discount_type || "PERCENT",
        line.discount_value || 0,
        line.discount_amount || 0,
        line.vat_percent || 0,
        line.vat_amount || 0,
        line.net_amount || 0,
        line.gross_amount || 0,
      ]
    );
    return res.rows[0];
  }

  private static async insertAddress(
    client: PoolClient,
    debitNoteId: string,
    address: DebitNoteAddress,
    companyId: string
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
      ]
    );
  }

  private static validatePayload(payload: DebitNotePayload): void {
    const note = payload.debitNote;
    if (!note.supplier_id) throw new Error("Supplier parameter is required");
    if (!payload.lines.length)
      throw new Error("Debit note requires at least one line item");
  }
}

/* import { PoolClient } from "pg";
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
} */
