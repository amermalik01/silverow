// lib/services/purchase-invoices/purchase-invoice.service.ts

import type { QueryResultRow } from "pg";

import { pool } from "@/lib/db";
import type { FetchParams, FetchResponse } from "@/types/table";
import type { PurchaseInvoice } from "@/types/purchase-invoice";
import type { PurchaseOrderAddress } from "@/types/purchase-order";

interface InvoiceListRow extends QueryResultRow {
  id: string;
  company_id: string;
  purchase_order_id: string;
  supplier_id: string;
  pay_to_supplier_id: string;
  invoice_date: string | null;
  invoice_code: string | null;
  order_code: string;
  supp_order_no: string | null;
  status: string;
  is_posted: boolean;
  is_invoiced: boolean;
}

interface InvoiceHeaderRow extends QueryResultRow {
  id: string;
  company_id: string;
  purchase_invoice_no: string | null;
  supplier_invoice_no: string | null;
  invoice_status: string | null;
  supplier_id: string;
}

const SORT_FIELDS: Record<string, string> = {
  invoice_date: "po.invoice_date",
  posting_date: "po.posting_date",
  order_date: "po.order_date",
  invoice_code: "po.purchase_invoice_no",
  order_code: "po.order_no",
  supp_order_no: "po.supplier_invoice_no",
  reference: "po.reference",
  supplier_no: "COALESCE(po.supplier_no, p.supplier_code)",
  supplier_name: "COALESCE(po.supplier_name, p.name)",
  sell_to_city: "poa.city",
  srm_purchase_code: "COALESCE(po.purchaser, '')",
  crcode: "c.code",
  current_stage: "cos.name",
  net_amount: "po.subtotal",
  tax_amount: "COALESCE(po.vat_amount, po.tax_amount)",
  grand_total: "po.total_amount",
  due_date: "po.due_date",
  status: "po.invoice_status",
};

export class PurchaseInvoiceService {
  /* ================================================================
     1. PURCHASE INVOICE LISTING
  ================================================================= */

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<PurchaseInvoice>> {
    const page = Math.max(1, Number(params.page) || 1);

    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const offset = (page - 1) * pageSize;

    const filters = params.filters ?? {};

    const search =
      typeof params.search === "string" ? params.search.trim() : "";

    const sortBy = params.sortBy;

    const sortOrder =
      params.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy]
        ? SORT_FIELDS[sortBy]
        : "po.purchase_invoice_no";

    const queryValues: unknown[] = [companyId];

    const whereClauses: string[] = [
      "po.company_id = $1",
      "COALESCE(po.is_invoiced, false) = true",
      "COALESCE(po.is_posted, false) = true",
      "po.purchase_invoice_no IS NOT NULL",
    ];

    /* ============================================================
       GLOBAL SEARCH
    ============================================================ */

    if (search) {
      queryValues.push(`%${search}%`);

      const searchParam = `$${queryValues.length}`;

      whereClauses.push(`
        (
          po.purchase_invoice_no ILIKE ${searchParam}
          OR po.supplier_invoice_no ILIKE ${searchParam}
          OR po.order_no ILIKE ${searchParam}
          OR po.supplier_no ILIKE ${searchParam}
          OR po.supplier_name ILIKE ${searchParam}
          OR p.name ILIKE ${searchParam}
          OR p.supplier_code ILIKE ${searchParam}
          OR po.reference ILIKE ${searchParam}
          OR po.purchaser ILIKE ${searchParam}
          OR c.code ILIKE ${searchParam}
        )
      `);
    }

