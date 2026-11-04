// app/api/reports/posted-purchase-invoices-debit-notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

type NumericValue = number | string | null;

interface ReportDocument extends QueryResultRow {
  id: string;
  doc_type: "Invoice" | "Debit Note";
  doc_date: string | null;
  doc_no: string | null;
  order_no: string | null;
  supplier_no: string | null;
  supplier_name: string | null;
  supp_doc_no: string | null;
  city: string;
  currency_code: string | null;
  amount_lcy: NumericValue;
  amount_incl_vat_lcy: NumericValue;
  po_purchaser_id: string | null;
  supplier_id: string;
}

interface POLine extends QueryResultRow {
  id: string;
  parent_id: string;
  code: string;
  description: string | null;
  quantity: NumericValue;
  unit_cost: NumericValue;
  amount_lcy: NumericValue;
  amount_incl_vat_lcy: NumericValue;
}

interface DebitNoteLine extends QueryResultRow {
  id: string;
  parent_id: string;
  code: string;
  description: string | null;
  quantity: NumericValue;
  unit_cost: NumericValue;
  amount_lcy: NumericValue;
  amount_incl_vat_lcy: NumericValue;
}

interface ReportLine {
  id: string;
  code: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
}

interface ReportDocumentWithLines extends ReportDocument {
  lines?: ReportLine[];
}

