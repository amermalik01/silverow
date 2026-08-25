// app/api/finance/[partyType]/[partyId]/open-documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyType: string; partyId: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partyType, partyId } = await params;
    const { searchParams } = new URL(req.url);
    const rawDocType = (searchParams.get("docType") || "INVOICE").toUpperCase();
    // const docType = (searchParams.get("docType") || "INVOICE").toUpperCase();

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";

    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    let targetDocTypes: string[] = [];

    // console.log('rawDocType === ',rawDocType);

    if (isSupplier) {
      switch (rawDocType) {
        // When applying a Payment (Debit entry to Vendor), allocate against open Invoices (Credits)
        case "PAYMENT":
          targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;

        // When applying a Vendor Refund (Credit entry from Vendor), allocate against open Debit Notes (Debits)
        case "REFUND":
          targetDocTypes = ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
          break;

        // When allocating from a Purchase Invoice / Bill side
        case "PURCHASE_INVOICE":
        case "INVOICE":
          targetDocTypes = ["PAYMENT", "DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
          break;

        // When allocating from a Debit Note side
        case "DEBIT_NOTE":
        case "PURCHASE_DEBIT_NOTE":
          targetDocTypes = ["REFUND", "PURCHASE_INVOICE", "INVOICE"];
          break;

        default:
          targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;
      }
    } else {
      switch (rawDocType) {
        // When applying a Customer Payment (Credit entry to Customer), allocate against open Sales Invoices (Debits)
        case "PAYMENT":
          targetDocTypes = ["SALES_INVOICE", "INVOICE"];
          break;

        // When applying a Customer Refund (Debit entry to Customer), allocate against open Credit Notes (Credits)
        case "REFUND":
          targetDocTypes = ["CREDIT_NOTE", "SALES_CREDIT_NOTE"];
          break;

        // When allocating from a Sales Invoice side
        case "SALES_INVOICE":
        case "INVOICE":
          targetDocTypes = ["PAYMENT", "CREDIT_NOTE", "SALES_CREDIT_NOTE"];
          break;

        // When allocating from a Credit Note side
        case "CREDIT_NOTE":
        case "SALES_CREDIT_NOTE":
          targetDocTypes = ["REFUND", "SALES_INVOICE", "INVOICE"];
          break;

        default:
          targetDocTypes = ["SALES_INVOICE", "INVOICE"];
          break;
      }
    }

    const query = `
      SELECT 
        e.id,
        e.document_no,
        e.document_type,
        e.posting_date,
        e.due_date,
        COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) AS exchange_rate,
        COALESCE(jc.code, c.code, 'GBP') AS currency_code,
        
        -- Normalize FCY Amount
        CASE 
          WHEN GREATEST(jel.debit, jel.credit) IS NOT NULL AND GREATEST(jel.debit, jel.credit) > 0 
            THEN GREATEST(jel.debit, jel.credit)
          WHEN UPPER(e.document_type) IN ('PURCHASE_INVOICE', 'SALES_INVOICE', 'INVOICE') 
            THEN e.original_amount
          ELSE 
            CASE 
              WHEN COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) <> 0 
              THEN e.original_amount / COALESCE(jel.exchange_rate, e.exchange_rate, 1.0)
              ELSE e.original_amount 
            END
        END AS derived_fcy_original,

        e.remaining_amount AS raw_remaining_lcy
      FROM ${tableName} e
      LEFT JOIN journal_entry_lines jel ON jel.id = e.journal_line_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN currencies jc ON jc.id = jel.currency_id
      WHERE e.company_id = $1 
        AND e.${partyColumn} = $2 
        AND e.is_open = true 
        AND ABS(e.remaining_amount) > 0
        AND UPPER(e.document_type) = ANY($3::text[])
      ORDER BY e.posting_date ASC, e.created_at ASC
    `;

    // console.log('query === ',query);
    // console.log('companyId === ',companyId);
    // console.log('partyId === ',partyId);
    // console.log('targetDocTypes === ',targetDocTypes.map((t) => t.toUpperCase()));

    const result = await pool.query(query, [
      companyId,
      partyId,
      targetDocTypes.map((t) => t.toUpperCase()),
    ]);

    const formattedRows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const currencyCode = (row.currency_code || "GBP").toUpperCase();
      const isForeign = currencyCode !== "GBP";

      const origFCY = Number(row.derived_fcy_original) || 0;
      const remLCY = Math.abs(Number(row.raw_remaining_lcy) || 0);
      const remFCY = isForeign && rate !== 0 ? remLCY / rate : remLCY;

      return {
        id: row.id,
        document_no: row.document_no,
        document_type: row.document_type,
        posting_date: row.posting_date,
        due_date: row.due_date,
        currency_code: currencyCode,
        exchange_rate: rate,
        original_amount: origFCY,
        remaining_amount: remFCY,
        remaining_amount_lcy: remLCY,
      };
    });

    // console.log('formattedRows === ',formattedRows);

    return NextResponse.json(formattedRows);
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load open documents" },
      { status: 500 },
    );
  }
}
/* const query = `
      SELECT 
        e.id,
        e.document_no,
        e.document_type,
        e.posting_date,
        e.due_date,
        e.original_amount AS amount_lcy,
        e.remaining_amount AS remaining_lcy,
        COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) AS exchange_rate,
        COALESCE(jc.code, c.code, 'GBP') AS currency_code,
        COALESCE(GREATEST(jel.debit, jel.credit), e.original_amount) AS raw_fcy_amount
      FROM ${tableName} e
      LEFT JOIN journal_entry_lines jel ON jel.id = e.journal_line_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN currencies jc ON jc.id = jel.currency_id
      WHERE e.company_id = $1 
        AND e.${partyColumn} = $2 
        AND e.is_open = true 
        AND ABS(e.remaining_amount) > 0
        AND UPPER(e.document_type) = ANY($3::text[])
      ORDER BY e.posting_date ASC, e.created_at ASC
    `; */