    /* ============================================================
       DYNAMIC FILTERS
    ============================================================ */

    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (
        filter.value !== undefined &&
        filter.value !== null &&
        filter.value !== ""
      ) {
        const value = String(filter.value);

        switch (colKey) {
          case "crcode":
          case "currency":
            queryValues.push(value);
            whereClauses.push(`c.code = $${queryValues.length}`);
            break;

          case "current_stage":
          case "stage_name":
            queryValues.push(value);
            whereClauses.push(`cos.name ILIKE $${queryValues.length}`);
            break;

          case "status":
            queryValues.push(value);
            whereClauses.push(`po.invoice_status = $${queryValues.length}`);
            break;

          case "invoice_code":
          case "purchase_invoice_no":
            queryValues.push(`%${value}%`);
            whereClauses.push(
              `po.purchase_invoice_no ILIKE $${queryValues.length}`,
            );
            break;

          case "supp_order_no":
          case "supplier_invoice_no":
            queryValues.push(`%${value}%`);
            whereClauses.push(
              `po.supplier_invoice_no ILIKE $${queryValues.length}`,
            );
            break;

          case "order_code":
          case "order_no":
            queryValues.push(`%${value}%`);
            whereClauses.push(`po.order_no ILIKE $${queryValues.length}`);
            break;

          case "supplier_no":
            queryValues.push(`%${value}%`);
            whereClauses.push(`
              COALESCE(po.supplier_no, p.supplier_code)
              ILIKE $${queryValues.length}
            `);
            break;

          case "supplier_name":
          case "sell_to_cust_name":
            queryValues.push(`%${value}%`);
            whereClauses.push(`
              COALESCE(po.supplier_name, p.name)
              ILIKE $${queryValues.length}
            `);
            break;

          case "reference":
            queryValues.push(`%${value}%`);
            whereClauses.push(`po.reference ILIKE $${queryValues.length}`);
            break;

          case "purchaser":
          case "srm_purchase_code":
            queryValues.push(`%${value}%`);
            whereClauses.push(`po.purchaser ILIKE $${queryValues.length}`);
            break;
        }
      }