const parseIdList = (value: string | null): string[] => {
  if (!value) return [];

  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

const toNumber = (value: NumericValue): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const startDate =
      searchParams.get("startDate") || searchParams.get("fromDate");

    const endDate = searchParams.get("endDate") || searchParams.get("toDate");

    const docType = searchParams.get("docType") || "Both";
    const viewMode = searchParams.get("viewMode") || "summary";

    const purchaserIds = parseIdList(searchParams.get("purchaserIds"));

    const supplierIds = parseIdList(searchParams.get("supplierIds"));

    const itemIds = parseIdList(searchParams.get("itemIds"));

    const glAccountIds = parseIdList(searchParams.get("glAccountIds"));

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: "'From Date' and 'To Date' parameters are required.",
        },
        { status: 400 },
      );
    }

    if (!["Both", "Invoices", "Debit Notes"].includes(docType)) {
      return NextResponse.json(
        { error: "Invalid document type." },
        { status: 400 },
      );
    }

    if (!["summary", "detailed"].includes(viewMode)) {
      return NextResponse.json(
        { error: "Invalid report view mode." },
        { status: 400 },
      );
    }

    const queryParams: (string | string[])[] = [companyId, startDate, endDate];

    let purchaserClause = "";
    let supplierClause = "";

    if (purchaserIds.length > 0) {
      queryParams.push(purchaserIds);

      purchaserClause = `
        AND combined_docs.po_purchaser_id =
          ANY($${queryParams.length}::uuid[])
      `;
    }

    if (supplierIds.length > 0) {
      queryParams.push(supplierIds);

      supplierClause = `
        AND combined_docs.supplier_id =
          ANY($${queryParams.length}::uuid[])
      `;
    }

    /*
     * Item and GL account filters are applied separately
     * to purchase order lines and debit note lines.
     */
    let invoiceLineExists = "";
    let debitNoteLineExists = "";

    if (itemIds.length > 0 || glAccountIds.length > 0) {
      const invoiceLineConditions: string[] = [
        "pol.company_id = po.company_id",
        "pol.purchase_order_id = po.id",
        "pol.is_deleted = false",
      ];

      const debitLineConditions: string[] = [
        "dnl.company_id = dn.company_id",
        "dnl.debit_note_id = dn.id",
        "dnl.is_deleted = false",
      ];

      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        const placeholder = `$${queryParams.length}::uuid[]`;

        invoiceLineConditions.push(`pol.item_id = ANY(${placeholder})`);

        debitLineConditions.push(`dnl.item_id = ANY(${placeholder})`);
      }

      if (glAccountIds.length > 0) {
        queryParams.push(glAccountIds);
        const placeholder = `$${queryParams.length}::uuid[]`;

        invoiceLineConditions.push(`pol.gl_account_id = ANY(${placeholder})`);

        debitLineConditions.push(`dnl.gl_account_id = ANY(${placeholder})`);
      }

      invoiceLineExists = `
        AND EXISTS (
          SELECT 1
          FROM purchase_order_lines pol
          WHERE ${invoiceLineConditions.join(" AND ")}
        )
      `;

      debitNoteLineExists = `
        AND EXISTS (
          SELECT 1
          FROM debit_note_lines dnl
          WHERE ${debitLineConditions.join(" AND ")}
        )
      `;
    }

    const unionQueries: string[] = [];

    // -----------------------------------------------------
    // PURCHASE INVOICES
    // -----------------------------------------------------

    if (docType === "Both" || docType === "Invoices") {
      unionQueries.push(`
        SELECT
          po.id,

          'Invoice'::text AS doc_type,

          po.invoice_date::text AS doc_date,

          po.purchase_invoice_no AS doc_no,

          po.order_no,

          COALESCE(
            po.supplier_no,
            p.supplier_code,
            ''
          ) AS supplier_no,

          COALESCE(
            po.supplier_name,
            p.name,
            ''
          ) AS supplier_name,

          COALESCE(
            po.supplier_invoice_no,
            ''
          ) AS supp_doc_no,

          COALESCE(poa.city, '') AS city,

          COALESCE(c.code, 'GBP') AS currency_code,

          (
            COALESCE(po.subtotal, 0)
            * COALESCE(po.exchange_rate, 1)
          ) AS amount_lcy,

          (
            COALESCE(po.total_amount, 0)
            * COALESCE(po.exchange_rate, 1)
          ) AS amount_incl_vat_lcy,

          po.purchaser_id AS po_purchaser_id,

          po.supplier_id

        FROM purchase_orders po

        LEFT JOIN parties p
          ON p.id = po.supplier_id
         AND p.company_id = po.company_id

        LEFT JOIN currencies c
          ON c.id = po.currency_id

        LEFT JOIN LATERAL (
          SELECT address.city
          FROM purchase_order_addresses address
          WHERE address.purchase_order_id = po.id
            AND address.company_id = po.company_id
            AND address.address_type = 'primary'
          ORDER BY address.created_at ASC
          LIMIT 1
        ) poa ON true

        WHERE po.company_id = $1

          AND po.invoice_date >= $2::date
          AND po.invoice_date <= $3::date

          AND po.invoice_status = 'INVOICED'
          AND po.is_posted = true

          ${invoiceLineExists}
      `);
    }

    // -----------------------------------------------------
    // DEBIT NOTES
    // -----------------------------------------------------

    if (docType === "Both" || docType === "Debit Notes") {
      unionQueries.push(`
        SELECT
          dn.id,

          'Debit Note'::text AS doc_type,

          dn.invoice_date::text AS doc_date,

          dn.debit_note_no AS doc_no,

          ''::text AS order_no,

          COALESCE(dn.supplier_no, '') AS supplier_no,

          COALESCE(p.name, '') AS supplier_name,

          ''::text AS supp_doc_no,

          COALESCE(dna.city, '') AS city,

          COALESCE(c.code, 'GBP') AS currency_code,

          -(
            COALESCE(dn.net_amount, 0)
            * COALESCE(dn.exchange_rate, 1)
          ) AS amount_lcy,

          -(
            COALESCE(dn.total_amount, 0)
            * COALESCE(dn.exchange_rate, 1)
          ) AS amount_incl_vat_lcy,

          dn.purchaser_id AS po_purchaser_id,

          dn.supplier_id

        FROM debit_notes dn

        LEFT JOIN parties p
          ON p.id = dn.supplier_id
         AND p.company_id = dn.company_id

        LEFT JOIN currencies c
          ON c.id = dn.currency_id

        LEFT JOIN LATERAL (
          SELECT address.city
          FROM debit_note_addresses address
          WHERE address.debit_note_id = dn.id
            AND address.company_id = dn.company_id
            AND address.address_type = 'primary'
          ORDER BY address.created_at ASC
          LIMIT 1
        ) dna ON true

        WHERE dn.company_id = $1

          AND dn.invoice_date >= $2::date
          AND dn.invoice_date <= $3::date

          AND dn.status::text IN ('posted', 'completed')

          ${debitNoteLineExists}
      `);
    }

    if (unionQueries.length === 0) {
      return NextResponse.json(
        { error: "No report document types selected." },
        { status: 400 },
      );
    }

    const mainQuery = `
      WITH combined_docs AS (
        ${unionQueries.join("\nUNION ALL\n")}
      )

      SELECT *
      FROM combined_docs

      WHERE 1 = 1

        ${purchaserClause}

        ${supplierClause}

      ORDER BY
        doc_date DESC,
        doc_no DESC
    `;

    const result = await pool.query<ReportDocument>(mainQuery, queryParams);

    const documents: ReportDocumentWithLines[] = result.rows.map((row) => ({
      ...row,
    }));

    // -----------------------------------------------------
    // DETAILED LINE FETCHING
    // -----------------------------------------------------

    if (viewMode === "detailed" && documents.length > 0) {
      const invoiceIds = documents
        .filter((doc) => doc.doc_type === "Invoice")
        .map((doc) => doc.id);

      const debitNoteIds = documents
        .filter((doc) => doc.doc_type === "Debit Note")
        .map((doc) => doc.id);

      const linesMap: Record<string, ReportLine[]> = {};

      // Purchase invoice lines are purchase order lines now.
      if (invoiceIds.length > 0) {
        const invoiceLinesResult = await pool.query<POLine>(
          `
          SELECT
            pol.purchase_order_id AS parent_id,

            pol.id,

            COALESCE(
              pol.item_code,
              pol.account_code,
              ''
            ) AS code,

            pol.description,

            COALESCE(
              pol.invoiced_quantity,
              pol.quantity,
              0
            ) AS quantity,

            COALESCE(pol.unit_cost, 0) AS unit_cost,

            (
              COALESCE(pol.net_amount, 0)
              * COALESCE(po.exchange_rate, 1)
            ) AS amount_lcy,

            (
              COALESCE(pol.gross_amount, 0)
              * COALESCE(po.exchange_rate, 1)
            ) AS amount_incl_vat_lcy

          FROM purchase_order_lines pol

          INNER JOIN purchase_orders po
            ON po.id = pol.purchase_order_id
           AND po.company_id = pol.company_id

          WHERE pol.company_id = $2
            AND pol.purchase_order_id = ANY($1::uuid[])
            AND pol.is_deleted = false

          ORDER BY
            pol.purchase_order_id,
            pol.line_no ASC
          `,
          [invoiceIds, companyId],
        );

        for (const line of invoiceLinesResult.rows) {
          if (!linesMap[line.parent_id]) {
            linesMap[line.parent_id] = [];
          }

          linesMap[line.parent_id].push({
            id: line.id,
            code: line.code,
            description: line.description,
            quantity: toNumber(line.quantity),
            unit_cost: toNumber(line.unit_cost),
            amount_lcy: toNumber(line.amount_lcy),
            amount_incl_vat_lcy: toNumber(line.amount_incl_vat_lcy),
          });
        }
      }

      // Debit note lines remain in debit_note_lines.
      if (debitNoteIds.length > 0) {
        const debitLinesResult = await pool.query<DebitNoteLine>(
          `
          SELECT
            dnl.debit_note_id AS parent_id,

            dnl.id,

            COALESCE(
              dnl.item_code,
              dnl.account_code,
              ''
            ) AS code,

            dnl.description,

            -COALESCE(dnl.quantity, 0) AS quantity,

            COALESCE(dnl.unit_cost, 0) AS unit_cost,

            -(
              COALESCE(dnl.net_amount, 0)
              * COALESCE(dn.exchange_rate, 1)
            ) AS amount_lcy,

            -(
              COALESCE(dnl.gross_amount, 0)
              * COALESCE(dn.exchange_rate, 1)
            ) AS amount_incl_vat_lcy

          FROM debit_note_lines dnl

          INNER JOIN debit_notes dn
            ON dn.id = dnl.debit_note_id
           AND dn.company_id = dnl.company_id

          WHERE dnl.company_id = $2
            AND dnl.debit_note_id = ANY($1::uuid[])
            AND dnl.is_deleted = false

          ORDER BY
            dnl.debit_note_id,
            dnl.line_no ASC
          `,
          [debitNoteIds, companyId],
        );

        for (const line of debitLinesResult.rows) {
          if (!linesMap[line.parent_id]) {
            linesMap[line.parent_id] = [];
          }

          linesMap[line.parent_id].push({
            id: line.id,
            code: line.code,
            description: line.description,
            quantity: toNumber(line.quantity),
            unit_cost: toNumber(line.unit_cost),
            amount_lcy: toNumber(line.amount_lcy),
            amount_incl_vat_lcy: toNumber(line.amount_incl_vat_lcy),
          });
        }
      }

      for (const document of documents) {
        document.lines = linesMap[document.id] || [];
      }
    }

    // -----------------------------------------------------
    // REPORT TOTALS
    // -----------------------------------------------------

    const totalAmountLcy = documents.reduce(
      (sum, document) => sum + toNumber(document.amount_lcy),
      0,
    );

    const totalAmountInclVatLcy = documents.reduce(
      (sum, document) => sum + toNumber(document.amount_incl_vat_lcy),
      0,
    );

    return NextResponse.json({
      success: true,

      data: {
        report_meta: {
          title: "Posted Purchase Invoices and Debit Notes",
          start_date: startDate,
          end_date: endDate,
          doc_type: docType,
          view_mode: viewMode,
          total_records: documents.length,
          total_amount_lcy: totalAmountLcy,
          total_amount_incl_vat_lcy: totalAmountInclVatLcy,
        },

        documents,
      },
    });
  } catch (err) {
    console.error("[POSTED_PURCHASE_INVOICES_DEBIT_NOTES_REPORT_ERROR]:", err);

    return NextResponse.json(
      {
        error: "Failed to generate Posted Invoices & Debit Notes Report",
      },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface POLine {
  id: string;
  item_code: string;
  description: string;
  quantity: number;
  unit_cost: number;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Extract Parameters
    const startDate =
      searchParams.get("startDate") || searchParams.get("fromDate");
    const endDate = searchParams.get("endDate") || searchParams.get("toDate");
    const docType = searchParams.get("docType") || "Both"; // 'Invoices' | 'Debit Notes' | 'Both'
    const viewMode = searchParams.get("viewMode") || "summary"; // 'summary' | 'detailed'

    // Filter Arrays
    const purchasersParam = searchParams.get("purchaserIds");
    const suppliersParam = searchParams.get("supplierIds");
    const itemsParam = searchParams.get("itemIds");
    const glAccountsParam = searchParams.get("glAccountIds");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "'From Date' and 'To Date' parameters are required." },
        { status: 400 },
      );
    }

    // Prepare filter parameters
    const queryParams: unknown[] = [companyId, startDate, endDate];

    let purchaserClause = "";
    if (purchasersParam) {
      const pIds = purchasersParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (pIds.length > 0) {
        queryParams.push(pIds);
        purchaserClause = `AND po_purchaser_id = ANY($${queryParams.length}::uuid[])`;
      }
    }

    let supplierClause = "";
    if (suppliersParam) {
      const sIds = suppliersParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (sIds.length > 0) {
        queryParams.push(sIds);
        supplierClause = `AND supplier_id = ANY($${queryParams.length}::uuid[])`;
      }
    }

    // Line item filter checks (EXISTS)
    let invLineExists = "";
    let dnLineExists = "";
    if (itemsParam || glAccountsParam) {
      const lineConditions: string[] = ["is_deleted = false"];
      if (itemsParam) {
        const itemIds = itemsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (itemIds.length > 0) {
          queryParams.push(itemIds);
          lineConditions.push(`item_id = ANY($${queryParams.length}::uuid[])`);
        }
      }
      if (glAccountsParam) {
        const glIds = glAccountsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (glIds.length > 0) {
          queryParams.push(glIds);
          lineConditions.push(
            `gl_account_id = ANY($${queryParams.length}::uuid[])`,
          );
        }
      }

      invLineExists = `AND EXISTS (SELECT 1 FROM purchase_invoice_lines pil WHERE pil.purchase_invoice_id = pi.id AND ${lineConditions.join(" AND ")})`;
      dnLineExists = `AND EXISTS (SELECT 1 FROM debit_note_lines dnl WHERE dnl.debit_note_id = dn.id AND ${lineConditions.join(" AND ")})`;
    }

    // Build Unified Dynamic Query
    const unionQueries: string[] = [];

    // --- PURCHASE INVOICES SUBQUERY ---
    if (docType === "Both" || docType === "Invoices") {
      unionQueries.push(`
        SELECT 
          pi.id,
          'Invoice' AS doc_type,
          pi.invoice_date AS doc_date,
          pi.invoice_no AS doc_no,
          po.order_no AS order_no,
          p.supplier_code AS supplier_no,
          p.name AS supplier_name,
          pi.supplier_invoice_no AS supp_doc_no,
          COALESCE(poa.city, '') AS city,
          c.code AS currency_code,
          (pi.subtotal * COALESCE(pi.exchange_rate, 1)) AS amount_lcy,
          (pi.total_amount * COALESCE(pi.exchange_rate, 1)) AS amount_incl_vat_lcy,
          po.purchaser_id AS po_purchaser_id,
          pi.supplier_id
        FROM purchase_invoices pi
        LEFT JOIN parties p ON p.id = pi.supplier_id
        LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
        LEFT JOIN currencies c ON c.id = pi.currency_id
        LEFT JOIN purchase_order_addresses poa 
          ON poa.purchase_order_id = pi.purchase_order_id AND poa.address_type = 'primary'
        WHERE pi.company_id = $1 
          AND pi.invoice_date >= $2::date 
          AND pi.invoice_date <= $3::date
          AND pi.status::text IN ('posted', 'completed')
          ${invLineExists}
      `);
    }

    // --- DEBIT NOTES SUBQUERY (Negated Amounts) ---
    if (docType === "Both" || docType === "Debit Notes") {
      unionQueries.push(`
        SELECT 
          dn.id,
          'Debit Note' AS doc_type,
          dn.invoice_date AS doc_date,
          dn.debit_note_no AS doc_no,
          '' AS order_no,
          dn.supplier_no AS supplier_no,
          p.name AS supplier_name,
          "" AS supp_doc_no,
          COALESCE(dna.city, '') AS city,
          c.code AS currency_code,
          -(dn.net_amount * COALESCE(dn.exchange_rate, 1)) AS amount_lcy,
          -(dn.total_amount * COALESCE(dn.exchange_rate, 1)) AS amount_incl_vat_lcy,
          dn.purchaser_id AS po_purchaser_id,
          dn.supplier_id
        FROM debit_notes dn
        LEFT JOIN parties p ON p.id = dn.supplier_id
        LEFT JOIN currencies c ON c.id = dn.currency_id
        LEFT JOIN debit_note_addresses dna 
          ON dna.debit_note_id = dn.id AND dna.address_type = 'primary'
        WHERE dn.company_id = $1 
          AND dn.invoice_date >= $2::date 
          AND dn.invoice_date <= $3::date
          AND dn.status::text IN ('posted', 'completed')
          ${dnLineExists}
      `);
    }

    const mainQuery = `
      WITH combined_docs AS (
        ${unionQueries.join(" UNION ALL ")}
      )
      SELECT * FROM combined_docs
      WHERE 1=1 ${purchaserClause} ${supplierClause}
      ORDER BY doc_date DESC, doc_no DESC
    `;

    const result = await pool.query(mainQuery, queryParams);
    const documents = result.rows;

    // Detailed Line Fetching Logic
    if (viewMode === "detailed" && documents.length > 0) {
      const invoiceIds = documents
        .filter((d) => d.doc_type === "Invoice")
        .map((d) => d.id);
      const debitNoteIds = documents
        .filter((d) => d.doc_type === "Debit Note")
        .map((d) => d.id);

      const linesMap: Record<string, POLine[]> = {};

      if (invoiceIds.length > 0) {
        const invLinesRes = await pool.query(
          `SELECT 
            pil.purchase_invoice_id AS parent_id,
            pil.id,
            COALESCE(pil.item_code, pil.account_code, '') AS code,
            pil.description,
            pil.quantity,
            pil.unit_cost,
            (pil.net_amount * COALESCE(pi.exchange_rate, 1)) AS amount_lcy,
            (pil.gross_amount * COALESCE(pi.exchange_rate, 1)) AS amount_incl_vat_lcy
          FROM purchase_invoice_lines pil
          JOIN purchase_invoices pi ON pi.id = pil.purchase_invoice_id
          WHERE pil.purchase_invoice_id = ANY($1::uuid[]) AND pil.is_deleted = false`,
          [invoiceIds],
        );
        invLinesRes.rows.forEach((l) => {
          if (!linesMap[l.parent_id]) linesMap[l.parent_id] = [];
          linesMap[l.parent_id].push(l);
        });
      }

      if (debitNoteIds.length > 0) {
        const dnLinesRes = await pool.query(
          `SELECT 
            dnl.debit_note_id AS parent_id,
            dnl.id,
            COALESCE(dnl.item_code, dnl.account_code, '') AS code,
            dnl.description,
            -dnl.quantity AS quantity,
            dnl.unit_cost,
            -(dnl.net_amount * COALESCE(dn.exchange_rate, 1)) AS amount_lcy,
            -(dnl.gross_amount * COALESCE(dn.exchange_rate, 1)) AS amount_incl_vat_lcy
          FROM debit_note_lines dnl
          JOIN debit_notes dn ON dn.id = dnl.debit_note_id
          WHERE dnl.debit_note_id = ANY($1::uuid[]) AND dnl.is_deleted = false`,
          [debitNoteIds],
        );
        dnLinesRes.rows.forEach((l) => {
          if (!linesMap[l.parent_id]) linesMap[l.parent_id] = [];
          linesMap[l.parent_id].push(l);
        });
      }

      documents.forEach((doc) => {
        doc.lines = linesMap[doc.id] || [];
      });
    }

    // Aggregate summary balances
    const totalAmountLcy = documents.reduce(
      (sum, d) => sum + Number(d.amount_lcy || 0),
      0,
    );
    const totalAmountInclVatLcy = documents.reduce(
      (sum, d) => sum + Number(d.amount_incl_vat_lcy || 0),
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        report_meta: {
          title: "Posted Purchase Invoices and Debit Notes",
          start_date: startDate,
          end_date: endDate,
          doc_type: docType,
          view_mode: viewMode,
          total_records: documents.length,
          total_amount_lcy: totalAmountLcy,
          total_amount_incl_vat_lcy: totalAmountInclVatLcy,
        },
        documents,
      },
    });
  } catch (err) {
    console.error("Report Generation Error:", err);
    return NextResponse.json(
      { error: "Failed to generate Posted Invoices & Debit Notes Report" },
      { status: 500 },
    );
  }
}
 */
