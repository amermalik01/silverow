// lib/services/purchase-invoices/purchase-invoice.service.ts

import { pool } from "@/lib/db";
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
      supplier_no: "pi.supplier_no",
      supplier_name: "pi.supplier_name",
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

    /* 
    LEFT JOIN parties p ON p.id = pi.supplier_id
    */

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
        pil.tax_percent,
        pil.tax_amount,
        pil.net_amount,
        pil.gross_amount,
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

        -- Metadata fallbacks
        COALESCE(pol.item_code, i.item_code) AS item_code,
        COALESCE(pol.item_name, i.name) AS item_name,
        COALESCE(pol.uom_id, i.base_uom_id) AS uom_id,
        COALESCE(pol.uom_name, u.name) AS uom_name,
        COALESCE(pol.warehouse_name, w.name) AS warehouse_name

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

    // 3. Fetch Addresses from purchase_order_addresses using purchase_order_id
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
      lines: linesResult.rows,
      primary_address:
        addressRows.find((x) => x.address_type === "primary") || null,
      billing_address:
        addressRows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressRows.find((x) => x.address_type === "shipping") || null,
    };
  }
}

/* import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import { PurchaseInvoice } from "@/types/purchase-invoice";

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
      sortOrder = "asc",
    } = params;
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      invoice_date: "pi.invoice_date",
      order_date: "po.order_date",
      invoice_code: "pi.invoice_no",
      order_code: "po.order_no",
      supp_order_no: "pi.supplier_invoice_no",
      supplier_no: "p.supplier_no",
      sell_to_cust_name: "p.name",
      sell_to_city: "pia.city",
      srm_purchase_code: "pi.purchaser",
      crcode: "c.code",
      current_stage: "cos.name",
      net_amount: "pi.subtotal",
      tax_amount: "pi.tax_amount",
      grand_total: "pi.total_amount",
      due_date: "pi.due_date",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "pi.invoice_date";
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

    // Base Joins cast pi.status::text safely to prevent type operator errors
    const joinSql = `
      FROM purchase_invoices pi
      LEFT JOIN parties p ON p.id = pi.supplier_id
      LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
      LEFT JOIN currencies c ON c.id = pi.currency_id
      LEFT JOIN shipment_method sm ON sm.id = pi.shipment_method_id
      LEFT JOIN common_order_stages cos 
             ON cos.company_id = pi.company_id 
            AND cos.stage_type = 'purchase_invoice' 
            AND cos.name ILIKE pi.status::text
      LEFT JOIN purchase_invoice_addresses pia 
             ON pia.purchase_invoice_id = pi.id 
            AND pia.address_type = 'primary'
      LEFT JOIN purchase_invoice_addresses ship_a 
             ON ship_a.purchase_invoice_id = pi.id 
            AND ship_a.address_type = 'shipping'
    `;

    // Count Query
    const countQuery = `SELECT COUNT(DISTINCT pi.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Data Query mapping legacy fields
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (pi.id, ${orderByColumn})
        pi.id,
        pi.invoice_date,
        po.order_date,
        pi.invoice_no AS invoice_code,
        po.order_no AS order_code,
        pi.supplier_invoice_no AS supp_order_no,
        pi.previous_code AS prev_code,
        pi.supplier_no AS supplier_no,
        p.name AS sell_to_cust_name,
        
        -- Supplier Address Details
        pia.address_1 AS sell_to_address,
        pia.address_2 AS sell_to_address2,
        pia.city AS sell_to_city,
        pia.county AS sell_to_county,
        pia.postcode AS sell_to_post_code,
        pia.country AS country,
        pia.contact_person AS sell_to_contact_no,
        pia.phone AS cust_phone,
        pia.email AS cust_email,

        pi.purchaser AS srm_purchase_code,
        pi.posting_group AS posting_grp,
        pi.segment,
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
        pi.receipt_date AS "receiptDate",
        pi.shipping_agent,
        sm.name AS shipment_method,

        -- Shipping Address Details
        ship_a.address_1 AS ship_to_address,
        ship_a.address_2 AS ship_to_address2,
        ship_a.city AS ship_to_city,
        ship_a.county AS ship_to_county,
        ship_a.postcode AS ship_to_post_code,

        -- Booking / Warehouse Metadata
        pi.book_in_contact,
        pi.book_in_phone AS book_in_tel,
        pi.book_in_email,
        pi.warehouse_booking_ref,
        pi.consignment_no AS "consignmentNo",
        pi.vat_posted AS "vatPosted",
        pi.link_to_so_no AS "LinkToSo"

      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}, pi.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }
} */