      /* Date and numeric range filters */

      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);

        const idx = queryValues.length;

        switch (colKey) {
          case "invoice_date":
            whereClauses.push(`po.invoice_date >= $${idx}::date`);
            break;

          case "posting_date":
            whereClauses.push(`po.posting_date >= $${idx}::date`);
            break;

          case "due_date":
            whereClauses.push(`po.due_date >= $${idx}::date`);
            break;

          case "order_date":
            whereClauses.push(`po.order_date >= $${idx}::date`);
            break;

          case "net_amount":
            whereClauses.push(`po.subtotal >= $${idx}::numeric`);
            break;

          case "grand_total":
            whereClauses.push(`po.total_amount >= $${idx}::numeric`);
            break;
        }
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);

        const idx = queryValues.length;

        switch (colKey) {
          case "invoice_date":
            whereClauses.push(`po.invoice_date <= $${idx}::date`);
            break;

          case "posting_date":
            whereClauses.push(`po.posting_date <= $${idx}::date`);
            break;

          case "due_date":
            whereClauses.push(`po.due_date <= $${idx}::date`);
            break;

          case "order_date":
            whereClauses.push(`po.order_date <= $${idx}::date`);
            break;

          case "net_amount":
            whereClauses.push(`po.subtotal <= $${idx}::numeric`);
            break;

          case "grand_total":
            whereClauses.push(`po.total_amount <= $${idx}::numeric`);
            break;
        }
      }
    });

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    /* ============================================================
       SHARED JOINS

       LATERAL joins avoid duplicate invoice rows when an order
       has multiple address records of the same type.
    ============================================================ */

    const joinSql = `
      FROM purchase_orders po

      LEFT JOIN parties p
        ON p.id = po.supplier_id
       AND p.company_id = po.company_id

      LEFT JOIN currencies c
        ON c.id = po.currency_id

      LEFT JOIN shipment_method sm
        ON sm.id = po.shipment_method_id

      LEFT JOIN common_order_stages cos
        ON cos.id = po.stage_id
       AND cos.company_id = po.company_id

      LEFT JOIN LATERAL (
        SELECT
          a.address_1,
          a.address_2,
          a.city,
          a.county,
          a.postcode,
          a.country,
          a.contact_person,
          a.phone,
          a.email
        FROM purchase_order_addresses a
        WHERE a.purchase_order_id = po.id
          AND a.company_id = po.company_id
          AND a.address_type = 'primary'
        ORDER BY a.id
        LIMIT 1
      ) poa ON true

      LEFT JOIN LATERAL (
        SELECT
          a.address_1,
          a.address_2,
          a.city,
          a.county,
          a.postcode,
          a.country
        FROM purchase_order_addresses a
        WHERE a.purchase_order_id = po.id
          AND a.company_id = po.company_id
          AND a.address_type = 'shipping'
        ORDER BY a.id
        LIMIT 1
      ) ship_a ON true
    `;

    /* ============================================================
       COUNT QUERY
    ============================================================ */

    const countQuery = `
      SELECT COUNT(*)::text AS total
      ${joinSql}
      ${whereSql}
    `;

    const countResult = await pool.query<{ total: string }>(
      countQuery,
      queryValues,
    );

    const totalRecords = Number(countResult.rows[0]?.total ?? 0);

    /* ============================================================
       PAGINATED DATA QUERY
    ============================================================ */

    const dataQueryValues = [...queryValues, pageSize, offset];

    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT
        po.id,
        po.company_id,

        -- The PO itself is now the invoice document.
        po.id AS purchase_order_id,

        po.supplier_id,

        -- Invoice metadata
        po.invoice_date,
        po.posting_date,
        po.due_date,

        po.purchase_invoice_no AS invoice_code,

        po.order_date,
        po.order_no AS order_code,

        po.reference,
        po.supplier_no,
        COALESCE(po.supplier_name, p.name) AS supplier_name,

        po.supplier_invoice_no AS supp_order_no,

        po.previous_code AS prev_code,

        -- Supplier address
        poa.address_1 AS sell_to_address,
        poa.address_2 AS sell_to_address2,
        poa.city AS sell_to_city,
        poa.county AS sell_to_county,
        poa.postcode AS sell_to_post_code,
        poa.country AS country,
        poa.contact_person AS sell_to_contact_no,
        poa.phone AS cust_phone,
        poa.email AS cust_email,

        -- Purchasing metadata
        COALESCE(po.purchaser, '') AS srm_purchase_code,
        po.supplier_posting_group_id AS posting_grp,

        c.code AS crcode,
        cos.name AS current_stage,

        po.invoice_status AS status,
        po.is_invoiced,
        po.is_posted,

        -- Invoice financials
        COALESCE(po.subtotal, 0) AS net_amount,
        COALESCE(po.vat_amount, po.tax_amount, 0) AS tax_amount,
        COALESCE(po.total_amount, 0) AS grand_total,

        po.discount_amount,
        po.net_amount AS order_net_amount,

        -- Currency
        po.currency_id,
        po.exchange_rate,

        -- Dates
        po.req_receipt_date AS requested_delivery_date,
        po.receipt_date AS "receiptDate",

        -- Shipping
        po.shipping_agent,
        sm.name AS shipment_method,
        po.shipment_method_id,
        po.shipment_ref_no,
        po.warehouse_ref_no AS warehouse_booking_ref,
        po.consignment_no AS "consignmentNo",
        po.link_to_so_no AS "LinkToSo",

        -- Booking metadata
        po.book_in_contact,
        po.book_in_phone AS book_in_tel,
        po.book_in_email,

        po.purchaser_id,
        po.stage_id,

        po.notes,
        po.internal_notes

      ${joinSql}

      ${whereSql}

      ORDER BY
        ${orderByColumn} ${sortOrder} NULLS LAST,
        po.id DESC

      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query<InvoiceListRow>(
      dataQuery,
      dataQueryValues,
    );

    return {
      data: dataResult.rows as PurchaseInvoice[],
      totalRecords,
    };
  }

  /* ================================================================
     2. PURCHASE INVOICE DETAIL
  ================================================================= */

  static async get(companyId: string, id: string) {
    /* ============================================================
       A. FETCH INVOICE HEADER

       No purchase_invoices table.
       The invoice ID is the purchase_orders.id.
    ============================================================ */

    const invoiceResult = await pool.query<InvoiceHeaderRow>(
      `
          SELECT
            po.*,

            po.id AS purchase_order_id,

            COALESCE(
              po.purchase_invoice_no,
              po.order_no
            ) AS invoice_no,

            COALESCE(
              pt.name,
              po.payment_terms
            ) AS payment_terms,

            pm.name AS payment_method_name,

            sm.name AS shipment_method_name,

            COALESCE(
              po.supplier_name,
              p.name
            ) AS display_supplier_name,

            COALESCE(
              po.supplier_no,
              p.supplier_code
            ) AS display_supplier_no,

            c.code AS currency_code

          FROM purchase_orders po

          LEFT JOIN parties p
            ON p.id = po.supplier_id
           AND p.company_id = po.company_id

          LEFT JOIN currencies c
            ON c.id = po.currency_id

          LEFT JOIN payment_terms pt
            ON pt.id = po.payment_terms_id

          LEFT JOIN payment_method pm
            ON pm.id = po.payment_method_id

          LEFT JOIN shipment_method sm
            ON sm.id = po.shipment_method_id

          WHERE po.id = $1
            AND po.company_id = $2
            AND COALESCE(po.is_invoiced, false) = true
            AND COALESCE(po.is_posted, false) = true
        `,
      [id, companyId],
    );

    if (!invoiceResult.rows.length) {
      return null;
    }

    const purchaseInvoice = invoiceResult.rows[0];

    /* ============================================================
       B. FETCH INVOICE LINES

       Purchase invoice lines are now purchase order lines.

       The posting service marks invoiced_quantity when posting.
    ============================================================ */

    const linesResult = await pool.query(
      `
        SELECT
          pol.*,

          -- Compatibility aliases for existing invoice UI
          pol.id AS purchase_invoice_line_id,
          pol.id AS purchase_order_line_id,

          $1::uuid AS purchase_invoice_id,

          COALESCE(
            pol.invoiced_quantity,
            pol.quantity
          ) AS invoice_quantity,

          COALESCE(
            pol.invoiced_quantity,
            pol.quantity
          ) AS quantity,

          pol.unit_cost,

          pol.vat_percent AS tax_percent,
          pol.vat_amount AS tax_amount,

          pol.net_amount,
          pol.gross_amount,

          pol.warehouse_id,

          pol.warehouse_location_id AS location_id,

          -- GL account
          gl.code AS account_code,
          gl.name AS account_name,

          -- Item metadata
          COALESCE(
            pol.item_code,
            i.item_code
          ) AS item_code,

          COALESCE(
            pol.item_name,
            i.name
          ) AS item_name,

          COALESCE(
            pol.uom_id,
            i.base_uom_id
          ) AS uom_id,

          u.name AS uom_name,

          -- Warehouse metadata
          w.code AS warehouse_code,
          w.name AS warehouse_name,

          wl.code AS location_code,
          wl.title AS location_name,

          -- Quantities
          COALESCE(pol.received_quantity, 0)
            AS received_quantity,

          COALESCE(pol.cancelled_quantity, 0)
            AS cancelled_quantity,

          (
            pol.quantity -
            COALESCE(pol.received_quantity, 0)
          ) AS remaining_quantity

        FROM purchase_order_lines pol

        LEFT JOIN items i
          ON i.id = pol.item_id
         AND i.company_id = $2

        LEFT JOIN chart_of_accounts gl
          ON gl.id = pol.gl_account_id
         AND gl.company_id = $2

        LEFT JOIN warehouses w
          ON w.id = pol.warehouse_id
         AND w.company_id = $2

        LEFT JOIN warehouse_locations wl
          ON wl.id = pol.warehouse_location_id
         AND wl.warehouse_id = pol.warehouse_id

        LEFT JOIN uoms u
          ON u.id = pol.uom_id
         AND u.company_id = $2

        WHERE pol.purchase_order_id = $1
          AND pol.company_id = $2
          AND COALESCE(pol.is_deleted, false) = false
          AND (
            pol.line_type IN ('ITEM', 'GL_ACCOUNT')
            OR (
              pol.line_type IS NULL
              AND (
                pol.item_id IS NOT NULL
                OR pol.gl_account_id IS NOT NULL
              )
            )
          )

        ORDER BY pol.line_no ASC, pol.id ASC
      `,
      [id, companyId],
    );

    /* ============================================================
       C. FETCH INVENTORY ALLOCATIONS

       Direct relationship:
       inventory_allocations.purchase_order_line_id
       -> purchase_order_lines.id
    ============================================================ */

    const allocationsResult = await pool.query(
      `
        SELECT
          ia.id,

          ia.purchase_order_line_id,

          ia.item_id,
          ia.warehouse_id,

          ia.warehouse_location_id AS location_id,

          wl.title AS location_name,

          ia.allocated_quantity AS quantity,

          ia.unit_cost,
          ia.total_cost,

          ia.batch_no,
          ia.bin_code,
          ia.serial_no,

          TO_CHAR(
            ia.expiry_date,
            'YYYY-MM-DD'
          ) AS expiry_date,

          TO_CHAR(
            ia.date_received,
            'YYYY-MM-DD'
          ) AS date_received,

          TO_CHAR(
            ia.prod_date,
            'YYYY-MM-DD'
          ) AS prod_date

        FROM inventory_allocations ia

        INNER JOIN purchase_order_lines pol
          ON pol.id = ia.purchase_order_line_id
         AND pol.company_id = ia.company_id

        LEFT JOIN warehouse_locations wl
          ON wl.id = ia.warehouse_location_id
         AND wl.warehouse_id = ia.warehouse_id

        WHERE pol.purchase_order_id = $1
          AND pol.company_id = $2
          AND ia.company_id = $2
          AND ia.status = 'ACTIVE'
          AND ia.source_allocation_id IS NULL
          AND ia.sales_order_line_id IS NULL

        ORDER BY ia.created_at ASC, ia.id ASC
      `,
      [id, companyId],
    );

    /* ============================================================
       D. MAP ALLOCATIONS TO INVOICE LINES
    ============================================================ */

    const allocationsByLine = new Map<string, typeof allocationsResult.rows>();

    for (const allocation of allocationsResult.rows) {
      const lineId = String(allocation.purchase_order_line_id);

      const existing = allocationsByLine.get(lineId) ?? [];

      existing.push(allocation);

      allocationsByLine.set(lineId, existing);
    }

    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsByLine.get(String(line.id)) ?? [];

      const mappedAllocations = lineAllocations.map((allocation) => ({
        date_received: allocation.date_received || "",

        prod_date: allocation.prod_date || "",

        expiry_date: allocation.expiry_date || "",

        batch_no: allocation.batch_no || "",

        serial_no: allocation.serial_no || "",

        bin_code: allocation.bin_code || "",

        location_id: allocation.location_id || "",

        location_name: allocation.location_name || "",

        quantity: Number(allocation.quantity) || 0,
      }));

      const allocatedQuantity = mappedAllocations.reduce(
        (sum, allocation) => sum + allocation.quantity,
        0,
      );

      const invoiceQuantity = Number(
        line.invoice_quantity ?? line.quantity ?? 0,
      );

      return {
        ...line,

        allocations: mappedAllocations,

        initialAllocations: mappedAllocations,

        is_allocated:
          mappedAllocations.length > 0 &&
          Math.abs(allocatedQuantity - invoiceQuantity) < 0.000001,
      };
    });

    /* ============================================================
       E. FETCH PURCHASE ORDER ADDRESSES
    ============================================================ */

    const addressResult = await pool.query<PurchaseOrderAddress>(
      `
          SELECT
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

          FROM purchase_order_addresses

          WHERE purchase_order_id = $1
            AND company_id = $2

          ORDER BY id
        `,
      [id, companyId],
    );

    const addressRows = addressResult.rows;

    /* ============================================================
       F. RETURN INVOICE
    ============================================================ */

    return {
      invoice: purchaseInvoice,

      lines: linesWithAllocations,

      primary_address:
        addressRows.find((address) => address.address_type === "primary") ||
        null,

      billing_address:
        addressRows.find((address) => address.address_type === "billing") ||
        null,

      shipping_address:
        addressRows.find((address) => address.address_type === "shipping") ||
        null,
    };
  }
}

