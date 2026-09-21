// lib/services/sales/sales-quote.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLine,
  SalesQuotePayload,
} from "@/types/sales-quote";
import { SalesQuotePayloadSchema } from "@/lib/validations/sales-quote.schema";

export class SalesQuoteService {
  /* -------------------------------------------------------------------------- */
  /* LIST QUOTES                                                                */
  /* -------------------------------------------------------------------------- */
  static async list(companyId: string): Promise<SalesQuote[]> {
    const result = await pool.query(
      `
      SELECT 
        sq.*, 
        p.name AS customer_name
      FROM sales_quotes sq
      LEFT JOIN parties p ON p.id = sq.customer_id
      WHERE sq.company_id = $1 AND sq.is_cancelled = false
      ORDER BY sq.created_at DESC
      `,
      [companyId],
    );
    return result.rows;
  }

  /* -------------------------------------------------------------------------- */
  /* PAGINATED LIST                                                             */
  /* -------------------------------------------------------------------------- */
  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<SalesQuote>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const filters = params.filters || {};
    const search =
      typeof params.search === "string" ? params.search.trim() : "";

    const sortBy = params.sortBy;
    const sortOrder =
      params.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      quote_no: "sq.quote_no",
      quote_date: "sq.quote_date",
      valid_until: "sq.valid_until",
      customer_no: "sq.customer_no",
      customer_name: "sq.customer_name",
      salesperson: "sq.salesperson",
      currency_code: "c.code",
      subtotal: "sq.subtotal",
      vat_amount: "sq.vat_amount",
      total_amount: "sq.total_amount",
      status: "sq.status",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "sq.quote_no";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = ["sq.company_id = $1"];

    if (search) {
      queryValues.push(`%${search}%`);
      const searchParam = `$${queryValues.length}`;
      whereClauses.push(
        `( sq.quote_no ILIKE ${searchParam} OR 
           sq.customer_no ILIKE ${searchParam} OR 
           sq.customer_name ILIKE ${searchParam} OR 
           sq.salesperson ILIKE ${searchParam} )`,
      );
    }

