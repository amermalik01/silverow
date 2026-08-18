// lib/services/debit-notes/debit-note.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import {
  DebitNote,
  DebitNoteAddress,
  DebitNoteLine,
  DebitNotePayload,
} from "@/types/debit-note";
import { DebitNotePayloadSchema } from "@/lib/validations/debit-note.schema";
import { StockDeAllocationRecord } from "@/app/components/shared/modals/StockDeAllocationModal";

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

  // Add this static method inside class DebitNoteService in lib/services/debit-notes/debit-note.service.ts

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<DebitNote>> {
    const {
      page = 1,
      pageSize = 50,
      filters = {},
      sortBy,
      sortOrder = "DESC",
    } = params;
    const offset = (page - 1) * pageSize;

    // const SORT_FIELDS: Record<string, string> = {
    //   debitNoteCode: "dn.debit_note_no",
    //   supplierCreditNoteDate: "dn.document_date",
    //   supplierCreditNoteNo: "dn.supplier_cn_no",
    //   prev_code: "dn.prev_code",
    //   current_stage: "cos.name",
    //   supplierNo: "dn.supplier_no",
    //   supplierName: "p.name",
    //   supplierCity: "dna.city",
    //   purchaser: "dn.purchaser",
    //   posting_grp: "dn.posting_grp",
    //   segment: "dn.segment",
    //   currency_code: "c.code",
    //   Amount: "dn.net_amount",
    //   tax_amount: "dn.tax_amount",
    //   "Amount (incl VAT)": "dn.total_amount",
    //   receipt_date: "dn.receipt_date",
    //   dispatchDate: "dn.dispatch_date",
    //   deliveryDate: "dn.delivery_date",
    //   shipping_agent_code: "dn.shipping_agent_code",
    //   shipment_method: "sm.name",
    // };

    const SORT_FIELDS: Record<string, string> = {
      debitNoteCode: "dn.debit_note_no",
      document_date: "dn.document_date",
      supplierCreditNoteDate: "dn.document_date",
      supp_order_no: "dn.supp_order_no",
      previous_code: "dn.previous_code",
      current_stage: "cos.name",
      supplierNo: "dn.supplier_no",
      supplierName: "p.name",
      supplierCity: "dna.city",
      purchaser: "dn.purchaser",
      currency_code: "c.code",
      Amount: "dn.subtotal",
      tax_amount: "dn.tax_amount",
      "Amount (incl VAT)": "dn.total_amount",
      receipt_date: "dn.receipt_date",
      deliveryDate: "dn.delivery_date",
      shipment_method: "sm.name",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "dn.debit_note_no";
    const orderDirection = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = [
      "dn.company_id = $1",
      "dn.status::text != 'completed'",
    ];

    // Dynamic Filters
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "currency_code" || colKey === "currency") {
          queryValues.push(String(filter.value));
          whereClauses.push(`c.code = $${queryValues.length}`);
        } else if (colKey === "current_stage") {
          queryValues.push(String(filter.value));
          whereClauses.push(`cos.name = $${queryValues.length}`);
        } else if (colKey === "status") {
          queryValues.push(String(filter.value));
          whereClauses.push(`dn.status::text = $${queryValues.length}`);
        } else if (colKey === "debitNoteCode" || colKey === "debit_note_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.debit_note_no ILIKE $${queryValues.length}`);
        } else if (colKey === "supplierCreditNoteNo") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.supplier_cn_no ILIKE $${queryValues.length}`);
        } else if (colKey === "supplierName") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`p.name ILIKE $${queryValues.length}`);
        }
      }

      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);
        const idx = queryValues.length;
        if (colKey === "supplierCreditNoteDate" || colKey === "document_date")
          whereClauses.push(`dn.document_date >= $${idx}::date`);
        if (colKey === "Amount" || colKey === "net_amount")
          whereClauses.push(`dn.net_amount >= $${idx}::numeric`);
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);
        const idx = queryValues.length;
        if (colKey === "supplierCreditNoteDate" || colKey === "document_date")
          whereClauses.push(`dn.document_date <= $${idx}::date`);
        if (colKey === "Amount" || colKey === "net_amount")
          whereClauses.push(`dn.net_amount <= $${idx}::numeric`);
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Base Join SQL
    const joinSql = `
      FROM debit_notes dn
      LEFT JOIN parties p ON p.id = dn.supplier_id
      LEFT JOIN currencies c ON c.id = dn.currency_id
      LEFT JOIN shipment_method sm ON sm.id = dn.shipment_method_id
      LEFT JOIN common_order_stages cos 
          ON cos.company_id = dn.company_id 
          AND cos.stage_type = 'debit_note' 
          AND cos.name ILIKE dn.status::text
      LEFT JOIN debit_note_addresses dna 
          ON dna.debit_note_id = dn.id 
          AND dna.address_type = 'primary'
      LEFT JOIN debit_note_addresses ship_a 
          ON ship_a.debit_note_id = dn.id 
          AND ship_a.address_type = 'shipping'
    `;

    // Count Query
    const countQuery = `SELECT COUNT(DISTINCT dn.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Data Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (dn.id, ${orderByColumn})
        dn.*,
        dn.debit_note_no AS "debitNoteCode",
        dn.supp_order_no AS "supplierCreditNoteNo",
        dn.document_date AS "supplierCreditNoteDate",
        dn.supplier_no AS "supplierNo",
        dn.subtotal AS "Amount",
        dn.total_amount AS "Amount (incl VAT)",
        p.name AS "supplierName",
        c.code AS currency_code,
        cos.name AS current_stage,
        sm.name AS shipment_method,
        
        -- Primary / Supplier Address
        dna.address_1 AS "supplierAddress",
        dna.address_2 AS "supplierAddress2",
        dna.city AS "supplierCity",
        dna.county AS "supplierCounty",
        dna.postcode AS "supplierPostCode",
        dna.country AS country,
        dna.phone AS "supplierContactTelephone",
        dna.email AS "supplierContactEmail",

        -- Shipping Address
        ship_a.address_1 AS "shipToSupplierLocAddress",
        ship_a.address_2 AS "shipToSupplierLocAaddress2",
        ship_a.city AS "shipToSupplierLocCity",
        ship_a.county AS "shipToSupplierLocCounty",
        ship_a.postcode AS "shipToSupplierLocPostCode"

      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}, dn.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }

  static async get(companyId: string, id: string) {
    const orderResult = await pool.query(
      `
      SELECT dn.*, 
        p.name AS supplier_name,
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method
      FROM debit_notes dn
      LEFT JOIN parties p ON p.id = dn.supplier_id
      LEFT JOIN payment_terms pt ON pt.id = dn.payment_terms_id
      LEFT JOIN payment_method pm ON pm.id = dn.payment_method_id
      LEFT JOIN shipment_method sm ON sm.id = dn.shipment_method_id
      WHERE dn.id = $1 AND dn.company_id = $2
      `,
      [id, companyId],
    );

    if (!orderResult.rows.length) return null;

    // Fetch PO Lines with standard UI components metadata
    const linesResult = await pool.query(
      `
      SELECT 
        dnl.*,
        dnl.quantity AS remaining_quantity,
        
        i.item_code,
        i.name AS item_name,      

        gl.code AS account_code,
        gl.name AS account_name,
        w.code AS warehouse_code,
        w.name AS warehouse_name,

        dnl.warehouse_location_id AS location_id,
        wl.code AS location_code,
        wl.title AS location_name,

        u.name AS uom_name

      FROM debit_note_lines dnl
      LEFT JOIN items i ON dnl.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON dnl.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON dnl.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN warehouse_locations wl ON dnl.warehouse_id = wl.warehouse_id AND dnl.warehouse_location_id = wl.id AND w.company_id = $2
      LEFT JOIN uoms u ON dnl.uom_id = u.id AND u.company_id = $2

      WHERE dnl.debit_note_id = $1 AND dnl.is_deleted = false
      ORDER BY dnl.line_no
      `,
      [id, companyId],
    );

    // 🌟 FIX: Join with debit_note_lines to look up by PO ID and select correct columns
    const allocationsResult = await pool.query(
      `
      SELECT
          ia.id,
          ia.debit_note_line_id,
          ia.purchase_order_line_id,
          ia.purchase_invoice_line_id,
          ia.item_id,
          ia.warehouse_id,
          ia.warehouse_location_id AS location_id,
          wl.title AS location_name,
          ia.allocated_quantity AS quantity,
          ia.batch_no,
          ia.bin_code,
          TO_CHAR(ia.expiry_date,'YYYY-MM-DD') AS expiry_date,
          TO_CHAR(ia.created_at,'YYYY-MM-DD') AS date_received
      FROM inventory_allocations ia
      LEFT JOIN warehouse_locations wl ON wl.id = ia.warehouse_location_id
      INNER JOIN debit_note_lines dnl
        ON (ia.debit_note_line_id = dnl.id OR 
        (ia.purchase_order_line_id IS NOT NULL AND ia.purchase_order_line_id = dnl.purchase_order_line_id) OR 
        (ia.purchase_invoice_line_id IS NOT NULL AND ia.purchase_invoice_line_id = dnl.purchase_invoice_line_id) 
        )
      WHERE dnl.debit_note_id = $1 AND ia.company_id = $2 AND ia.status = 'ACTIVE'
      `,
      [id, companyId],
    );

    // Map the accurate database properties to your frontend modal structures safely
    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsResult.rows
        .filter(
          (alloc) =>
            alloc.debit_note_line_id === line.id ||
            (line.purchase_order_line_id &&
              alloc.purchase_order_line_id === line.purchase_order_line_id) ||
            (line.purchase_invoice_line_id &&
              alloc.purchase_invoice_line_id === line.purchase_invoice_line_id),
        )
        .map((alloc) => ({
          id: alloc.id,
          date_received: alloc.date_received || "",
          prod_date: "",
          expiry_date: alloc.expiry_date || "",
          batch_no: alloc.batch_no || "",
          bin_code: alloc.bin_code || "",
          location_id: alloc.location_id || "",
          location_name: alloc.location_name || "",
          quantity: Number(alloc.quantity) || 0,
        }));

      return {
        ...line,
        allocations: lineAllocations,
        initialAllocations: lineAllocations,
        is_allocated:
          lineAllocations.length > 0 &&
          lineAllocations.reduce((sum, a) => sum + a.quantity, 0) ===
            Number(line.quantity),
      };
    });

    const addressResult = await pool.query(
      `SELECT * FROM debit_note_addresses WHERE debit_note_id = $1`,
      [id],
    );

    return {
      note: orderResult.rows[0],
      lines: linesWithAllocations,
      primary_address:
        addressResult.rows.find((x) => x.address_type === "primary") || null,
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
        [companyId, "purchase_return"],
      );
      const debitNoteNo = seqResult.rows[0].code;

      // const supplierResult = await client.query(
      //   `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
      //   [note.supplier_id, companyId],
      // );
      // if (!supplierResult.rows.length) throw new Error("Supplier not found");

      const noteResult = await client.query(
        `
        INSERT INTO debit_notes (
          company_id, debit_note_no, supplier_id, supplier_no, warehouse_id, currency_id, 
          purchaser, consignment_no, supp_order_no, link_to_so_no, anonymous_supplier,
          order_date, req_receipt_date, receipt_date, expected_date, invoice_date, due_date,
          payable_bank, payable_bank_id, payment_terms, payment_terms_id, payment_method, payment_method_id,
          previous_code, contact, book_in_phone, book_in_contact, book_in_email, shipment_method_id,
          shipment_method, shipping_agent, shipment_ref_no, warehouse_booking_ref_no, supplier_booking_ref_no,
          reason, linked_po, exchange_rate, document_date, reference,
          freight_charges, shipment_date, delivery_date, delivery_time, notes, internal_notes,
          subtotal, tax_amount, total_amount, status, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, now()
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
          // note.shipment_po_not_req || false,
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
        ],
      );

      const createdNote = noteResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, createdNote.id, line, lineNo);
        lineNo += 10000;
      }

      if (payload.primary_address) {
        await this.insertAddress(
          client,
          createdNote.id,
          payload.primary_address,
          companyId,
        );
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
    client: PoolClient,
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<DebitNoteLine[]> {
    const payload = DebitNotePayloadSchema.parse(
      rawPayload,
    ) as DebitNotePayload;

    this.validatePayload(payload);

    const note = payload.debitNote;

    const existingResult = await client.query(
      `SELECT status, is_posted FROM debit_notes WHERE id = $1 AND company_id = $2 FOR UPDATE`,
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
        supplier_id = $1, supplier_no = $2, warehouse_id = $3, currency_id = $4,
        purchaser = $5, consignment_no = $6, supp_order_no = $7, link_to_so_no = $8,
        anonymous_supplier = $9, order_date = $10, req_receipt_date = $11, receipt_date = $12,
        expected_date = $13, invoice_date = $14, due_date = $15, payable_bank = $16,
        payable_bank_id = $17, payment_terms = $18, payment_terms_id = $19, payment_method = $20,
        payment_method_id = $21, previous_code = $22, contact = $23, book_in_phone = $24,
        book_in_contact = $25, book_in_email = $26, shipment_method_id = $27, shipment_method = $28,
        shipping_agent = $29, shipment_ref_no = $30, warehouse_booking_ref_no = $31,
        supplier_booking_ref_no = $32,  reason = $33, linked_po = $34,
        exchange_rate = $35, document_date = $36, reference = $37, freight_charges = $38,
        shipment_date = $39, delivery_date = $40, delivery_time = $41, notes = $42,
        internal_notes = $43, subtotal = $44, tax_amount = $45, total_amount = $46, status = $47,
        updated_at = now()
      WHERE id = $48 AND company_id = $49
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
        // note.shipment_po_not_req || false,
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
      ],
    );

    // Delete existing unreferenced lines
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
    const updatedLines: DebitNoteLine[] = [];

    for (const line of payload.lines) {
      if (line.id) {
        const updateLineRes = await client.query(
          `
          UPDATE debit_note_lines
          SET
            purchase_order_line_id = $1, purchase_invoice_line_id=$2, line_type = $3, item_id = $4, gl_account_id = $5, description = $6,
            warehouse_id = $7, warehouse_location_id = $8, uom_id = $9, quantity = $10,
            unit_cost = $11, discount_type = $12, discount_value = $13, discount_amount = $14,
            vat_percent = $15, vat_amount = $16, net_amount = $17, gross_amount = $18,
            line_no = $19, updated_at = now()
          WHERE id = $20
          RETURNING *
          `,
          [
            line.purchase_order_line_id || null,
            line.purchase_invoice_line_id || null,
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
          ],
        );
        updatedLines.push(updateLineRes.rows[0]);
      } else {
        const insertedLine = await this.insertLine(
          client,
          companyId,
          id,
          line,
          lineNo,
        );
        updatedLines.push(insertedLine);
      }
      lineNo += 10000;
    }

    // Re-insert addresses
    await client.query(
      `DELETE FROM debit_note_addresses WHERE debit_note_id = $1`,
      [id],
    );

    if (payload.primary_address) {
      await this.insertAddress(client, id, payload.primary_address, companyId);
    }

    if (payload.billing_address) {
      await this.insertAddress(client, id, payload.billing_address, companyId);
    }
    if (payload.shipping_address) {
      await this.insertAddress(client, id, payload.shipping_address, companyId);
    }

    return updatedLines;
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT is_posted FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!existing.rows.length) throw new Error("Debit note not found");
    if (existing.rows[0].is_posted) {
      throw new Error("Cannot delete a posted debit note.");
    }

    await pool.query(
      `DELETE FROM debit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
  }

  private static async insertLine(
    client: PoolClient,
    companyId: string,
    debitNoteId: string,
    line: DebitNoteLine,
    lineNo: number,
  ): Promise<DebitNoteLine> {
    const res = await client.query(
      `
      INSERT INTO debit_note_lines (
        company_id, debit_note_id, purchase_order_line_id, purchase_invoice_line_id, line_no, line_type,
        item_id, gl_account_id, description, warehouse_id, 
        warehouse_location_id, uom_id, quantity, unit_cost,
        discount_type, discount_value, discount_amount,
        vat_percent, vat_amount, net_amount, gross_amount,
        is_deleted, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        $13, $14, $15, $16, $17, $18, $19, $20, $21, false, now()
      )
      RETURNING *
      `,
      [
        companyId,
        debitNoteId,
        line.purchase_order_line_id || null,
        line.purchase_invoice_line_id || null,
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
      ],
    );
    return res.rows[0];
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
        address_1, address_2, city, state, postcode, country, 
        contact_person, contact_name, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        address.contact_person || null,
        address.contact_name || null,
        companyId,
      ],
    );
  }

  private static validatePayload(payload: DebitNotePayload): void {
    const note = payload.debitNote;
    if (!note.supplier_id) throw new Error("Supplier parameter is required");
    if (!payload.lines.length)
      throw new Error("Debit note requires at least one line item");
  }

  static async recalculateStatus(
    client: PoolClient,
    debitNoteId: string,
  ): Promise<void> {
    const result = await client.query(
      `
      SELECT quantity, returned_quantity, COALESCE(cancelled_quantity, 0) as cancelled_quantity
      FROM debit_note_lines
      WHERE debit_note_id = $1 AND is_deleted = false AND line_type = 'ITEM'
      `,
      [debitNoteId],
    );

    const lines = result.rows;
    if (!lines.length) return;

    let fullyReturned = true;
    let partiallyReturned = false;

    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const returned =
        Number(line.returned_quantity || 0) + Number(line.cancelled_quantity);

      if (returned > 0) partiallyReturned = true;
      if (returned < qty) fullyReturned = false;
    }

    const status = fullyReturned
      ? "dispatched"
      : partiallyReturned
        ? "partial_dispatched"
        : "open";

    await client.query(
      `UPDATE debit_notes SET status = $1, is_dispatched = $2, updated_at = NOW() WHERE id = $3`,
      [status, fullyReturned || partiallyReturned, debitNoteId],
    );
  }

  static async updateReturnedQuantity(
    client: PoolClient,
    debitNoteLineId: string,
    returnedQty: number,
  ): Promise<void> {
    await client.query(
      `
      UPDATE debit_note_lines
      SET
        returned_quantity =
          COALESCE(returned_quantity, 0) + $1,

        remaining_quantity =
          quantity - (
            COALESCE(returned_quantity, 0)
            + $1
            + COALESCE(cancelled_quantity, 0)
          ),

        updated_at = NOW()

      WHERE id = $2
      `,
      [returnedQty, debitNoteLineId],
    );
  }

  static async saveLineAllocations(
    client: PoolClient,
    companyId: string,
    debitNoteId: string,
    debitNoteLineId: string,
    itemId: string,
    warehouseId: string,
    initialAllocations: StockDeAllocationRecord[],
  ): Promise<void> {
    // 1. Lock check: If stock has already been dispatched/returned on this line, protect allocations from modification
    const lineCheck = await client.query(
      `
      SELECT COALESCE(returned_quantity, 0) AS returned_quantity
      FROM debit_note_lines
      WHERE id = $1 AND company_id = $2
      `,
      [debitNoteLineId, companyId],
    );

    const returnedQty = Number(lineCheck.rows[0]?.returned_quantity || 0);

    if (returnedQty > 0) {
      return;
    }

    // 2. Clear existing allocations for unreturned lines
    await client.query(
      `
      DELETE FROM inventory_allocations
      WHERE debit_note_line_id = $1 AND company_id = $2
      `,
      [debitNoteLineId, companyId],
    );

    if (!initialAllocations || !initialAllocations.length) return;

    // 3. Insert fresh allocation records
    for (const alloc of initialAllocations) {
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          inbound_entry_id,
          debit_note_line_id,
          item_id,
          warehouse_id,
          warehouse_location_id,
          batch_no,
          expiry_date,
          allocated_quantity,
          unit_cost,
          total_cost,
          allocation_method,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'FIFO', 'ACTIVE')
        `,
        [
          companyId,
          null,
          null,
          debitNoteLineId,
          itemId,
          warehouseId,
          alloc.location_id || null,
          alloc.batch_no || null,
          alloc.expiry_date === "" ? null : alloc.expiry_date || null,
          Number(alloc.return_quantity) || 0,
          0,
          0,
        ],
      );
    }
  }

  

  /**
   * 2. POST INVOICE (Financial Posting / G/L Ledger Generation)
   * Creates G/L Entries (Debit Supplier Payable, Credit Return/Purchase Account & VAT Account).
   */
  static async post(companyId: string, debitNoteId: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const dnResult = await client.query(
        `SELECT id, debit_note_no, supplier_id, subtotal, tax_amount, total_amount, is_posted, status 
         FROM debit_notes 
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [debitNoteId, companyId],
      );

      if (!dnResult.rows.length) throw new Error("Debit note not found.");
      const note = dnResult.rows[0];

      if (note.is_posted) throw new Error("Debit note is already posted.");

      // Generate GL Entry Header Sequence
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, 'gl_entry') AS code`,
        [companyId],
      );
      const glHeaderNo = seqResult.rows[0].code;

      // Create General Ledger Header Entry
      const glHeaderRes = await client.query(
        `INSERT INTO gl_entries (
           company_id, entry_no, document_type, document_no, posting_date, created_at
         ) VALUES ($1, $2, 'DEBIT_NOTE', $3, CURRENT_DATE, now())
         RETURNING id`,
        [companyId, glHeaderNo, note.debit_note_no],
      );
      const glHeaderId = glHeaderRes.rows[0].id;

      // 1. DEBIT: Payable Account (Reduce Liability to Supplier for Total Amount)
      const supplierRes = await client.query(
        `SELECT payable_gl_account_id FROM parties WHERE id = $1 AND company_id = $2`,
        [note.supplier_id, companyId],
      );
      const supplierPayableGlId = supplierRes.rows[0]?.payable_gl_account_id;

      if (supplierPayableGlId) {
        await client.query(
          `INSERT INTO gl_entry_lines (
             company_id, gl_entry_id, gl_account_id, debit, credit, description
           ) VALUES ($1, $2, $3, $4, 0, $5)`,
          [
            companyId,
            glHeaderId,
            supplierPayableGlId,
            note.total_amount,
            `Debit Note ${note.debit_note_no} - Supplier Refund`,
          ],
        );
      }

      // 2. CREDIT: Purchase Returns / Expense GL Account for Subtotal
      const linesResult = await client.query(
        `SELECT gl_account_id, net_amount, description 
         FROM debit_note_lines 
         WHERE debit_note_id = $1 AND is_deleted = false`,
        [debitNoteId],
      );

      for (const line of linesResult.rows) {
        if (line.gl_account_id && Number(line.net_amount) > 0) {
          await client.query(
            `INSERT INTO gl_entry_lines (
               company_id, gl_entry_id, gl_account_id, debit, credit, description
             ) VALUES ($1, $2, $3, 0, $4, $5)`,
            [
              companyId,
              glHeaderId,
              line.gl_account_id,
              line.net_amount,
              line.description || `Debit Note Line`,
            ],
          );
        }
      }

      // Update Debit Note Header Status
      await client.query(
        `UPDATE debit_notes 
         SET is_posted = true, posted_at = now(), status = 'posted', updated_at = now()
         WHERE id = $1 AND company_id = $2`,
        [debitNoteId, companyId],
      );

      await client.query("COMMIT");
      return {
        success: true,
        message: "Debit note posted to G/L successfully.",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 1. DISPATCH STOCK (Post Physical Return / Stock De-allocation)
   * Decrements physical stock from inventory_allocations and logs inventory transaction entries.
   */
  static async dispatchStock(companyId: string, debitNoteId: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check Debit Note status
      const dnResult = await client.query(
        `SELECT id, debit_note_no, status, is_dispatched, is_posted 
         FROM debit_notes 
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [debitNoteId, companyId],
      );

      if (!dnResult.rows.length) throw new Error("Debit note not found.");
      const note = dnResult.rows[0];

      if (note.is_dispatched)
        throw new Error(
          "Stock has already been dispatched for this debit note.",
        );

      // Fetch Debit Note lines
      const linesResult = await client.query(
        `SELECT id, item_id, warehouse_id, warehouse_location_id, quantity, line_no, purchase_order_line_id, purchase_invoice_line_id
         FROM debit_note_lines 
         WHERE debit_note_id = $1 AND line_type = 'ITEM' AND is_deleted = false`,
        [debitNoteId],
      );

      for (const line of linesResult.rows) {
        // Fetch active allocations linked to this debit note line or parent purchase invoice line
        const allocResult = await client.query(
          `SELECT id, allocated_quantity, batch_no, bin_code, warehouse_location_id, expiry_date, unit_cost
           FROM inventory_allocations
           WHERE company_id = $1 AND (debit_note_line_id = $2 OR purchase_order_line_id = $3 OR purchase_invoice_line_id = $4) AND status = 'ACTIVE'`,
          [
            companyId,
            line.id,
            line.purchase_order_line_id,
            line.purchase_invoice_line_id,
          ],
        );

        let remainingToReturn = Number(line.quantity);

        for (const alloc of allocResult.rows) {
          if (remainingToReturn <= 0) break;

          const allocQty = Number(alloc.allocated_quantity);
          const deductQty = Math.min(allocQty, remainingToReturn);

          if (deductQty === allocQty) {
            // Fully consume allocation
            await client.query(
              `UPDATE inventory_allocations 
               SET status = 'RETURNED', updated_at = now() 
               WHERE id = $1`,
              [alloc.id],
            );
          } else {
            // Partially reduce allocation
            await client.query(
              `UPDATE inventory_allocations 
               SET allocated_quantity = allocated_quantity - $1, updated_at = now() 
               WHERE id = $2`,
              [deductQty, alloc.id],
            );
          }

          // Create Outward Inventory Movement Ledger Entry
          await client.query(
            `INSERT INTO inventory_transactions (
               company_id, transaction_type, reference_no, item_id, warehouse_id, 
               warehouse_location_id, batch_no, bin_code, quantity, unit_cost, created_at
             ) VALUES ($1, 'PURCHASE_RETURN', $2, $3, $4, $5, $6, $7, $8, $9, now())`,
            [
              companyId,
              note.debit_note_no,
              line.item_id,
              line.warehouse_id,
              alloc.warehouse_location_id || line.warehouse_location_id,
              alloc.batch_no || null,
              alloc.bin_code || null,
              -deductQty, // Negative for outward return
              alloc.unit_cost || 0,
            ],
          );

          remainingToReturn -= deductQty;
        }
      }

      // Update Debit Note Header
      await client.query(
        `UPDATE debit_notes 
         SET is_dispatched = true, dispatched_at = now(), status = 'dispatched', updated_at = now()
         WHERE id = $1 AND company_id = $2`,
        [debitNoteId, companyId],
      );

      await client.query("COMMIT");
      return { success: true, message: "Stock dispatched successfully." };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

/* static async get(companyId: string, id: string) {
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
  } */