/* import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import { PurchaseInvoice } from "@/types/purchase-invoice";
import { PurchaseOrderAddress } from "@/types/purchase-order";

export class PurchaseInvoiceService {
  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<PurchaseInvoice>> {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy,
      sortOrder = "DESC",
    } = params;
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      invoice_date: "pi.invoice_date",
      order_date: "po.order_date",
      invoice_code: "pi.invoice_no",
      order_code: "po.order_no",
      supp_order_no: "pi.supplier_invoice_no",
      reference: "po.reference",
      supplier_no: "po.supplier_no",
      supplier_name: "po.supplier_name",
      sell_to_city: "poa.city",
      srm_purchase_code: "COALESCE(po.purchaser, '')",
      crcode: "c.code",
      current_stage: "cos.name",
      net_amount: "pi.subtotal",
      tax_amount: "pi.tax_amount",
      grand_total: "pi.total_amount",
      due_date: "pi.due_date",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "pi.invoice_no";
    const orderDirection = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = ["pi.company_id = $1"];

    // Dynamic Filters
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "crcode") {
          queryValues.push(String(filter.value));
          whereClauses.push(`c.code = $${queryValues.length}`);
        } else if (colKey === "current_stage") {
          queryValues.push(String(filter.value));
          whereClauses.push(`cos.name = $${queryValues.length}`);
        } else if (colKey === "status") {
          queryValues.push(String(filter.value));
          whereClauses.push(`pi.status::text = $${queryValues.length}`);
        } else if (colKey === "invoice_code") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`pi.invoice_no ILIKE $${queryValues.length}`);
        } else if (colKey === "order_code") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`po.order_no ILIKE $${queryValues.length}`);
        } else if (colKey === "sell_to_cust_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`p.name ILIKE $${queryValues.length}`);
        }
      }

      if (filter.from !== undefined && filter.from !== "") {
        queryValues.push(filter.from);
        const idx = queryValues.length;
        if (colKey === "invoice_date")
          whereClauses.push(`pi.invoice_date >= $${idx}::date`);
        if (colKey === "order_date")
          whereClauses.push(`po.order_date >= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`pi.subtotal >= $${idx}::numeric`);
      }

      if (filter.to !== undefined && filter.to !== "") {
        queryValues.push(filter.to);
        const idx = queryValues.length;
        if (colKey === "invoice_date")
          whereClauses.push(`pi.invoice_date <= $${idx}::date`);
        if (colKey === "order_date")
          whereClauses.push(`po.order_date <= $${idx}::date`);
        if (colKey === "net_amount")
          whereClauses.push(`pi.subtotal <= $${idx}::numeric`);
      }
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Base Joins targeting purchase_order_addresses via pi.purchase_order_id
    const joinSql = `
      FROM purchase_invoices pi
      
      LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
      LEFT JOIN currencies c ON c.id = pi.currency_id
      LEFT JOIN shipment_method sm ON sm.id = po.shipment_method_id
      LEFT JOIN common_order_stages cos 
             ON cos.company_id = pi.company_id 
            AND cos.stage_type = 'purchase_invoice' 
            AND cos.name ILIKE pi.status::text
      LEFT JOIN purchase_order_addresses poa 
             ON poa.purchase_order_id = pi.purchase_order_id 
            AND poa.address_type = 'primary'
      LEFT JOIN purchase_order_addresses ship_a 
             ON ship_a.purchase_order_id = pi.purchase_order_id 
            AND ship_a.address_type = 'shipping'
    `;



    // Count Query
    const countQuery = `SELECT COUNT(DISTINCT pi.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Data Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (pi.id, ${orderByColumn})
        pi.id,
        pi.company_id,
        pi.purchase_order_id,
        pi.supplier_id,
        pi.invoice_date,
        po.order_date,
        pi.invoice_no AS invoice_code,
        po.order_no AS order_code,
        po.reference,
        po.supplier_no,
        po.supplier_name,
        pi.supplier_invoice_no AS supp_order_no,
        po.previous_code AS prev_code,
        
        -- Supplier Address Details (from purchase_order_addresses)
        poa.address_1 AS sell_to_address,
        poa.address_2 AS sell_to_address2,
        poa.city AS sell_to_city,
        poa.county AS sell_to_county,
        poa.postcode AS sell_to_post_code,
        poa.country AS country,
        poa.contact_person AS sell_to_contact_no,
        poa.phone AS cust_phone,
        poa.email AS cust_email,

        COALESCE(po.purchaser, '') AS srm_purchase_code,
        po.supplier_posting_group_id AS posting_grp,
        c.code AS crcode,
        cos.name AS current_stage,
        pi.status,
        
        -- Amounts
        pi.subtotal AS net_amount,
        pi.tax_amount,
        pi.total_amount AS grand_total,

        -- Dates & Shipping
        pi.due_date,
        po.req_receipt_date AS requested_delivery_date,
        po.receipt_date AS "receiptDate",
        po.shipping_agent,
        sm.name AS shipment_method,

        -- Shipping Address Details (from purchase_order_addresses)
        ship_a.address_1 AS ship_to_address,
        ship_a.address_2 AS ship_to_address2,
        ship_a.city AS ship_to_city,
        ship_a.county AS ship_to_county,
        ship_a.postcode AS ship_to_post_code,

        -- Booking / Warehouse Metadata from PO
        po.book_in_contact,
        po.book_in_phone AS book_in_tel,
        po.book_in_email,
        po.warehouse_ref_no AS warehouse_booking_ref,
        po.consignment_no AS "consignmentNo",
        po.link_to_so_no AS "LinkToSo"

      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }

  static async get(companyId: string, id: string) {
    // 1. Fetch Purchase Invoice metadata joined with Purchase Order and lookup tables
    const invoiceResult = await pool.query(
      `
      SELECT 
        pi.*,
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method,
        po.supplier_no,
        po.supplier_id,
        po.supplier_name,

        po.pay_to_supplier_id,
        po.pay_to_supplier_no,
        po.pay_to_supplier_name,
        
        po.currency_id,
        po.supp_order_no,
        po.order_no AS purchase_order_no,
        po.order_date AS purchase_order_date,
        po.req_receipt_date,
        po.receipt_date,
        po.invoice_date,
        po.due_date,
        po.payable_bank,
        po.payable_bank_id,
        po.payment_terms,
        po.payment_method_id,
        po.shipping_agent,
        po.consignment_no,
        po.link_to_so_no,
        po.book_in_contact,
        po.book_in_phone,
        po.book_in_email,
        po.purchaser,
        po.shipment_ref_no,
        po.warehouse_ref_no,
        po.anonymous_supplier,
        po.vat_business_posting_group_id,
        po.supplier_posting_group_id,

        po.previous_code,
        po.link_to_cust,
        po.deduct_from_rebate,
        po.contact,
        po.shipment_method_id,

        po.shipment_po_not_req,
        po.reason,
        po.is_invoiced,
        po.linked_po,
        po.internal_notes,

        po.expected_date,
        po.reference,
        po.notes,
        po.is_posted,
        po.posted_at,
        po.exchange_rate,

        po.payment_terms_id,
        po.purchaser_id,
        po.location_id,
        
        c.code AS currency_code,
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method

      FROM purchase_invoices pi
      LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id AND po.company_id = $2
      LEFT JOIN currencies c ON c.id = pi.currency_id
      LEFT JOIN payment_terms pt ON pt.id = po.payment_terms_id
      LEFT JOIN payment_method pm ON pm.id = po.payment_method_id
      LEFT JOIN shipment_method sm ON sm.id = po.shipment_method_id

      WHERE pi.id = $1 AND pi.company_id = $2
      `,
      [id, companyId],
    );

    if (!invoiceResult.rows.length) return null;

    const purchaseInvoice = invoiceResult.rows[0];

    // 2. Fetch Purchase Invoice Lines joined with PO Lines, Items, Accounts, Warehouses & UOMs
    const linesResult = await pool.query(
      `
      SELECT 
        pil.id AS purchase_invoice_line_id,
        pil.id,
        pil.purchase_invoice_id,
        pil.line_no,
        pil.purchase_order_line_id,
        pil.item_id,
        pil.description,
        pil.quantity,
        pil.unit_cost,
        pol.tax_percent,
        pol.tax_amount,
        pol.net_amount,
        pol.gross_amount,
        COALESCE(pil.warehouse_id, pol.warehouse_id) AS warehouse_id,

        -- PO Line details & GL Account resolution
        pol.line_type,
        pol.gl_account_id,
        pol.account_code,
        gl.name AS account_name,
        pol.warehouse_location_id,
        pol.discount_type,
        pol.discount_value,
        pol.discount_amount,
        pol.original_amount,
        pol.vat_business_posting_group_id,
        pol.vat_product_posting_group_id,
        pol.vat_percent,
        pol.vat_amount,

        -- Metadata fallbacks
        COALESCE(pol.item_code, i.item_code) AS item_code,
        COALESCE(pol.item_name, i.name) AS item_name,
        COALESCE(pol.uom_id, i.base_uom_id) AS uom_id,
        COALESCE(pol.uom_name, u.name) AS uom_name,
        COALESCE(pol.warehouse_name, w.name) AS warehouse_name,
        pol.received_quantity,
        (pol.quantity - COALESCE(pol.received_quantity, 0)) AS remaining_quantity

      FROM purchase_invoice_lines pil
      LEFT JOIN purchase_order_lines pol ON pol.id = pil.purchase_order_line_id AND pol.company_id = $2
      LEFT JOIN items i ON i.id = pil.item_id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON gl.id = pol.gl_account_id AND gl.company_id = $2
      LEFT JOIN warehouses w ON w.id = COALESCE(pil.warehouse_id, pol.warehouse_id) AND w.company_id = $2
      LEFT JOIN uoms u ON u.id = pol.uom_id AND u.company_id = $2

      WHERE pil.purchase_invoice_id = $1 AND pil.company_id = $2
      ORDER BY pil.line_no ASC
      `,
      [id, companyId],
    );

    // 3. Fetch allocations using purchase_invoice_lines mapped to purchase_order_line_id
    const allocationsResult = await pool.query(
      `
      SELECT
        ia.id,
        ia.purchase_order_line_id,
        pil.id AS purchase_invoice_line_id,
        ia.item_id,
        ia.warehouse_id,
        ia.warehouse_location_id AS location_id,
        wl.title AS location_name,
        ia.allocated_quantity AS quantity,
        ia.batch_no,
        ia.bin_code,
        TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        TO_CHAR(ia.created_at, 'YYYY-MM-DD') AS date_received
      FROM inventory_allocations ia
      INNER JOIN purchase_invoice_lines pil ON pil.purchase_order_line_id = ia.purchase_order_line_id
      LEFT JOIN warehouse_locations wl ON wl.id = ia.warehouse_location_id
      WHERE pil.purchase_invoice_id = $1 AND ia.company_id = $2
      `,
      [id, companyId],
    );

    // 4. Map allocations correctly back to invoice lines
    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsResult.rows
        .filter(
          (alloc) =>
            alloc.purchase_invoice_line_id === line.id ||
            (line.purchase_order_line_id &&
              alloc.purchase_order_line_id === line.purchase_order_line_id),
        )
        .map((alloc) => ({
          date_received: alloc.date_received || "",
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

    // 5. Fetch Addresses from purchase_order_addresses using purchase_order_id
    let addressRows: PurchaseOrderAddress[] = [];
    if (purchaseInvoice.purchase_order_id) {
      const addressResult = await pool.query(
        `
        SELECT 
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
        FROM purchase_order_addresses
        WHERE purchase_order_id = $1 AND company_id = $2
        `,
        [purchaseInvoice.purchase_order_id, companyId],
      );
      addressRows = addressResult.rows;
    }

    return {
      invoice: purchaseInvoice,
      // lines: linesResult.rows,
      lines: linesWithAllocations,
      primary_address:
        addressRows.find((x) => x.address_type === "primary") || null,
      billing_address:
        addressRows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressRows.find((x) => x.address_type === "shipping") || null,
    };
  }
} */
