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

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    let targetDocTypes: string[] = [];

    if (isSupplier) {
      switch (rawDocType) {
        case "PAYMENT":
        case "VENDOR_PAYMENT":
          targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;
        case "REFUND":
          targetDocTypes = ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
          break;
        case "PURCHASE_INVOICE":
        case "INVOICE":
          targetDocTypes = [
            "PAYMENT",
            "VENDOR_PAYMENT",
            "DEBIT_NOTE",
            "PURCHASE_DEBIT_NOTE",
          ];
          break;
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
        case "PAYMENT":
        case "CUSTOMER_PAYMENT":
          targetDocTypes = ["SALES_INVOICE", "INVOICE"];
          break;
        case "REFUND":
          targetDocTypes = ["CREDIT_NOTE", "SALES_CREDIT_NOTE"];
          break;
        case "SALES_INVOICE":
        case "INVOICE":
          targetDocTypes = [
            "PAYMENT",
            "CUSTOMER_PAYMENT",
            "CREDIT_NOTE",
            "SALES_CREDIT_NOTE",
          ];
          break;
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
            THEN e.original_amount_fcy
          ELSE 
            CASE 
              WHEN COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) <> 0 
              THEN e.original_amount_fcy / COALESCE(jel.exchange_rate, e.exchange_rate, 1.0)
              ELSE e.original_amount_fcy 
            END
        END AS derived_fcy_original,

        e.remaining_amount_fcy AS raw_remaining_fcy
      FROM ${tableName} e
      LEFT JOIN journal_entry_lines jel ON jel.id = e.journal_line_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN currencies jc ON jc.id = jel.currency_id
      WHERE e.company_id = $1 
        AND e.${partyColumn} = $2 
        AND e.is_open = true 
        AND ABS(e.remaining_amount_fcy) > 0
        AND UPPER(e.document_type) = ANY($3::text[])
      ORDER BY e.posting_date ASC, e.created_at ASC
    `;

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
      const remFCY = Math.abs(Number(row.raw_remaining_fcy) || 0);
      const remLCY = isForeign ? remFCY * rate : remFCY;

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

    return NextResponse.json(formattedRows);
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load open documents" },
      { status: 500 },
    );
  }
}

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
    const rawDocType = (searchParams.get("docType") || "INVOICE").toUpperCase();

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
        case "VENDOR_PAYMENT":
          targetDocTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;

        // When applying a Vendor Refund (Credit entry from Vendor), allocate against open Debit Notes (Debits)
        case "REFUND":
          targetDocTypes = ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
          break;

        // When allocating from a Purchase Invoice / Bill side
        case "PURCHASE_INVOICE":
        case "INVOICE":
          targetDocTypes = ["PAYMENT", "VENDOR_PAYMENT", "DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"];
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
        case "CUSTOMER_PAYMENT":
          targetDocTypes = ["SALES_INVOICE", "INVOICE"];
          break;

        // When applying a Customer Refund (Debit entry to Customer), allocate against open Credit Notes (Credits)
        case "REFUND":
          targetDocTypes = ["CREDIT_NOTE", "SALES_CREDIT_NOTE"];
          break;

        // When allocating from a Sales Invoice side
        case "SALES_INVOICE":
        case "INVOICE":
          targetDocTypes = ["PAYMENT", "CUSTOMER_PAYMENT", "CREDIT_NOTE", "SALES_CREDIT_NOTE"];
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
            THEN e.original_amount_fcy
          ELSE 
            CASE 
              WHEN COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) <> 0 
              THEN e.original_amount_fcy / COALESCE(jel.exchange_rate, e.exchange_rate, 1.0)
              ELSE e.original_amount_fcy 
            END
        END AS derived_fcy_original,

        e.remaining_amount_fcy AS raw_remaining_fcy
      FROM ${tableName} e
      LEFT JOIN journal_entry_lines jel ON jel.id = e.journal_line_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN currencies jc ON jc.id = jel.currency_id
      WHERE e.company_id = $1 
        AND e.${partyColumn} = $2 
        AND e.is_open = true 
        AND ABS(e.remaining_amount_fcy) > 0
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
      
      // Parse raw FCY remaining balance
      const remFCY = Math.abs(Number(row.raw_remaining_fcy) || 0);
      // Calculate LCY remaining balance (FCY * Rate)
      const remLCY = isForeign ? remFCY * rate : remFCY;

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
 */