    // Filter Logic
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;
      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "status") {
          queryValues.push(String(filter.value));
          whereClauses.push(`sq.status::text = $${queryValues.length}`);
        } else if (colKey === "quote_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`sq.quote_no ILIKE $${queryValues.length}`);
        } else if (colKey === "customer_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`sq.customer_name ILIKE $${queryValues.length}`);
        }
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const joinSql = `
      FROM sales_quotes sq
      LEFT JOIN currencies c ON c.id = sq.currency_id
      LEFT JOIN sales_quote_addresses sqa 
          ON sqa.sales_quote_id = sq.id AND sqa.address_type = 'primary'
      LEFT JOIN sales_quote_addresses ship_a 
          ON ship_a.sales_quote_id = sq.id AND ship_a.address_type = 'shipping'
    `;

    const countQuery = `SELECT COUNT(DISTINCT sq.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (sq.id, ${orderByColumn})
        sq.*,
        c.code AS currency_code,
        sqa.city AS city,
        ship_a.city AS ship_to_city
      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${sortOrder}, sq.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* GET SINGLE QUOTE                                                           */
  /* -------------------------------------------------------------------------- */
  static async get(companyId: string, id: string) {
    const quoteResult = await pool.query(
      `
      SELECT sq.*, 
        pt.name AS payment_terms_name,
        pm.name AS payment_method_name,
        sm.name AS shipment_method_name
      FROM sales_quotes sq
      LEFT JOIN payment_terms pt ON pt.id = sq.payment_terms_id
      LEFT JOIN payment_method pm ON pm.id = sq.payment_method_id
      LEFT JOIN shipment_method sm ON sm.id = sq.shipment_method_id
      WHERE sq.id = $1 AND sq.company_id = $2
      `,
      [id, companyId],
    );

    if (!quoteResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT 
        sql.*, 
        i.item_code,
        i.name AS item_name,
        gl.code AS account_code,
        gl.name AS account_name,
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        sql.warehouse_location_id AS location_id,
        wl.code AS location_code,
        wl.title AS location_name,
        u.name AS uom_name
      FROM sales_quote_lines sql
      LEFT JOIN items i ON sql.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON sql.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON sql.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN warehouse_locations wl ON sql.warehouse_id = wl.warehouse_id AND sql.warehouse_location_id = wl.id AND w.company_id = $2
      LEFT JOIN uoms u ON sql.uom_id = u.id AND u.company_id = $2
      WHERE sql.sales_quote_id = $1 AND sql.is_deleted = false
      ORDER BY sql.line_no
      `,
      [id, companyId],
    );

    const addressResult = await pool.query(
      `SELECT * FROM sales_quote_addresses WHERE sales_quote_id = $1`,
      [id],
    );

    return {
      quote: quoteResult.rows[0],
      lines: linesResult.rows,
      primary_address:
        addressResult.rows.find((x) => x.address_type === "primary") || null,
      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* CREATE QUOTE                                                               */
  /* -------------------------------------------------------------------------- */
  static async create(
    companyId: string,
    rawPayload: unknown,
  ): Promise<SalesQuote> {
    const payload = SalesQuotePayloadSchema.parse(
      rawPayload,
    ) as SalesQuotePayload;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const quote = payload.quote;

      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_quote"],
      );
      const quoteNo = seqResult.rows[0].code;

      const quoteResult = await client.query(
        `
        INSERT INTO sales_quotes (
          company_id, quote_no, customer_id, customer_no, customer_name,
          bill_to_customer_id, bill_to_customer_no, bill_to_customer_name,
          customer_posting_group_id, vat_business_posting_group_id, stage_id,
          currency_id, exchange_rate, quote_date, order_date, requested_delivery_date,
          posting_date, dispatch_date, delivery_date, due_date, valid_from, valid_until,
          salesperson_id, salesperson, reference, customer_reference, source_of_quote,
          opportunity_id, contact_id, payment_terms_id, payment_terms, payment_method_id,
          payment_method, receivable_bank_id, receivable_bank, shipment_method_id,
          shipment_method, shipping_agent, warehouse_id, warehouse_name, subtotal,
          discount_amount, freight_charges, finance_charges, insurance_charges,
          vat_amount, total_amount, status, anonymous_customer, email, contact, phone,
          notes, internal_notes, terms_and_conditions, footer_text, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
          $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57
        )
        RETURNING *;
        `,
        [
          companyId,
          quoteNo,
          quote.customer_id,
          quote.customer_no,
          quote.customer_name,
          quote.bill_to_customer_id,
          quote.bill_to_customer_no,
          quote.bill_to_customer_name,
          quote.customer_posting_group_id,
          quote.vat_business_posting_group_id,
          quote.stage_id,
          quote.currency_id,
          quote.exchange_rate || 1.0,
          quote.quote_date || new Date(),
          quote.order_date,
          quote.requested_delivery_date,
          quote.posting_date,
          quote.dispatch_date,
          quote.delivery_date,
          quote.due_date,
          quote.valid_from,
          quote.valid_until,
          quote.salesperson_id,
          quote.salesperson,
          quote.reference,
          quote.customer_reference,
          quote.source_of_quote,
          quote.opportunity_id,
          quote.contact_id,
          quote.payment_terms_id,
          quote.payment_terms,
          quote.payment_method_id,
          quote.payment_method,
          quote.receivable_bank_id,
          quote.receivable_bank,
          quote.shipment_method_id,
          quote.shipment_method,
          quote.shipping_agent,
          quote.warehouse_id,
          quote.warehouse_name,
          quote.subtotal || 0,
          quote.discount_amount || 0,
          quote.freight_charges || 0,
          quote.finance_charges || 0,
          quote.insurance_charges || 0,
          quote.vat_amount || 0,
          quote.total_amount || 0,
          quote.status || "draft",
          quote.anonymous_customer || false,
          quote.email,
          quote.contact,
          quote.phone,
          quote.notes,
          quote.internal_notes,
          quote.terms_and_conditions,
          quote.footer_text,
          quote.created_by,
        ],
      );

      const createdQuote = quoteResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, createdQuote.id, line, lineNo);
        lineNo += 10000;
      }

      // if (payload.addresses) {
      //   await this.upsertAddresses(client, companyId, createdQuote.id, payload.addresses);
      // }

      if (payload.primary_address)
        await this.upsertAddresses(
          client,
          companyId,
          createdQuote.id,
          payload.primary_address,
        );

      if (payload.billing_address)
        await this.upsertAddresses(
          client,
          companyId,
          createdQuote.id,
          payload.billing_address,
        );

      if (payload.shipping_address)
        await this.upsertAddresses(
          client,
          companyId,
          createdQuote.id,
          payload.shipping_address,
        );

      await client.query("COMMIT");
      return createdQuote;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CONVERT SALES QUOTE TO SALES ORDER                                         */
  /* -------------------------------------------------------------------------- */
  static async convertToSalesOrder(
    companyId: string,
    salesQuoteId: string,
    convertedByUserId: string,
  ): Promise<{ salesOrderId: string; orderNo: string }> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch Sales Quote with Lock
      const sqRes = await client.query(
        `SELECT * FROM sales_quotes WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [salesQuoteId, companyId],
      );

      if (!sqRes.rows.length) {
        throw new Error("Sales Quote not found.");
      }

      const quote = sqRes.rows[0];

      if (quote.is_cancelled || quote.status === "cancelled") {
        throw new Error("Cannot convert a cancelled quote.");
      }

      if (quote.is_converted || quote.conversion_status === "CONVERTED") {
        throw new Error("Quote has already been fully converted.");
      }

      // 2. Fetch Active Quote Lines
      const linesRes = await client.query(
        `SELECT * FROM sales_quote_lines WHERE sales_quote_id = $1 AND is_deleted = false ORDER BY line_no`,
        [salesQuoteId],
      );

      if (!linesRes.rows.length) {
        throw new Error("Cannot convert a quote with no line items.");
      }

      const quoteLines = linesRes.rows;

      // 3. Generate Sales Order Number Sequence
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_order"],
      );
      const orderNo = seqResult.rows[0].code;

      // 4. Create Sales Order Header
      const soRes = await client.query(
        `
        INSERT INTO sales_orders (
          company_id, order_no, customer_id, customer_no, customer_name,
          bill_to_customer_id, bill_to_customer_no, bill_to_customer_name,
          customer_posting_group_id, vat_business_posting_group_id, stage_id,
          currency_id, exchange_rate, order_date, requested_delivery_date,
          posting_date, dispatch_date, delivery_date, due_date, salesperson_id,
          salesperson, reference, cust_order_no, sales_quote_id, sales_quote_no,
          source_of_order, converted_by, payment_terms_id, payment_terms,
          payment_method_id, payment_method, payable_bank_id, payable_bank,
          shipment_method_id, shipment_method, shipping_agent, subtotal,
          discount_amount, freight_charges, finance_charges, insurance_charges,
          vat_amount, total_amount, status, anonymous_customer, email, contact,
          notes, internal_notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
          $45, $46, $47, $48, $49, $50
        ) RETURNING id;
        `,
        [
          companyId,
          orderNo,
          quote.customer_id,
          quote.customer_no,
          quote.customer_name,
          quote.bill_to_customer_id,
          quote.bill_to_customer_no,
          quote.bill_to_customer_name,
          quote.customer_posting_group_id,
          quote.vat_business_posting_group_id,
          quote.stage_id,
          quote.currency_id,
          quote.exchange_rate,
          quote.order_date || new Date(),
          quote.requested_delivery_date,
          quote.posting_date,
          quote.dispatch_date,
          quote.delivery_date,
          quote.due_date,
          quote.salesperson_id,
          quote.salesperson,
          quote.reference,
          quote.customer_reference,
          quote.id,
          quote.quote_no,
          quote.source_of_quote || "QUOTE_CONVERSION",
          convertedByUserId,
          quote.payment_terms_id,
          quote.payment_terms,
          quote.payment_method_id,
          quote.payment_method,
          quote.receivable_bank_id,
          quote.receivable_bank,
          quote.shipment_method_id,
          quote.shipment_method,
          quote.shipping_agent,
          quote.subtotal,
          quote.discount_amount,
          quote.freight_charges,
          quote.finance_charges,
          quote.insurance_charges,
          quote.vat_amount,
          quote.total_amount,
          "draft",
          quote.anonymous_customer,
          quote.email,
          quote.contact,
          quote.notes,
          quote.internal_notes,
          convertedByUserId,
        ],
      );

      const salesOrderId = soRes.rows[0].id;

      // 5. Convert Lines & Update Quantities
      for (const line of quoteLines) {
        const remainingQty =
          Number(line.quantity) - Number(line.quantity_converted);

        if (remainingQty <= 0) continue;

        await client.query(
          `
          INSERT INTO sales_order_lines (
            company_id, sales_order_id, sales_quote_line_id, line_no, line_type,
            item_id, item_code, item_name, gl_account_id, account_code, warehouse_id,
            warehouse_name, warehouse_location_id, uom_id, uom_name, description,
            quantity, unit_price, discount_value, discount_amount,
            vat_business_posting_group_id, vat_product_posting_group_id, vat_percent,
            vat_amount, line_amount, net_amount, gross_amount
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          );
          `,
          [
            companyId,
            salesOrderId,
            line.id,
            line.line_no,
            line.line_type,
            line.item_id,
            line.item_code,
            line.item_name,
            line.gl_account_id,
            line.account_code,
            line.warehouse_id,
            line.warehouse_name,
            line.warehouse_location_id,
            line.uom_id,
            line.uom_name,
            line.description,
            remainingQty,
            line.unit_price,
            line.discount_value,
            line.discount_amount,
            line.vat_business_posting_group_id,
            line.vat_product_posting_group_id,
            line.vat_percent,
            line.vat_amount,
            line.line_amount,
            line.net_amount,
            line.gross_amount,
          ],
        );

        // Update sales quote line conversion tracking
        await client.query(
          `
          UPDATE sales_quote_lines
          SET quantity_converted = quantity_converted + $1,
              quantity_remaining = quantity - (quantity_converted + $1),
              line_status = CASE 
                WHEN (quantity - (quantity_converted + $1)) <= 0 THEN 'CLOSED'
                ELSE 'PARTIALLY_CONVERTED'
              END,
              updated_at = NOW()
          WHERE id = $2
          `,
          [remainingQty, line.id],
        );
      }

      // 6. Copy Addresses
      await client.query(
        `
        INSERT INTO sales_order_addresses (
          company_id, sales_order_id, address_type, name, contact_name,
          attention, phone, email, address_1, address_2, city, county,
          state, postcode, country, contact_person
        )
        SELECT 
          company_id, $1, address_type, name, contact_name,
          attention, phone, email, address_1, address_2, city, county,
          state, postcode, country, contact_person
        FROM sales_quote_addresses
        WHERE sales_quote_id = $2
        `,
        [salesOrderId, salesQuoteId],
      );

      // 7. Update Sales Quote Header Status
      await client.query(
        `
        UPDATE sales_quotes
        SET status = 'converted'::public.sales_quote_status_enum,
            is_converted = true,
            conversion_status = 'CONVERTED',
            converted_at = NOW(),
            converted_by = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [convertedByUserId, salesQuoteId],
      );

      await client.query("COMMIT");
      return { salesOrderId, orderNo };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* HELPER METHODS                                                             */
  /* -------------------------------------------------------------------------- */
  private static async insertLine(
    client: PoolClient,
    companyId: string,
    quoteId: string,
    line: SalesQuoteLine,
    lineNo: number,
  ) {
    await client.query(
      `
      INSERT INTO sales_quote_lines (
        company_id, sales_quote_id, line_no, line_type, item_id, item_code,
        item_name, gl_account_id, account_code, warehouse_id, warehouse_name,
        warehouse_location_id, uom_id, uom_name, description, quantity,
        quantity_converted, quantity_remaining, unit_price, discount_value,
        discount_amount, vat_business_posting_group_id, vat_product_posting_group_id,
        vat_percent, vat_amount, line_amount, net_amount, gross_amount, line_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        0, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'OPEN'
      )
      `,
      [
        companyId,
        quoteId,
        lineNo,
        line.line_type || "ITEM",
        line.item_id,
        line.item_code,
        line.item_name,
        line.gl_account_id,
        line.account_code,
        line.warehouse_id,
        line.warehouse_name,
        line.warehouse_location_id,
        line.uom_id,
        line.uom_name,
        line.description,
        line.quantity || 0,
        line.unit_price || 0,
        line.discount_value || 0,
        line.discount_amount || 0,
        line.vat_business_posting_group_id,
        line.vat_product_posting_group_id,
        line.vat_percent || 0,
        line.vat_amount || 0,
        line.line_amount || 0,
        line.net_amount || 0,
        line.gross_amount || 0,
      ],
    );
  }

  private static async upsertAddresses(
    client: PoolClient,
    companyId: string,
    quoteId: string,
    addresses: SalesQuoteAddress,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO sales_quote_addresses
      (
          sales_order_id,
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
      VALUES
      (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16
      )
      `,
      [
        quoteId,
        companyId,
        addresses.address_type,

        addresses.name,
        addresses.attention,

        addresses.phone,
        addresses.email,

        addresses.address_1,
        addresses.address_2,

        addresses.city,
        addresses.state,
        addresses.county,

        addresses.postcode,
        addresses.country,

        addresses.contact_person,
        addresses.contact_name,
      ],
    );
    /* const list = [
      { type: "primary", data: addresses.primary_address },
      { type: "billing", data: addresses.billing_address },
      { type: "shipping", data: addresses.shipping_address },
    ];

    for (const item of list) {
      if (!item.data) continue;
      const addr = item.data;
      await client.query(
        `
        INSERT INTO sales_quote_addresses (
          company_id, sales_quote_id, address_type, name, contact_name, attention,
          phone, email, address_1, address_2, city, county, state, postcode, country, contact_person
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          companyId,
          quoteId,
          item.type,
          addr.name,
          addr.contact_name,
          addr.attention,
          addr.phone,
          addr.email,
          addr.address_1,
          addr.address_2,
          addr.city,
          addr.county,
          addr.state,
          addr.postcode,
          addr.country,
          addr.contact_person,
        ],
      );
    } */
  }

  // Add to lib/services/sales/sales-quote.service.ts

  /* -------------------------------------------------------------------------- */
  /* UPDATE QUOTE                                                               */
  /* -------------------------------------------------------------------------- */
  static async update(
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<SalesQuote> {
    const payload = SalesQuotePayloadSchema.parse(
      rawPayload,
    ) as SalesQuotePayload;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Verify existence and check lock/conversion state
      const existingRes = await client.query(
        `SELECT is_converted, status FROM sales_quotes WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );

      if (!existingRes.rows.length) {
        throw new Error("Sales Quote not found.");
      }

      if (
        existingRes.rows[0].is_converted ||
        existingRes.rows[0].status === "converted"
      ) {
        throw new Error(
          "Cannot modify a quote that has already been converted to an order.",
        );
      }

      const quote = payload.quote;

      // 2. Update Header
      const updatedQuoteRes = await client.query(
        `
        UPDATE sales_quotes SET
          customer_id = $1, customer_no = $2, customer_name = $3,
          bill_to_customer_id = $4, bill_to_customer_no = $5, bill_to_customer_name = $6,
          customer_posting_group_id = $7, vat_business_posting_group_id = $8, stage_id = $9,
          currency_id = $10, exchange_rate = $11, quote_date = $12, order_date = $13,
          requested_delivery_date = $14, posting_date = $15, dispatch_date = $16,
          delivery_date = $17, due_date = $18, valid_from = $19, valid_until = $20,
          salesperson_id = $21, salesperson = $22, reference = $23, customer_reference = $24,
          source_of_quote = $25, opportunity_id = $26, contact_id = $27, payment_terms_id = $28,
          payment_terms = $29, payment_method_id = $30, payment_method = $31,
          receivable_bank_id = $32, receivable_bank = $33, shipment_method_id = $34,
          shipment_method = $35, shipping_agent = $36, warehouse_id = $37, warehouse_name = $38,
          subtotal = $39, discount_amount = $40, freight_charges = $41,
          finance_charges = $42, insurance_charges = $43, vat_amount = $44, total_amount = $45,
          status = $46, anonymous_customer = $47, email = $48, contact = $49, phone = $50,
          notes = $51, internal_notes = $52, terms_and_conditions = $53, footer_text = $54,
          updated_at = NOW()
        WHERE id = $55 AND company_id = $56
        RETURNING *;
        `,
        [
          quote.customer_id,
          quote.customer_no,
          quote.customer_name,
          quote.bill_to_customer_id,
          quote.bill_to_customer_no,
          quote.bill_to_customer_name,
          quote.customer_posting_group_id,
          quote.vat_business_posting_group_id,
          quote.stage_id,
          quote.currency_id,
          quote.exchange_rate || 1.0,
          quote.quote_date,
          quote.order_date,
          quote.requested_delivery_date,
          quote.posting_date,
          quote.dispatch_date,
          quote.delivery_date,
          quote.due_date,
          quote.valid_from,
          quote.valid_until,
          quote.salesperson_id,
          quote.salesperson,
          quote.reference,
          quote.customer_reference,
          quote.source_of_quote,
          quote.opportunity_id,
          quote.contact_id,
          quote.payment_terms_id,
          quote.payment_terms,
          quote.payment_method_id,
          quote.payment_method,
          quote.receivable_bank_id,
          quote.receivable_bank,
          quote.shipment_method_id,
          quote.shipment_method,
          quote.shipping_agent,
          quote.warehouse_id,
          quote.warehouse_name,
          quote.subtotal || 0,
          quote.discount_amount || 0,
          quote.freight_charges || 0,
          quote.finance_charges || 0,
          quote.insurance_charges || 0,
          quote.vat_amount || 0,
          quote.total_amount || 0,
          quote.status || "draft",
          quote.anonymous_customer || false,
          quote.email,
          quote.contact,
          quote.phone,
          quote.notes,
          quote.internal_notes,
          quote.terms_and_conditions,
          quote.footer_text,
          id,
          companyId,
        ],
      );

      // 3. Delete existing lines and re-insert updated ones
      await client.query(
        `DELETE FROM sales_quote_lines WHERE sales_quote_id = $1 AND company_id = $2`,
        [id, companyId],
      );

      let lineNo = 10000;
      for (const line of payload.lines) {
        await this.insertLine(client, companyId, id, line, lineNo);
        lineNo += 10000;
      }

      // 4. Delete existing addresses and re-insert updated ones
      // if (payload.addresses) {
      //   await client.query(
      //     `DELETE FROM sales_quote_addresses WHERE sales_quote_id = $1 AND company_id = $2`,
      //     [id, companyId]
      //   );
      //   await this.upsertAddresses(client, companyId, id, payload.addresses);
      // }

      await client.query(
        `DELETE FROM sales_quote_addresses WHERE sales_quote_id = $1 AND company_id = $2`,
        [id, companyId],
      );

      if (payload.primary_address)
        await this.upsertAddresses(
          client,
          companyId,
          id,
          payload.primary_address,
        );

      if (payload.billing_address)
        await this.upsertAddresses(
          client,
          companyId,
          id,
          payload.billing_address,
        );

      if (payload.shipping_address)
        await this.upsertAddresses(
          client,
          companyId,
          id,
          payload.shipping_address,
        );

      await client.query("COMMIT");
      return updatedQuoteRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

/* import { PoolClient } from "pg";
import { SalesQuotePayload } from "@/types/sales-quote";

export class SalesQuoteService {
  
  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesQuotePayload,
    quoteNo: string,
  ) {

    if (!payload.quote.customer_id) {
      throw new Error("Customer is required");
    }

    if (!payload.lines || payload.lines.length === 0) {
      throw new Error("At least one line is required");
    }


    const quoteResult = await client.query(
      `
      INSERT INTO sales_quotes (
        company_id, quote_no, customer_id, quote_date, valid_until,
        currency_id, exchange_rate, subtotal, tax_amount, total_amount, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'DRAFT')
      RETURNING *
      `,
      [
        companyId,
        quoteNo,
        payload.quote.customer_id,
        payload.quote.customer_id,
        payload.quote.customer_id || null,
        payload.quote.currency_id || null,
        payload.quote.exchange_rate || 1,
        payload.quote.subtotal || 0,
        payload.quote.tax_amount || 0,
        payload.quote.total_amount || 0,
        payload.quote.notes || null,
      ],
    );

    const quote = quoteResult.rows[0];

    let index = 0;
    for (const line of payload.lines) {
      index++;

      const qty = Number(line.quantity ?? 0);
      const price = Number(line.unit_price ?? 0);
      const taxPercent = Number(line.vat_percent ?? 0);

      // Safety validation for actual transactional lines
      if (line.line_type !== "COMMENT" && qty < 0) {
        throw new Error(`Invalid quantity in quote line row ${index}`);
      }


      let computedDiscountPercent = 0;
      const discountValue = Number(line.discount_value ?? 0);

      if (discountValue > 0) {
        if (line.discount_type === "PERCENT") {
          computedDiscountPercent = discountValue;
        } else {
          const grossAmount = qty * price;
          computedDiscountPercent =
            grossAmount > 0 ? (discountValue / grossAmount) * 100 : 0;
        }
      }

      // Map either total_amount, line_total, or fall back to an inline programmatic calculation
      const lineAmount = Number(line.vat_percent  || 0);

      await client.query(
        `
        INSERT INTO sales_quote_lines (
          company_id, sales_quote_id, line_no, item_id, gl_account_id, description,
          warehouse_id, quantity, unit_price, discount_value, tax_percent, line_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          companyId,
          quote.id,
          line.line_no || index,
          line.line_type === "ITEM" ? line.item_id || null : null,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id || null : null,
          line.description || null,
          line.warehouse_id || null,
          qty,
          price,
          Number(computedDiscountPercent.toFixed(2)),
          taxPercent,
          lineAmount,
        ],
      );
    }

    return quote;
  }
} */
