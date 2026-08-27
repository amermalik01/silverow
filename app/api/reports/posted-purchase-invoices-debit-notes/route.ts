// app/api/reports/posted-purchase-invoices-debit-notes/route.ts

import { NextRequest, NextResponse } from "next/server";
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
