// lib/services/sales/sales-order.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
  SalesOrderPayload,
} from "@/types/sales-order";
import { SalesOrderPayloadSchema } from "@/lib/validations/sales-order.schema";
import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";
import { SalesOrderStatusService } from "./sales-order-status.service";
import { SO_StockAllocationRecord } from "@/app/components/shared/modals/SO_StockAllocationModal";

export class SalesOrderService {
  static async list(companyId: string): Promise<SalesOrder[]> {
    const result = await pool.query(
      `
      SELECT 
        so.*, 
        p.name AS customer_name
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      WHERE so.company_id = $1 AND so.status::text != 'completed'
      ORDER BY so.created_at DESC
      `,
      [companyId],
    );
    return result.rows;
  }

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<SalesOrder>> {
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
      posting_date: "so.posting_date",
      offer_date: "so.order_date",
      sale_order_code: "so.order_no",
      sale_quote_code: "so.sales_quote_no",
      cust_order_no: "so.cust_order_no",
      current_stage: "cos.name",
      sell_to_cust_no: "so.customer_no",
      sell_to_cust_name: "so.customer_name",
      sell_to_city: "so.billing_address->>'city'",
      sale_person: "so.salesperson",
      currency_code: "c.code",
      net_amount: "so.subtotal",
      vat_amount: "so.vat_amount",
      grand_total: "so.total_amount",
      due_date: "so.due_date",
      requested_delivery_date: "so.requested_delivery_date",
      dispatch_date: "so.dispatch_date",
      delivery_date: "so.delivery_date",
      shipment_method_code: "sm.name",
      ship_to_city: "so.shipping_address->>'city'",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "so.order_no";
    const orderDirection = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = [
      "so.company_id = $1",
      "so.status::text != 'completed'",
    ];

    /* -------------------------------------------------------------------- */
    /* Global search */
    /* -------------------------------------------------------------------- */
    if (search) {
      queryValues.push(`%${search}%`);
      const searchParam = `$${queryValues.length}`;
      whereClauses.push(
        ` ( so.order_no ILIKE ${searchParam} OR 
            so.supp_order_no ILIKE ${searchParam} OR 
            so.supplier_no ILIKE ${searchParam} OR 
            so.customer_name ILIKE ${searchParam} OR 
            cos.name ILIKE ${searchParam} OR 
            c.code ILIKE ${searchParam} OR 
            sm.name ILIKE ${searchParam} OR 
            so.purchaser ILIKE ${searchParam} ) `,
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
          whereClauses.push(`so.status::text = $${queryValues.length}`);
        } else if (colKey === "sale_order_code") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`so.order_no ILIKE $${queryValues.length}`);
        } else if (colKey === "sell_to_cust_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`so.customer_name ILIKE $${queryValues.length}`);
        } else if (colKey === "cust_order_no") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`so.cust_order_no ILIKE $${queryValues.length}`);
        } else if (colKey === "sale_person") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`so.salesperson ILIKE $${queryValues.length}`);
        }
      }

      // Date & Range Filters
      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);
        const idx = queryValues.length;
        if (colKey === "posting_date")
          whereClauses.push(`so.posting_date >= $${idx}::date`);
        if (colKey === "offer_date")
          whereClauses.push(`so.order_date >= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`so.subtotal >= $${idx}::numeric`);
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);
        const idx = queryValues.length;
        if (colKey === "posting_date")
          whereClauses.push(`so.posting_date <= $${idx}::date`);
        if (colKey === "offer_date")
          whereClauses.push(`so.order_date <= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`so.subtotal <= $${idx}::numeric`);
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Shared SQL Join Clause
    const joinSql = `
      FROM sales_orders so
      
      LEFT JOIN currencies c ON c.id = so.currency_id
      LEFT JOIN employees e ON (
        e.company_id = so.company_id AND (
          e.id::text = so.salesperson OR 
          e.display_name ILIKE so.salesperson OR
          CONCAT(e.first_name, ' ', e.last_name) ILIKE so.salesperson
        )
      )
      
      LEFT JOIN shipment_method sm ON sm.id = so.shipment_method_id
      LEFT JOIN common_order_stages cos ON cos.id = so.stage_id       
      LEFT JOIN sales_order_addresses soa 
          ON soa.sales_order_id = so.id 
          AND soa.address_type = 'primary'
      LEFT JOIN sales_order_addresses ship_a 
          ON ship_a.sales_order_id = so.id 
          AND ship_a.address_type = 'shipping'
    `;
    /* LEFT JOIN common_order_stages cos 
          ON cos.company_id = so.company_id 
          AND cos.stage_type = 'sales_order' 
          AND cos.name ILIKE so.status::text */

    // Total Count Query
    const countQuery = `SELECT COUNT(DISTINCT so.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Record Set Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (so.id, ${orderByColumn})
        so.id,
        so.order_no AS sale_order_code,
        so.sales_quote_no AS sale_quote_code,
        so.cust_order_no,
        so.posting_date,
        so.order_date AS offer_date,
        so.due_date,
        so.requested_delivery_date,
        so.dispatch_date,
        so.delivery_date,
        so.subtotal AS net_amount,
        so.vat_amount AS vat_amount,
        so.total_amount AS grand_total,
        (so.finance_charges > 0) AS finance_charges_exists,
        (so.insurance_charges > 0) AS insurance_charges_exists,
        so.book_in_phone AS book_in_tel,
        so.book_in_contact AS comm_book_in_contact,
        so.book_in_email,
        so.warehouse_ref_no AS warehouse_booking_ref,
        so.cust_warehouse_ref_no AS customer_warehouse_ref,
        so.converted_by AS converted_to_so_by_name,
        
        -- Joined Labels & Classifications
        cos.name AS current_stage,
        so.customer_no AS sell_to_cust_no,
        so.customer_name AS sell_to_cust_name,
        c.code AS currency_code,
        COALESCE(e.display_name, TRIM(CONCAT(e.first_name, ' ', e.last_name)), so.salesperson) AS sale_person,
        -- sa.code AS shipping_agent_code,
        sm.name AS shipment_method_code,

        -- Primary / Supplier Address details
        soa.address_1 AS supplier_address,
        soa.address_2 AS supplier_address2,
        soa.city AS city,
        soa.county AS county,
        soa.postcode AS post_code,
        soa.country AS country,
        soa.phone AS phone,
        soa.email AS email,

        -- Shipping Address details
        ship_a.address_1 AS ship_to_address,
        ship_a.address_2 AS ship_to_address2,
        ship_a.city AS ship_to_city,
        ship_a.county AS ship_to_county,
        ship_a.postcode AS ship_to_post_code

      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}, so.id ASC
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
      SELECT so.*,      
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method
      FROM sales_orders so
      LEFT JOIN payment_terms pt ON pt.id = so.payment_terms_id
      LEFT JOIN payment_method pm ON pm.id = so.payment_method_id
      LEFT JOIN shipment_method sm ON sm.id = so.shipment_method_id
      WHERE so.id = $1 AND so.company_id = $2
      `,
      [id, companyId],
    );

    if (!orderResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT 
        sol.*, 
        (sol.quantity - COALESCE(sol.quantity_shipped, 0)) AS remaining_quantity,
        
        i.item_code,
        i.name AS item_name,        

        gl.code AS account_code,
        gl.name AS account_name,        

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        sol.warehouse_location_id AS location_id,
        wl.code AS location_code,
        wl.title AS location_name,

        u.name AS uom_name

      FROM sales_order_lines sol
      LEFT JOIN items i ON sol.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON sol.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON sol.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN warehouse_locations wl ON sol.warehouse_id = wl.warehouse_id AND sol.warehouse_location_id = wl.id AND w.company_id = $2
      LEFT JOIN uoms u ON sol.uom_id = u.id AND u.company_id = $2

      WHERE sol.sales_order_id = $1 AND sol.is_deleted = false
      ORDER BY sol.line_no
      `,
      [id, companyId],
    );

    const allocationsResult = await pool.query(
      `
      SELECT
          ia.id,
          ia.sales_order_line_id,
          ia.item_id,
          ia.warehouse_id,
          ia.warehouse_location_id AS location_id,
          wl.title AS location_name,
          ia.allocated_quantity AS quantity,
          ia.batch_no,
          ia.bin_code,
          TO_CHAR(ia.expiry_date,'YYYY-MM-DD') AS expiry_date,
          TO_CHAR(ia.created_at,'YYYY-MM-DD') AS date_shipped
      FROM inventory_allocations ia
      LEFT JOIN warehouse_locations wl ON wl.id = ia.warehouse_location_id
      INNER JOIN sales_order_lines sol ON ia.sales_order_line_id = sol.id
      WHERE sol.sales_order_id = $1 AND ia.company_id = $2
      `,
      [id, companyId],
    );

    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsResult.rows
        .filter((alloc) => alloc.sales_order_line_id === line.id)
        .map((alloc) => ({
          date_shipped: alloc.date_shipped || "",
          prod_date: "",
          expiry_date: alloc.expiry_date || "",
          batch_no: alloc.batch_no || "",
          serial_no: alloc.bin_code || "",

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
        FROM sales_order_addresses
        WHERE sales_order_id=$1`,
      [id],
    );

    return {
      order: orderResult.rows[0],
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
  ): Promise<SalesOrder> {
    const payload = SalesOrderPayloadSchema.parse(
      rawPayload,
    ) as SalesOrderPayload;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const order = payload.order;

      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_order"],
      );
      const orderNo = seqResult.rows[0].code;

      const customerResult = await client.query(
        `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
        [order.customer_id, companyId],
      );
      if (!customerResult.rows.length) throw new Error("Customer not found");

      const customerPostingGroupId =
        order.customer_posting_group_id || order.sales_posting_group_id || null;

      const vatBusinessPostingGroupId =
        order.vat_business_posting_group_id || null;

      const orderResult = await client.query(
        `
          INSERT INTO sales_orders (
            company_id,
            order_no,

            customer_id,
            customer_no,
            customer_name,

            bill_to_customer_id,
            bill_to_customer_no,
            bill_to_customer_name,

            salesperson,
            cust_order_no,
            link_to_po,

            currency_id,
            exchange_rate,

            order_date,
            requested_delivery_date,
            shipment_date,
            posting_date,
            due_date,

            reference,

            payable_bank,
            payable_bank_id,

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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, NOW()
          )
          RETURNING *;
        `,
        [
          companyId,
          orderNo,

          order.customer_id,
          order.customer_no,
          order.customer_name,

          order.bill_to_customer_id,
          order.bill_to_customer_no,
          order.bill_to_customer_name,

          order.salesperson,
          order.cust_order_no,
          order.link_to_po,

          order.currency_id,
          order.exchange_rate,

          order.order_date || null,
          order.requested_delivery_date || null,
          order.shipment_date || null,
          order.posting_date?.trim() ? order.posting_date : null,
          order.due_date || null,

          order.reference,

          order.payable_bank,
          order.payable_bank_id,

          order.payment_terms_id,
          order.payment_method_id,

          order.contact,
          order.book_in_phone,
          order.book_in_contact,
          order.book_in_email,

          order.shipment_method_id,
          order.shipping_agent,
          order.shipment_ref_no,
          order.warehouse_ref_no,

          order.reason,

          order.notes,
          order.internal_notes,

          order.subtotal,
          order.vat_amount,
          order.total_amount,

          order.status,
          order.anonymous_customer,

          customerPostingGroupId,
          vatBusinessPostingGroupId,
        ],
      );

      const createdOrder = orderResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        const entriesWithUndefined = Object.entries(line).map(
          ([key, value]) => [key, value === null ? undefined : value],
        );

        const sanitizedLine = Object.fromEntries(
          entriesWithUndefined,
        ) as SalesOrderLine;

        await this.insertLine(
          client,
          companyId,
          createdOrder.id,
          sanitizedLine,
          lineNo,
        );
        lineNo += 10000;
      }

      if (payload.primary_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.primary_address,
          companyId,
        );
      }
      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.shipping_address,
          companyId,
        );
      }

      await client.query("COMMIT");
      return createdOrder;
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
  ): Promise<
    { id: string; item_id: string; warehouse_id: string; line_no: number }[]
  > {
    const payload = SalesOrderPayloadSchema.parse(
      rawPayload,
    ) as SalesOrderPayload;

    const order = payload.order;

    const existingResult = await client.query(
      `SELECT status FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!existingResult.rows.length) throw new Error("Sales order not found");
    if (existingResult.rows[0].status === "posted") {
      throw new Error("Posted sales order cannot be modified");
    }

    const customerPostingGroupId =
      order.customer_posting_group_id || order.sales_posting_group_id || null;

    const vatBusinessPostingGroupId =
      order.vat_business_posting_group_id || null;

    await client.query(
      `
        UPDATE sales_orders
          SET

          customer_id=$1,
          customer_no=$2,
          customer_name=$3,

          bill_to_customer_id=$4,
          bill_to_customer_no=$5,
          bill_to_customer_name=$6,

          salesperson=$7,
          cust_order_no=$8,
          link_to_po=$9,

          currency_id=$10,
          exchange_rate=$11,

          order_date=$12,
          requested_delivery_date=$13,
          shipment_date=$14,
          posting_date=$15,
          due_date=$16,

          reference=$17,

          payable_bank=$18,
          payable_bank_id=$19,

          payment_terms_id=$20,
          payment_method_id=$21,

          contact=$22,
          book_in_phone=$23,
          book_in_contact=$24,
          book_in_email=$25,

          shipment_method_id=$26,
          shipping_agent=$27,
          shipment_ref_no=$28,
          warehouse_ref_no=$29,

          reason=$30,

          notes=$31,
          internal_notes=$32,

          subtotal=$33,
          vat_amount=$34,
          total_amount=$35,

          status=$36,

          anonymous_customer=$37,

          customer_posting_group_id=$38,
          vat_business_posting_group_id=$39,

          updated_at=NOW()

          WHERE id=$40 AND company_id=$41;
        `,
      [
        order.customer_id,
        order.customer_no,
        order.customer_name,

        order.bill_to_customer_id,
        order.bill_to_customer_no,
        order.bill_to_customer_name,

        order.salesperson,
        order.cust_order_no,
        order.link_to_po,

        order.currency_id,
        order.exchange_rate,

        order.order_date || null,
        order.requested_delivery_date || null,
        order.shipment_date || null,
        order.posting_date?.trim() ? order.posting_date : null,
        order.due_date || null,

        order.reference,

        order.payable_bank,
        order.payable_bank_id,

        order.payment_terms_id,
        order.payment_method_id,

        order.contact,
        order.book_in_phone,
        order.book_in_contact,
        order.book_in_email,

        order.shipment_method_id,
        order.shipping_agent,
        order.shipment_ref_no,
        order.warehouse_ref_no,

        order.reason,

        order.notes,
        order.internal_notes,

        order.subtotal,
        order.vat_amount,
        order.total_amount,

        order.status,
        order.anonymous_customer,

        customerPostingGroupId,
        vatBusinessPostingGroupId,

        id,
        companyId,
      ],
    );

    // Soft delete unlinked line entries
    const existingLinesResult = await client.query(
      `SELECT id FROM sales_order_lines WHERE sales_order_id = $1 AND is_deleted = false`,
      [id],
    );
    const existingLineIds = existingLinesResult.rows.map((x) => x.id);
    const incomingLineIds = payload.lines.map((x) => x.id).filter(Boolean);

    for (const existingId of existingLineIds) {
      if (!incomingLineIds.includes(existingId)) {
        await client.query(
          `UPDATE sales_order_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
          [existingId],
        );
      }
    }

    let lineNo = 10000;
    for (const line of payload.lines) {
      if (line.id) {
        await client.query(
          `
            UPDATE sales_order_lines
            SET
              line_type = $1, item_id = $2, gl_account_id = $3, description = $4,
              warehouse_id = $5, uom_id = $6, quantity = $7,
              unit_price = $8, discount_type = $9, discount_value = $10, discount_amount = $11,
              vat_percent = $12, vat_amount = $13, net_amount = $14, gross_amount = $15,
              line_no = $16, updated_at = NOW()
            WHERE id = $17
            `,
          [
            line.line_type,
            line.item_id,
            line.gl_account_id,
            line.description,
            line.warehouse_id,
            line.uom_id,
            line.quantity,
            line.unit_price,
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
        ) as SalesOrderLine;

        await this.insertLine(client, companyId, id, sanitizedLine, lineNo);
      }
      lineNo += 10000;
    }

    await client.query(
      `DELETE FROM sales_order_addresses WHERE sales_order_id = $1`,
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
      `SELECT id, item_id, warehouse_id, line_no FROM sales_order_lines 
       WHERE sales_order_id = $1 AND is_deleted = false ORDER BY line_no`,
      [id],
    );

    return finalLines.rows;
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT status FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!existing.rows.length) throw new Error("Sales order not found");
    if (
      existing.rows[0].status === "shipped" ||
      existing.rows[0].status === "partial_shipped"
    ) {
      throw new Error(
        "Cannot delete document shell while historical ledger entries remain linked.",
      );
    }

    const result = await pool.query(
      `DELETE FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount) throw new Error("Sales order not found");
  }

  /**
   * CANCEL SALES ORDER
   */
  static async cancel(client: PoolClient, orderId: string) {
    await SalesOrderStatusService.cancel(client, orderId);
  }

  static async post(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT status, is_posted FROM sales_orders WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );

      if (!result.rows.length) throw new Error("Sales order not found");
      if (result.rows[0].is_posted)
        throw new Error("Sales order already posted");

      await client.query(
        `UPDATE sales_orders SET is_posted = true, posted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async insertLine(
    client: PoolClient,
    companyId: string,
    salesOrderId: string,
    line: SalesOrderLine,
    lineNo: number,
  ): Promise<void> {
    await client.query(
      `
    INSERT INTO sales_order_lines (
      company_id,
      sales_order_id,

      line_no,
      line_type,

      item_id,
      gl_account_id,

      description,

      warehouse_id,

      uom_id,

      quantity,
      quantity_shipped,

      unit_price,

      discount_type,
      discount_value,
      discount_amount,

      vat_percent,
      vat_amount,

      net_amount,
      gross_amount,

      is_deleted,

      created_at
    )
    VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,
      $17,$18,$19,
      false,
      NOW()
    )
    `,
      [
        companyId,
        salesOrderId,
        lineNo,
        line.line_type,
        line.item_id || null,
        line.gl_account_id || null,
        line.description || null,
        line.warehouse_id || null,
        line.uom_id || null,
        line.quantity || 0,
        line.quantity_shipped || 0,
        line.unit_price || 0,
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
    salesOrderId: string,
    address: SalesOrderAddress,
    companyId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO sales_order_addresses
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
        salesOrderId,
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

  static async recalculateStatus(
    client: PoolClient,
    salesOrderId: string,
  ): Promise<void> {
    // COALESCE(cancelled_quantity, 0) as cancelled_quantity
    const result = await client.query(
      `
      SELECT quantity, quantity_shipped, 0 as cancelled_quantity
      FROM sales_order_lines
      WHERE sales_order_id = $1 AND is_deleted = false AND line_type = 'ITEM'
      `,
      [salesOrderId],
    );

    const lines = result.rows;
    if (!lines.length) return;

    let fullyShipped = true;
    let partiallyShipped = false;

    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const shipped =
        Number(line.quantity_shipped || 0) + Number(line.cancelled_quantity);

      if (shipped > 0) partiallyShipped = true;
      if (shipped < qty) fullyShipped = false;
    }

    const status = fullyShipped
      ? "shipped"
      : partiallyShipped
        ? "partial_shipped"
        : "open";

    await client.query(
      `UPDATE sales_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, salesOrderId],
    );
  }

  static async updateShippedQuantity(
    client: PoolClient,
    salesOrderLineId: string,
    shippedQty: number,
  ): Promise<void> {
    await client.query(
      `
      UPDATE sales_order_lines
      SET
        quantity_shipped =
          COALESCE(quantity_shipped, 0) + $1,

        remaining_quantity =
          quantity - (
            COALESCE(quantity_shipped, 0)
            + $1
          ),

        updated_at = NOW()

      WHERE id = $2
      `,
      [shippedQty, salesOrderLineId],
    );
  }

  // + COALESCE(cancelled_quantity, 0)

  static async saveLineAllocations(
    client: PoolClient,
    companyId: string,
    salesOrderId: string,
    salesOrderLineId: string,
    itemId: string,
    warehouseId: string,
    initialAllocations: SO_StockAllocationRecord[],
  ): Promise<void> {
    // 1. Lock check: If stock has already been shipped on this line, protect allocations from deletion/modification
    const lineCheck = await client.query(
      `
      SELECT COALESCE(quantity_shipped, 0) AS quantity_shipped
      FROM sales_order_lines
      WHERE id = $1 AND company_id = $2
      `,
      [salesOrderLineId, companyId],
    );

    const shippedQty = Number(lineCheck.rows[0]?.quantity_shipped || 0);

    if (shippedQty > 0) {
      // Stock is already shipped against this line; skip allocation modifications to keep existing records intact
      return;
    }

    // 2. Clear existing pre-shipment allocations for unshipped lines
    await client.query(
      `
      DELETE FROM inventory_allocations
      WHERE sales_order_line_id = $1 AND company_id = $2
      `,
      [salesOrderLineId, companyId],
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
          sales_order_line_id,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'FIFO', 'ACTIVE')
        `,
        [
          companyId,
          null,
          null,
          salesOrderLineId,
          itemId,
          warehouseId,
          alloc.location_id || null,
          alloc.batch_no || null,
          alloc.serial_no || null,
          alloc.expiry_date === "" ? null : alloc.expiry_date || null,
          Number(alloc.quantity) || 0,
          0,
          0,
        ],
      );
    }
  }

  private static validatePayload(payload: SalesOrderPayload): void {
    const order = payload.order;

    if (!order.customer_id) {
      throw new Error("Customer is required");
    }

    if (!order.order_date) {
      throw new Error("Order date is required");
    }

    if (!payload.lines.length) {
      throw new Error("At least one line is required");
    }

    payload.lines.forEach((line, index) => {
      const row = index + 1;

      if (!line.line_type) {
        throw new Error(`Line ${row}: line type is required`);
      }

      switch (line.line_type) {
        case "ITEM":
          if (!line.item_id) {
            throw new Error(`Line ${row}: item is required`);
          }

          if (!line.uom_id) {
            throw new Error(`Line ${row}: UOM is required`);
          }

          if (Number(line.quantity) <= 0) {
            throw new Error(`Line ${row}: quantity must be greater than zero`);
          }

          if (Number(line.unit_price) < 0) {
            throw new Error(`Line ${row}: invalid unit price`);
          }

          break;

        case "GL_ACCOUNT":
          if (!line.gl_account_id) {
            throw new Error(`Line ${row}: GL account is required`);
          }

          if (Number(line.quantity) <= 0) {
            throw new Error(`Line ${row}: quantity must be greater than zero`);
          }

          if (Number(line.unit_price) < 0) {
            throw new Error(`Line ${row}: invalid amount`);
          }

          break;

        case "COMMENT":
          break;

        default:
          throw new Error(`Line ${row}: invalid line type`);
      }
    });

    if (!payload.billing_address) {
      throw new Error("Billing address is required");
    }

    if (!payload.shipping_address) {
      throw new Error("Shipping address is required");
    }
  }

  public static async recalculateTotals(
    client: PoolClient,
    salesOrderId: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE sales_orders
      SET
        subtotal = totals.subtotal,
        vat_amount = totals.vat_amount,
        total_amount = totals.total_amount,
        updated_at = NOW()
      FROM (
        SELECT
          COALESCE(SUM(net_amount), 0) AS subtotal,
          COALESCE(SUM(vat_amount), 0) AS vat_amount,
          COALESCE(SUM(gross_amount), 0) AS total_amount
        FROM sales_order_lines
        WHERE sales_order_id = $1
          AND is_deleted = false
      ) totals
      WHERE sales_orders.id = $1
      `,
      [salesOrderId],
    );
  }
}