/* const formattedRows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const origFCY = Number(row.raw_fcy_amount) || 0; // Number(row.amount_lcy) || 
      const remLCY = Number(row.remaining_lcy) || 0;
      const remFCY = rate !== 0 ? remLCY * rate : remLCY;

      return {
        id: row.id,
        document_no: row.document_no,
        document_type: row.document_type,
        posting_date: row.posting_date,
        due_date: row.due_date,
        currency_code: row.currency_code,
        exchange_rate: rate,
        original_amount: origFCY,
        remaining_amount: remFCY,
        original_amount_lcy: Number(row.amount_lcy),
        remaining_amount_lcy: remLCY,
      };
    });

    // console.log('formattedRows === ',formattedRows);

    return NextResponse.json(formattedRows); */

// if (isSupplier) {
//   if (docType === "PAYMENT") {
//     targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
//   } else if (docType === "REFUND") {
//     targetDocTypes = ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
//   } else if (docType === "PURCHASE_INVOICE" || docType === "INVOICE") {
//     targetDocTypes = ["PAYMENT", "DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
//   } else {
//     targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
//   }
// } else {
//   if (docType === "PAYMENT") {
//     targetDocTypes = ["SALES_INVOICE", "INVOICE"];
//   } else if (docType === "REFUND") {
//     targetDocTypes = ["CREDIT_NOTE", "SALES_CREDIT_NOTE"];
//   } else if (docType === "SALES_INVOICE" || docType === "INVOICE") {
//     targetDocTypes = ["PAYMENT", "CREDIT_NOTE", "SALES_CREDIT_NOTE"];
//   } else {
//     targetDocTypes = ["SALES_INVOICE", "INVOICE"];
//   }
// }
/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyType: string; partyId: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partyType, partyId } = await params;
    const { searchParams } = new URL(req.url);
    const docType = (searchParams.get("docType") || "INVOICE").toUpperCase();

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    // Dynamic document filter rules
    let targetDocTypes: string[] = [];

    if (isSupplier) {
      if (docType === "PAYMENT") {
        targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
      } else if (docType === "REFUND") {
        targetDocTypes = ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
      } else if (docType === "PURCHASE_INVOICE" || docType === "INVOICE") {
        targetDocTypes = ["PAYMENT", "DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
      } else {
        targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
      }
    } else {
      if (docType === "PAYMENT") {
        targetDocTypes = ["SALES_INVOICE", "INVOICE"];
      } else if (docType === "REFUND") {
        targetDocTypes = ["CREDIT_NOTE", "SALES_CREDIT_NOTE"];
      } else if (docType === "SALES_INVOICE" || docType === "INVOICE") {
        targetDocTypes = ["PAYMENT", "CREDIT_NOTE", "SALES_CREDIT_NOTE"];
      } else {
        targetDocTypes = ["SALES_INVOICE", "INVOICE"];
      }
    }

    const query = `
      SELECT 
        id,
        document_no,
        document_type,
        posting_date,
        due_date,
        original_amount,
        remaining_amount,
        currency_id
      FROM ${tableName}
      WHERE company_id = $1 
        AND ${partyColumn} = $2 
        AND is_open = true 
        AND ABS(remaining_amount) > 0
        AND UPPER(document_type) = ANY($3::text[])
      ORDER BY posting_date ASC, created_at ASC
    `;

    const result = await pool.query(query, [
      companyId,
      partyId,
      targetDocTypes.map((t) => t.toUpperCase()),
    ]);

    return NextResponse.json(result.rows);
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load open documents" },
      { status: 500 },
    );
  }
} */

/* export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyType: string; partyId: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partyType, partyId } = await params;
    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("docType") || "INVOICE"; // INVOICE | DEBIT_NOTE | CREDIT_NOTE

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    // Map query docType to stored database document_type values
    let targetDocTypes: string[] = [];
    if (isSupplier) {
      targetDocTypes =
        docType === "REFUND" || docType === "DEBIT_NOTE"
          ? ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"]
          : ["PURCHASE_INVOICE", "INVOICE"];
    } else {
      targetDocTypes =
        docType === "REFUND" || docType === "CREDIT_NOTE"
          ? ["CREDIT_NOTE", "SALES_CREDIT_NOTE"]
          : ["SALES_INVOICE", "INVOICE"];
    }

    const query = `
      SELECT 
        id,
        document_no,
        document_type,
        posting_date,
        due_date,
        original_amount,
        remaining_amount,
        currency_id
      FROM ${tableName}
      WHERE company_id = $1 
        AND ${partyColumn} = $2 
        AND is_open = true 
        AND remaining_amount > 0
        AND document_type = ANY($3::text[])
      ORDER BY posting_date ASC, created_at ASC
      `;

    // console.log("query === ", query);
    // console.log("partyId === ", partyId);
    // console.log("targetDocTypes === ", targetDocTypes);

    const result = await pool.query(query, [
      companyId,
      partyId,
      targetDocTypes,
    ]);

    return NextResponse.json(result.rows);
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load open documents" },
      { status: 500 },
    );
  }
} */
