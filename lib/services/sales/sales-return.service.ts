// lib/services/sales/sales-return.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnDeAllocationRecord,
  SalesReturnLine,
  SalesReturnPayload,
} from "@/types/sales-return";

export class SalesReturnService {
  /**
   * List paginated Sales Returns (Credit Notes)
   */
  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<SalesReturn>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const filters = params.filters || {};
    const search =
      typeof params.search === "string" ? params.search.trim() : "";

    const sortBy = params.sortBy;
    const sortOrder =
      params.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const offset = (page - 1) * pageSize;

    // Mapping table column keys to DB table columns
    const SORT_FIELDS: Record<string, string> = {
      posting_date: "cn.posting_date",
      credit_note_date: "cn.credit_note_date",
      credit_note_no: "cn.credit_note_no",
      sales_invoice: "cn.sales_invoice",
      cust_return_no: "cn.cust_return_no",
      cust_order_no: "cn.cust_order_no",
      current_stage: "cos.name",
      sell_to_cust_no: "cn.customer_no",
      sell_to_cust_name: "cn.customer_name",
      sell_to_city: "cn.billing_address->>'city'",
      sale_person: "cn.salesperson",
      currency_code: "c.code",
      net_amount: "cn.subtotal",
      vat_amount: "cn.vat_amount",
      grand_total: "cn.total_amount",
      due_date: "cn.due_date",
      requested_delivery_date: "cn.requested_delivery_date",
      dispatch_date: "cn.dispatch_date",
      delivery_date: "cn.delivery_date",
      shipment_method_code: "sm.name",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "cn.credit_note_no";
    const orderDirection = sortOrder === "ASC" ? "ASC" : "DESC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = [
      "cn.company_id = $1",
      "cn.status::text != 'completed'",
      "cn.is_posted = false",
    ];

    if (search) {
      queryValues.push(`%${search}%`);
      const searchParam = `$${queryValues.length}`;
      whereClauses.push(
        ` ( cn.credit_note_no ILIKE ${searchParam} OR 
            cn.sales_invoice ILIKE ${searchParam} OR 
            cn.customer_no ILIKE ${searchParam} OR 
            cn.customer_name ILIKE ${searchParam} OR 
            cos.name ILIKE ${searchParam} OR 
            c.code ILIKE ${searchParam} OR 
            sm.name ILIKE ${searchParam} OR 
            cn.salesperson ILIKE ${searchParam} ) `,
      );
    }

