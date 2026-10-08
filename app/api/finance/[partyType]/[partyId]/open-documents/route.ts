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
          targetDocTypes = ["CREDIT_MEMO", "CREDIT_NOTE", "SALES_CREDIT_NOTE"];
          break;
        case "SALES_INVOICE":
        case "INVOICE":
          targetDocTypes = [
            "PAYMENT",
            "CUSTOMER_PAYMENT",
            "CREDIT_MEMO",
            "CREDIT_NOTE",
            "SALES_CREDIT_NOTE",
          ];
          break;
        case "CREDIT_MEMO":
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
        
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        e.original_amount_lcy,
        e.remaining_amount_lcy

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

      const origFCY = Math.abs(Number(row.original_amount_fcy) || 0);
      const remFCY = Math.abs(Number(row.remaining_amount_fcy) || 0);
      const origLCY = Math.abs(Number(row.original_amount_lcy) || 0);
      const remLCY = Math.abs(Number(row.remaining_amount_lcy) || 0);

      return {
        id: row.id,
        document_no: row.document_no,
        document_type: row.document_type,
        posting_date: row.posting_date,
        due_date: row.due_date,
        currency_code: currencyCode,
        exchange_rate: rate,
        original_amount_fcy: origFCY,
        remaining_amount_fcy: remFCY,
        original_amount_lcy: origLCY,
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
