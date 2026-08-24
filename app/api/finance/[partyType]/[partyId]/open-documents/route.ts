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
    const docType = (searchParams.get("docType") || "INVOICE").toUpperCase();

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

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
    `;

    const result = await pool.query(query, [
      companyId,
      partyId,
      targetDocTypes.map((t) => t.toUpperCase()),
    ]);

    const formattedRows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const origFCY = Number(row.raw_fcy_amount) || Number(row.amount_lcy) || 0;
      const remLCY = Number(row.remaining_lcy) || 0;
      const remFCY = rate !== 0 ? remLCY / rate : remLCY;

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