    // Dynamic Filter Parsing
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "currency_code") {
          queryValues.push(String(filter.value));
          whereClauses.push(`c.code = $${queryValues.length}`);
        } else if (colKey === "current_stage") {
          queryValues.push(String(filter.value));
          whereClauses.push(`cos.name = $${queryValues.length}`);
        } else if (colKey === "status") {
          queryValues.push(String(filter.value));
          whereClauses.push(`cn.status::text = $${queryValues.length}`);
        } else if (colKey === "credit_note_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`cn.credit_note_no ILIKE $${queryValues.length}`);
        } else if (colKey === "sales_invoice") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`cn.sales_invoice ILIKE $${queryValues.length}`);
        } else if (colKey === "customer_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`cn.customer_name ILIKE $${queryValues.length}`);
        } else if (colKey === "cust_return_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`cn.cust_return_no ILIKE $${queryValues.length}`);
        } else if (colKey === "sale_person") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`cn.salesperson ILIKE $${queryValues.length}`);
        }
      }

      // Date & Range Filters
      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);
        const idx = queryValues.length;
        if (colKey === "posting_date")
          whereClauses.push(`cn.posting_date >= $${idx}::date`);
        if (colKey === "credit_note_date")
          whereClauses.push(`cn.credit_note_date >= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`cn.subtotal >= $${idx}::numeric`);
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);
        const idx = queryValues.length;
        if (colKey === "posting_date")
          whereClauses.push(`cn.posting_date <= $${idx}::date`);
        if (colKey === "credit_note_date")
          whereClauses.push(`cn.credit_note_date <= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`cn.subtotal <= $${idx}::numeric`);
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Shared SQL Join Clause
    const joinSql = `
      FROM credit_notes cn
      
      LEFT JOIN currencies c ON c.id = cn.currency_id
      LEFT JOIN employees e ON (
        e.company_id = cn.company_id AND (
          e.id::text = cn.salesperson OR 
          e.display_name ILIKE cn.salesperson OR
          CONCAT(e.first_name, ' ', e.last_name) ILIKE cn.salesperson
        )
      )
      
      LEFT JOIN shipment_method sm ON sm.id = cn.shipment_method_id
      LEFT JOIN common_order_stages cos ON cos.id = cn.stage_id       
      LEFT JOIN credit_note_addresses cna 
          ON cna.credit_note_id = cn.id 
          AND cna.address_type = 'primary'
      LEFT JOIN credit_note_addresses ship_a 
          ON ship_a.credit_note_id = cn.id 
          AND ship_a.address_type = 'shipping'
    `;

    // Total Count Query
    const countQuery = `SELECT COUNT(DISTINCT cn.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Record Set Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (cn.id, ${orderByColumn})
        cn.id,
        cn.credit_note_no,
        cn.sales_invoice,
        cn.cust_return_no,
        cn.cust_order_no,
        cn.posting_date,
        cn.credit_note_date AS offer_date,
        cn.due_date,
        cn.requested_delivery_date,
        cn.dispatch_date,
        cn.delivery_date,
        cn.subtotal AS net_amount,
        cn.vat_amount AS vat_amount,
        cn.total_amount AS grand_total,
        (cn.finance_charges > 0) AS finance_charges_exists,
        (cn.insurance_charges > 0) AS insurance_charges_exists,
        cn.book_in_phone AS book_in_tel,
        cn.book_in_contact AS comm_book_in_contact,
        cn.book_in_email,
        cn.warehouse_ref_no AS warehouse_booking_ref,
        cn.cust_warehouse_ref_no AS customer_warehouse_ref,
        cn.converted_by AS converted_to_so_by_name,
        
        -- Joined Labels & Classifications
        cos.name AS current_stage,
        cn.customer_no,
        cn.customer_name,
        c.code AS currency_code,
        COALESCE(e.display_name, TRIM(CONCAT(e.first_name, ' ', e.last_name)), cn.salesperson) AS sale_person,
        sm.name AS shipment_method_code,

        -- Primary / Customer Address details
        cna.address_1 AS customer_address,
        cna.address_2 AS customer_address2,
        cna.city AS city,
        cna.county AS county,
        cna.postcode AS post_code,
        cna.country AS country,
        cna.phone AS phone,
        cna.email AS email,

        -- Shipping Address details
        ship_a.address_1 AS ship_to_address,
        ship_a.address_2 AS ship_to_address2,
        ship_a.city AS ship_to_city,
        ship_a.county AS ship_to_county,
        ship_a.postcode AS ship_to_post_code

      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}, cn.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }

  /**
   * Get a single Credit Note with lines and addresses
   */
  static async get(companyId: string, id: string) {
    const returnHeaderResult = await pool.query(
      `
      SELECT cn.*,
        cn.sales_invoice AS invoice_no,
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method
      FROM credit_notes cn
      LEFT JOIN payment_terms pt ON pt.id = cn.payment_terms_id
      LEFT JOIN payment_method pm ON pm.id = cn.payment_method_id
      LEFT JOIN shipment_method sm ON sm.id = cn.shipment_method_id
      WHERE cn.id = $1 AND cn.company_id = $2
      `,
      [id, companyId],
    );

    if (!returnHeaderResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT 
        cnl.*, 
        (cnl.quantity - COALESCE(cnl.returned_quantity, 0)) AS remaining_quantity,
        
        i.item_code,
        i.name AS item_name,        

        gl.code AS account_code,
        gl.name AS account_name,        

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        cnl.warehouse_location_id AS location_id,
        wl.code AS location_code,
        wl.title AS location_name,

        u.name AS uom_name,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ia.id,
                'source_allocation_id', ia.source_allocation_id,
                'location_id', ia.warehouse_location_id,
                'location_code', ia_wl.code,
                'location_name', ia_wl.title,
                'quantity', ia.allocated_quantity,
                'return_quantity', ia.allocated_quantity,
                'unit_cost', ia.unit_cost,
                'batch_no', ia.batch_no,
                'serial_no', ia.bin_code,
                'bin_code', ia.bin_code,
                'expiry_date', ia.expiry_date
              )
            )
            FROM inventory_allocations ia
            LEFT JOIN warehouse_locations ia_wl 
              ON ia_wl.id = ia.warehouse_location_id 
             AND ia_wl.company_id = $2
            WHERE ia.credit_note_line_id = cnl.id 
              AND ia.company_id = $2
              AND ia.status = 'ACTIVE'
          ),
          '[]'::json
        ) AS allocations

      FROM credit_note_lines cnl
      LEFT JOIN items i ON cnl.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON cnl.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON cnl.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN warehouse_locations wl ON cnl.warehouse_id = wl.warehouse_id AND cnl.warehouse_location_id = wl.id AND w.company_id = $2
      LEFT JOIN uoms u ON cnl.uom_id = u.id AND u.company_id = $2

      WHERE cnl.credit_note_id = $1 AND cnl.company_id = $2 AND COALESCE(cnl.is_deleted, false) = false
      ORDER BY cnl.line_no
      `,
      [id, companyId],
    );

    const addressResult = await pool.query(
      `SELECT
          id,
          address_type,
          name,
          attention,
          contact_name,
          contact_person,
          phone,
          email,
          address_1,
          address_2,
          city,
          state,
          county,
          postcode,
          country
        FROM credit_note_addresses
        WHERE credit_note_id = $1`,
      [id],
    );

    return {
      return: returnHeaderResult.rows[0],
      lines: linesResult.rows,
      primary_address:
        addressResult.rows.find((x) => x.address_type === "primary") || null,
      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
  }

  /**
   * Create a new Sales Return / Credit Note
   */
  static async create(
    companyId: string,
    rawPayload: unknown,
  ): Promise<SalesReturn> {
    const payload = rawPayload as SalesReturnPayload;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const returnDoc = payload.returnOrder;

      // Generate sequence number for credit note
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_return"],
      );
      const creditNoteNo = seqResult.rows[0].code;

      const customerResult = await client.query(
        `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
        [returnDoc.customer_id, companyId],
      );
      if (!customerResult.rows.length) throw new Error("Customer not found");

      const customerPostingGroupId =
        returnDoc.customer_posting_group_id ||
        returnDoc.sales_posting_group_id ||
        null;

      const vatBusinessPostingGroupId =
        returnDoc.vat_business_posting_group_id || null;

      const returnResult = await client.query(
        `
          INSERT INTO credit_notes (
            company_id,
            credit_note_no,

            customer_id,
            customer_no,
            customer_name,

            bill_to_customer_id,
            bill_to_customer_no,
            bill_to_customer_name,

            salesperson,
            cust_order_no,
            cust_return_no,
            consignment_no,
            link_to_po,
            sales_invoice_id,
            sales_invoice,

            currency_id,
            exchange_rate,

            credit_note_date,
            requested_delivery_date,
            dispatch_date,
            posting_date,
            due_date,

            reference,

            receivable_bank,
            receivable_bank_id,

            payment_terms_id,
            payment_method_id,

            contact,
            book_in_phone,
            book_in_contact,
            book_in_email,

            shipment_method_id,
            shipping_agent,
            shipment_ref_no,
            warehouse_ref_no,

            reason,

            notes,
            internal_notes,

            subtotal,
            vat_amount,
            total_amount,

            status,
            anonymous_customer,

            customer_posting_group_id,
            vat_business_posting_group_id,

            created_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
            $41, $42, $43, $44, $45, NOW()
          )
          RETURNING *;
        `,
        [
          companyId,
          creditNoteNo,

          returnDoc.customer_id,
          returnDoc.customer_no,
          returnDoc.customer_name,

          returnDoc.customer_id,
          returnDoc.customer_no,
          returnDoc.customer_name,

          returnDoc.salesperson,
          returnDoc.cust_order_no,
          returnDoc.reason || null, // mapped to cust_return_no if needed
          null, // consignment_no
          returnDoc.link_to_po,
          returnDoc.sales_invoice_id || null,
          returnDoc.sales_invoice || null,

          returnDoc.currency_id,
          returnDoc.exchange_rate || 1.0,

          returnDoc.credit_note_date || null,
          returnDoc.requested_delivery_date || null,
          returnDoc.dispatch_date || null,
          returnDoc.posting_date?.trim() ? returnDoc.posting_date : null,
          returnDoc.due_date || null,

          returnDoc.reference,

          returnDoc.receivable_bank,
          returnDoc.receivable_bank_id,

          returnDoc.payment_terms_id,
          returnDoc.payment_method_id,

          returnDoc.contact,
          returnDoc.book_in_phone,
          returnDoc.book_in_contact,
          returnDoc.book_in_email,

          returnDoc.shipment_method_id,
          returnDoc.shipping_agent,
          returnDoc.shipment_ref_no,
          returnDoc.warehouse_ref_no,

          returnDoc.reason,

          returnDoc.notes,
          returnDoc.internal_notes,

          returnDoc.subtotal || 0,
          returnDoc.vat_amount || 0,
          returnDoc.total_amount || 0,

          returnDoc.status || "draft",
          returnDoc.anonymous_customer || false,

          customerPostingGroupId,
          vatBusinessPostingGroupId,
        ],
      );

      const createdReturn = returnResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        const entriesWithUndefined = Object.entries(line).map(
          ([key, value]) => [key, value === null ? undefined : value],
        );

        const sanitizedLine = Object.fromEntries(
          entriesWithUndefined,
        ) as SalesReturnLine;

        await this.insertLine(
          client,
          companyId,
          createdReturn.id,
          sanitizedLine,
          lineNo,
        );
        lineNo += 10000;
      }

      if (payload.primary_address) {
        await this.insertAddress(
          client,
          createdReturn.id,
          payload.primary_address,
          companyId,
        );
      }
      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdReturn.id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdReturn.id,
          payload.shipping_address,
          companyId,
        );
      }

      await client.query("COMMIT");
      return createdReturn;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing Sales Return / Credit Note
   */
  static async update(
    client: PoolClient,
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<
    { id: string; item_id: string; warehouse_id: string; line_no: number }[]
  > {
    const payload = rawPayload as SalesReturnPayload;
    const returnDoc = payload.returnOrder;

    const existingResult = await client.query(
      `SELECT status, is_posted FROM credit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!existingResult.rows.length) {
      throw new Error("Credit note not found");
    }

    if (
      existingResult.rows[0].is_posted ||
      existingResult.rows[0].status === "posted"
    ) {
      throw new Error("Posted credit note cannot be modified");
    }

    const customerPostingGroupId =
      returnDoc.customer_posting_group_id ||
      returnDoc.sales_posting_group_id ||
      null;

    const vatBusinessPostingGroupId =
      returnDoc.vat_business_posting_group_id || null;

    const updateQry = `
      UPDATE credit_notes
      SET
        customer_id = $1,
        customer_no = $2,
        customer_name = $3,

        bill_to_customer_id = $4,
        bill_to_customer_no = $5,
        bill_to_customer_name = $6,

        salesperson = $7,
        cust_order_no = $8,
        cust_return_no = $9,
        link_to_po = $10,
        sales_invoice_id = $11,
        sales_invoice = $12,

        currency_id = $13,
        exchange_rate = $14,

        credit_note_date = $15,
        requested_delivery_date = $16,
        dispatch_date = $17,
        posting_date = $18,
        due_date = $19,

        reference = $20,

        receivable_bank = $21,
        receivable_bank_id = $22,

        payment_terms_id = $23,
        payment_method_id = $24,

        contact = $25,
        book_in_phone = $26,
        book_in_contact = $27,
        book_in_email = $28,

        shipment_method_id = $29,
        shipping_agent = $30,
        shipment_ref_no = $31,
        warehouse_ref_no = $32,

        reason = $33,

        notes = $34,
        internal_notes = $35,

        subtotal = $36,
        vat_amount = $37,
        total_amount = $38,

        status = $39,
        anonymous_customer = $40,

        customer_posting_group_id = $41,
        vat_business_posting_group_id = $42,

        updated_at = NOW()
      WHERE id = $43 AND company_id = $44;
    `;

    const qryParams = [
      returnDoc.customer_id,
      returnDoc.customer_no,
      returnDoc.customer_name,

      returnDoc.bill_to_customer_id || returnDoc.customer_id,
      returnDoc.bill_to_customer_no || returnDoc.customer_no,
      returnDoc.bill_to_customer_name || returnDoc.customer_name,

      returnDoc.salesperson,
      returnDoc.cust_order_no,
      returnDoc.reason || null,
      returnDoc.link_to_po,
      returnDoc.sales_invoice_id || null,
      returnDoc.sales_invoice || null,

      returnDoc.currency_id,
      returnDoc.exchange_rate || 1.0,

      returnDoc.credit_note_date || null,
      returnDoc.requested_delivery_date || null,
      returnDoc.dispatch_date || null,
      returnDoc.posting_date?.trim() ? returnDoc.posting_date : null,
      returnDoc.due_date || null,

      returnDoc.reference,

      returnDoc.receivable_bank,
      returnDoc.receivable_bank_id,

      returnDoc.payment_terms_id,
      returnDoc.payment_method_id,

      returnDoc.contact,
      returnDoc.book_in_phone,
      returnDoc.book_in_contact,
      returnDoc.book_in_email,

      returnDoc.shipment_method_id,
      returnDoc.shipping_agent,
      returnDoc.shipment_ref_no,
      returnDoc.warehouse_ref_no,

      returnDoc.reason,

      returnDoc.notes,
      returnDoc.internal_notes,

      returnDoc.subtotal || 0,
      returnDoc.vat_amount || 0,
      returnDoc.total_amount || 0,

      returnDoc.status || "draft",
      returnDoc.anonymous_customer || false,

      customerPostingGroupId,
      vatBusinessPostingGroupId,

      id,
      companyId,
    ];

    // console.log('updateQry ==== ',updateQry);
    // console.log('qryParams ==== ',qryParams);

    await client.query(updateQry, qryParams);

    // Soft delete unlinked line entries
    const existingLinesResult = await client.query(
      `SELECT id FROM credit_note_lines WHERE credit_note_id = $1 AND COALESCE(is_deleted, false) = false`,
      [id],
    );
    const existingLineIds = existingLinesResult.rows.map((x) => x.id);
    const incomingLineIds = payload.lines.map((x) => x.id).filter(Boolean);

    for (const existingId of existingLineIds) {
      if (!incomingLineIds.includes(existingId)) {
        await client.query(
          `UPDATE credit_note_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
          [existingId],
        );
      }
    }

    // Upsert lines
    let lineNo = 10000;
    for (const line of payload.lines) {
      if (line.id) {
        await client.query(
          `
          UPDATE credit_note_lines
          SET
            line_type = $1,
            item_id = $2,
            item_code = $3,
            item_name = $4,
            gl_account_id = $5,
            account_code = $6,
            description = $7,
            warehouse_id = $8,
            warehouse_name = $9,
            uom_id = $10,
            uom_name = $11,
            quantity = $12,
            unit_price = $13,
            discount_type = $14,
            discount_value = $15,
            discount_amount = $16,
            vat_percent = $17,
            vat_amount = $18,
            net_amount = $19,
            gross_amount = $20,
            line_amount = $21,
            line_no = $22,
            updated_at = NOW()
          WHERE id = $23
          `,
          [
            line.line_type || "ITEM",
            line.item_id || null,
            line.item_code || null,
            line.item_name || null,
            line.gl_account_id || null,
            line.account_code || null,
            line.description || null,
            line.warehouse_id || null,
            line.warehouse_name || null,
            line.uom_id || null,
            line.uom_name || null,
            line.quantity || 0,
            line.unit_price || 0,
            line.discount_type || null,
            line.discount_value || 0,
            line.discount_amount || 0,
            line.vat_percent || 0,
            line.vat_amount || 0,
            line.net_amount || 0,
            line.gross_amount || 0,
            line.line_amount || line.net_amount || 0,
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
        ) as SalesReturnLine;

        await this.insertLine(client, companyId, id, sanitizedLine, lineNo);
      }
      lineNo += 10000;
    }

    // Refresh addresses
    await client.query(
      `DELETE FROM credit_note_addresses WHERE credit_note_id = $1`,
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

    await this.recalculateStatus(client, id);

    const finalLines = await client.query<{
      id: string;
      item_id: string;
      warehouse_id: string;
      line_no: number;
    }>(
      `SELECT id, item_id, warehouse_id, line_no 
       FROM credit_note_lines 
       WHERE credit_note_id = $1 AND COALESCE(is_deleted, false) = false 
       ORDER BY line_no`,
      [id],
    );

    return finalLines.rows;
  }

  /**
   * Delete a Sales Return / Credit Note shell
   */
  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT status, is_posted FROM credit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!existing.rows.length) {
      throw new Error("Credit note not found");
    }

    if (
      existing.rows[0].is_posted ||
      existing.rows[0].status === "posted" ||
      existing.rows[0].status === "completed" ||
      existing.rows[0].status === "processing"
    ) {
      throw new Error(
        "Cannot delete document shell while historical ledger or inventory entries remain linked.",
      );
    }

    const result = await pool.query(
      `DELETE FROM credit_notes WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount) {
      throw new Error("Credit note not found");
    }
  }

  /**
   * Insert line entry into credit_note_lines
   */
  static async insertLine(
    client: PoolClient,
    companyId: string,
    creditNoteId: string,
    line: SalesReturnLine,
    lineNo: number,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO credit_note_lines (
        company_id,
        credit_note_id,
        sales_invoice_line_id,

        line_no,
        line_type,

        item_id,
        item_code,
        item_name,
        gl_account_id,
        account_code,

        description,

        warehouse_id,
        warehouse_name,

        uom_id,
        uom_name,

        quantity,
        returned_quantity,

        unit_price,

        discount_type,
        discount_value,
        discount_amount,

        vat_percent,
        vat_amount,

        net_amount,
        gross_amount,
        line_amount,

        is_deleted,

        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26,
        false,
        NOW()
      )
      `,
      [
        companyId,
        creditNoteId,
        line.sales_invoice_line_id || null, // maps to sales_invoice_line_id
        lineNo,
        line.line_type || "ITEM",

        line.item_id || null,
        line.item_code || null,
        line.item_name || null,
        line.gl_account_id || null,
        line.account_code || null,

        line.description || null,

        line.warehouse_id || null,
        line.warehouse_name || null,

        line.uom_id || null,
        line.uom_name || null,

        line.quantity || 0,
        0, // initial returned_quantity

        line.unit_price || 0,

        line.discount_type || null,
        line.discount_value || 0,
        line.discount_amount || 0,

        line.vat_percent || 0,
        line.vat_amount || 0,

        line.net_amount || 0,
        line.gross_amount || 0,
        line.line_amount || line.net_amount || 0,
      ],
    );
  }

  /**
   * Insert credit note address details
   */
  private static async insertAddress(
    client: PoolClient,
    creditNoteId: string,
    address: SalesReturnAddress,
    companyId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO credit_note_addresses (
        credit_note_id,
        company_id,
        address_type,

        name,
        attention,

        phone,
        email,

        address_1,
        address_2,

        city,
        state,
        county,

        postcode,
        country,

        contact_person,
        contact_name
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )
      `,
      [
        creditNoteId,
        companyId,
        address.address_type,

        address.name,
        address.attention,

        address.phone,
        address.email,

        address.address_1,
        address.address_2,

        address.city,
        address.state,
        address.county,

        address.postcode,
        address.country,

        address.contact_person,
        address.contact_name,
      ],
    );
  }

  /**
   * Recalculate status for credit notes
   */
  static async recalculateStatus(
    client: PoolClient,
    creditNoteId: string,
  ): Promise<void> {
    const result = await client.query(
      `
      SELECT quantity, COALESCE(returned_quantity, 0) AS returned_quantity, COALESCE(cancelled_quantity, 0) as cancelled_quantity
      FROM credit_note_lines
      WHERE credit_note_id = $1 
        AND COALESCE(is_deleted, false) = false 
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      `,
      [creditNoteId],
    );

    const lines = result.rows;
    if (!lines.length) return;

    let fullyProcessed = true;
    let partiallyProcessed = false;

    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const returned = Number(line.returned_quantity || 0);
      const cancelled = Number(line.cancelled_quantity || 0);
      const processed = returned + cancelled;

      if (processed > 0) {
        partiallyProcessed = true;
      }

      if (processed < qty) {
        fullyProcessed = false;
      }
    }

    const shipmentStatus = fullyProcessed
      ? "RECEIVED"
      : partiallyProcessed
        ? "PARTIALLY_RECEIVED"
        : "PENDING";

    const returnStatus = fullyProcessed
      ? "completed"
      : partiallyProcessed
        ? "processing"
        : "open";

    await client.query(
      `
      UPDATE credit_notes 
      SET shipment_status = $1, 
          status = $2, 
          updated_at = NOW() 
      WHERE id = $3
      `,
      [shipmentStatus, returnStatus, creditNoteId],
    );
  }


  static async saveLineAllocations(
    client: PoolClient,
    companyId: string,
    creditNoteId: string,
    creditNoteLineId: string,
    itemId: string,
    warehouseId: string,
    allocations: SalesReturnDeAllocationRecord[],
  ): Promise<void> {
    // 1. Lock check: Protect allocations if stock has already been physically received back
    const lineResult = await client.query(
      `
      SELECT
        id,
        quantity,
        COALESCE(returned_quantity, 0) AS returned_quantity
      FROM credit_note_lines
      WHERE id = $1
        AND credit_note_id = $2
        AND company_id = $3
        AND is_deleted = false
      FOR UPDATE
      `,
      [creditNoteLineId, creditNoteId, companyId],
    );

    if (!lineResult.rows.length) {
      throw new Error("Credit note line not found");
    }

    const line = lineResult.rows[0];

    // If stock has already been processed into inventory, keep allocation records locked
    if (Number(line.returned_quantity || 0) > 0) {
      return;
    }

    const lineQuantity = Number(line.quantity || 0);

    // 2. Clear unposted draft allocations for this credit note line
    await client.query(
      `
      DELETE FROM inventory_allocations
      WHERE credit_note_line_id = $1 
        AND company_id = $2 
        AND inbound_entry_id IS NULL
      `,
      [creditNoteLineId, companyId],
    );

    if (!allocations || !allocations.length) return;

    // Validate total quantity requested across all allocation lines
    let totalReturnQty = 0;
    for (const allocation of allocations) {
      const qty = Number(allocation.return_quantity || 0);
      if (qty < 0) {
        throw new Error("Return quantity cannot be negative");
      }
      totalReturnQty += qty;
    }

    if (totalReturnQty > lineQuantity + 0.000001) {
      throw new Error(
        `Return allocation quantity (${totalReturnQty}) exceeds credit note line quantity (${lineQuantity})`,
      );
    }

    // 3. Process each return allocation
    for (const allocation of allocations) {
      const returnQty = Number(allocation.return_quantity || 0);

      if (returnQty <= 0) {
        continue;
      }

      if (!allocation.id) {
        throw new Error(
          "Each return allocation must reference a source outbound sales allocation",
        );
      }

      // 4. Resolve source allocation ID (handling draft edits gracefully)
      let targetAllocationId = allocation.id;

      const draftCheck = await client.query(
        `
        SELECT source_allocation_id 
        FROM inventory_allocations 
        WHERE id = $1 
          AND company_id = $2 
          AND credit_note_line_id IS NOT NULL
        `,
        [allocation.id, companyId],
      );

      if (draftCheck.rows.length && draftCheck.rows[0].source_allocation_id) {
        targetAllocationId = draftCheck.rows[0].source_allocation_id;
      }

      // 5. Query root outbound sales allocation record
      const sourceQry = `
        SELECT
          ia.id,
          ia.company_id,
          ia.item_id,
          ia.warehouse_id,
          ia.warehouse_location_id,
          ia.outbound_entry_id,
          ia.sales_order_line_id,
          ia.sales_invoice_line_id,
          ia.batch_no,
          ia.bin_code,
          ia.expiry_date,
          ia.allocated_quantity,
          ia.unit_cost,
          ia.status
        FROM inventory_allocations ia
        WHERE ia.id = $1
          AND ia.company_id = $2
          AND ia.item_id = $3
          AND ia.warehouse_id = $4
          AND ia.credit_note_line_id IS NULL
          AND ia.source_allocation_id IS NULL
          AND ia.status = 'ACTIVE'
        FOR UPDATE
      `;

      const sourceResult = await client.query(sourceQry, [
        targetAllocationId,
        companyId,
        itemId,
        warehouseId,
      ]);

      if (!sourceResult.rows.length) {
        throw new Error(
          `Source sales allocation ${allocation.id} not found or is not a valid outbound allocation record`,
        );
      }

      const source = sourceResult.rows[0];

      // 6. Check quantity already returned against this specific outbound allocation
      const returnedResult = await client.query(
        `
        SELECT COALESCE(SUM(allocated_quantity), 0) AS returned_quantity
        FROM inventory_allocations
        WHERE source_allocation_id = $1
          AND company_id = $2
          AND status = 'ACTIVE'
          AND credit_note_line_id IS NOT NULL
        `,
        [source.id, companyId],
      );

      const alreadyReturned = Number(
        returnedResult.rows[0]?.returned_quantity || 0,
      );

      const originalQty = Number(source.allocated_quantity || 0);
      const availableQty = originalQty - alreadyReturned;

      if (returnQty > availableQty + 0.000001) {
        const identifier = source.bin_code || source.batch_no || "selected line";
        throw new Error(
          `Cannot return ${returnQty} units for ${identifier}. Only ${Math.max(0, availableQty)} units remain eligible for return.`,
        );
      }

      // 7. Insert draft Credit Note allocation row
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          inbound_entry_id,
          credit_note_line_id,
          source_allocation_id,
          sales_order_line_id,
          sales_invoice_line_id,
          item_id,
          warehouse_id,
          warehouse_location_id,
          batch_no,
          bin_code,
          expiry_date,
          allocated_quantity,
          unit_cost,
          total_cost,
          allocation_method,
          status
        )
        VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'FIFO', 'ACTIVE')
        `,
        [
          companyId,
          source.outbound_entry_id,
          creditNoteLineId,
          source.id,
          source.sales_order_line_id,
          source.sales_invoice_line_id,
          source.item_id,
          source.warehouse_id,
          source.warehouse_location_id,
          source.batch_no,
          source.bin_code,
          source.expiry_date,
          returnQty,
          source.unit_cost,
          returnQty * Number(source.unit_cost || 0),
        ],
      );
    }
  }
}
