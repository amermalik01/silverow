// lib/services/posted-debit-notes/debit-note.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import { DebitNote } from "@/types/debit-note";

export class PostedDebitNoteService {
  /**
   * Retrieves an unpaginated list of all posted debit notes for a company.
   */
  static async list(companyId: string): Promise<DebitNote[]> {
    const result = await pool.query(
      `
      SELECT 
        dn.*, 
        p.name AS supplier_name
      FROM debit_notes dn
      LEFT JOIN parties p ON p.id = dn.supplier_id
      WHERE dn.company_id = $1 
        AND dn.status::text = 'completed'
      ORDER BY dn.created_at DESC
      `,
      [companyId],
    );
    return result.rows;
  }

  /**
   * Retrieves a paginated, sorted, and filtered list of posted debit notes.
   */

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<DebitNote>> {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy,
      sortOrder = "DESC",
    } = params;
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      supplierCreditNoteDate: "dn.invoice_date",
      invoice_code: "dn.debit_note_no",
      debitNoteCode: "dn.debit_note_no",
      supplierCreditNoteNo: "dn.supplier_cn_no",
      prev_code: "dn.prev_code",
      current_stage: "cos.name",
      supplierNo: "dn.supplier_no",
      supplierName: "p.name",
      supplierCity: "dna.city",
      purchaser: "dn.purchaser",
      posting_grp: "dn.posting_grp",
      segment: "dn.segment",
      currency_code: "c.code",
      Amount: "dn.net_amount",
      tax_amount: "dn.tax_amount",
      "Amount (incl VAT)": "dn.total_amount",
      receipt_date: "dn.receipt_date",
      dispatchDate: "dn.dispatch_date",
      deliveryDate: "dn.delivery_date",
      shipping_agent_code: "dn.shipping_agent_code",
      shipment_method: "sm.name",
      documentDNCount: "dn.document_dn_count",
      documentPDNCount: "dn.document_pdn_count",
      emailCount: "dn.email_count",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "dn.debit_note_no";
    const orderDirection = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const queryValues: (string | number)[] = [companyId];

    // Explicitly filter for completed/posted debit notes
    const whereClauses = [
      "dn.company_id = $1",
      // "dn.status::text = 'completed'",
      "dn.status::text IN ('completed', 'posted')",
    ];

    // Dynamic Filters Processing
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
        } else if (colKey === "invoice_code" || colKey === "debit_note_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.debit_note_no ILIKE $${queryValues.length}`);
        } else if (colKey === "supplierCreditNoteNo") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.supplier_cn_no ILIKE $${queryValues.length}`);
        } else if (colKey === "supplierName") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`p.name ILIKE $${queryValues.length}`);
        } else if (colKey === "supplierNo") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.supplier_no ILIKE $${queryValues.length}`);
        } else if (colKey === "purchaser") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`dn.purchaser ILIKE $${queryValues.length}`);
        }
      }

      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);
        const idx = queryValues.length;
        if (colKey === "supplierCreditNoteDate" || colKey === "invoice_date")
          whereClauses.push(`dn.invoice_date >= $${idx}::date`);
        if (colKey === "Amount" || colKey === "net_amount")
          whereClauses.push(`dn.net_amount >= $${idx}::numeric`);
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);
        const idx = queryValues.length;
        if (colKey === "supplierCreditNoteDate" || colKey === "invoice_date")
          whereClauses.push(`dn.invoice_date <= $${idx}::date`);
        if (colKey === "Amount" || colKey === "net_amount")
          whereClauses.push(`dn.net_amount <= $${idx}::numeric`);
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Base Join SQL Construction
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

    // Execute Count Query
    const countQuery = `SELECT COUNT(DISTINCT dn.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Execute Paginated Data Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (dn.id, ${orderByColumn})
        dn.*,
        dn.debit_note_no AS "invoice_code",
        dn.debit_note_no AS "debitNoteCode",
        dn.supp_order_no AS "supplierCreditNoteNo",
        dn.invoice_date AS "supplierCreditNoteDate",
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

  /**
   * Retrieves a single Posted Debit Note with lines, allocations, and addresses.
   */
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
      WHERE dn.id = $1 AND dn.company_id = $2 AND dn.status::text = 'completed'
      `,
      [id, companyId],
    );

    if (!orderResult.rows.length) return null;

    // Fetch lines metadata
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

    // Fetch batch/serial inventory allocations
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

    // Map allocations into corresponding line items
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
}
