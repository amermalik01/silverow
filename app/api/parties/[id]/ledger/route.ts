// app/api/parties/[id]/ledger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("type") || "supplier"; // "supplier" | "customer"

    const isSupplier = partyType.toLowerCase() === "supplier";
    const tableName = isSupplier ? "vendor_ledger_entries" : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    const query = `
      SELECT 
        e.id,
        e.document_type,
        e.document_id,
        e.document_no,
        e.posting_date,
        e.due_date,
        e.description,
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        e.original_amount_lcy,
        e.remaining_amount_lcy,
        e.exchange_rate,
        e.is_open,
        e.on_hold,
        e.on_hold_reason,
        e.journal_entry_id,
        e.journal_line_id,
        e.created_at,
        COALESCE(c.code, 'GBP') AS currency_code,
        COALESCE(SUM(la.allocated_amount_fcy), 0) AS total_allocated
      FROM ${tableName} e
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN ledger_allocations la 
        ON (la.payment_entry_id = e.id OR la.ledger_entry_id = e.id)
        AND la.is_unapplied = false
      WHERE e.company_id = $1 AND e.${partyColumn} = $2
      GROUP BY e.id, c.code
      ORDER BY e.posting_date DESC, e.created_at DESC
    `;

    // console.log("query === ", query);

    const result = await pool.query(query, [companyId, partyId]);

    let totalOriginalFCY = 0;
    let totalRemainingFCY = 0;
    let totalOriginalLCY = 0;
    let totalRemainingLCY = 0;

    const rows = result.rows.map((row) => {
      const currencyCode = (row.currency_code || "GBP").toUpperCase();
      const rate = Number(row.exchange_rate) || 1.0;

      const rawFCY = Number(row.original_amount_fcy) || 0;
      const rawRemFCY = Number(row.remaining_amount_fcy) || 0;
      const rawLCY = Number(row.original_amount_lcy) || 0;
      const rawRemLCY = Number(row.remaining_amount_lcy) || 0;

      const signedOrigFCY = getSignedAmount(row.document_type, rawFCY, isSupplier);
      const signedRemFCY = getSignedAmount(row.document_type, rawRemFCY, isSupplier);
      const signedOrigLCY = getSignedAmount(row.document_type, rawLCY, isSupplier);
      const signedRemLCY = getSignedAmount(row.document_type, rawRemLCY, isSupplier);

      totalOriginalFCY += signedOrigFCY;
      totalRemainingFCY += signedRemFCY;
      totalOriginalLCY += signedOrigLCY;
      totalRemainingLCY += signedRemLCY;

      return {
        ...row,
        currency_code: currencyCode,
        exchange_rate: rate,
        original_amount_fcy: signedOrigFCY,
        remaining_amount_fcy: signedRemFCY,
        amount_lcy: signedOrigLCY,
        remaining_amount_lcy: signedRemLCY,
        total_allocated: Number(row.total_allocated) || 0,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({
      entries: rows,
      summary: {
        totalOriginalFCY,
        totalRemainingFCY,
        totalOriginalLCY,
        totalRemainingLCY,
        openCount: rows.filter(
          (r) => r.is_open && Math.abs(r.remaining_amount_fcy) > 0,
        ).length,
      },
    });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load ledger activity" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { entryId, partyType, onHold, reason } = body;

    const isSupplier = partyType.toLowerCase() === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";

    await pool.query(
      `UPDATE ${tableName} SET on_hold = $1, on_hold_reason = $2 WHERE id = $3 AND company_id = $4`,
      [onHold, reason, entryId, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Update failed" },
      { status: 500 },
    );
  }
}

// Helper to determine document sign signifiers based on party context

function getSignedAmount(
  docType: string,
  amount: number,
  isSupplier: boolean,
): number {
  const type = docType.toUpperCase();
  const absAmount = Math.abs(amount);

  if (isSupplier) {
    // Supplier: Invoices are positive payables, Payments/Debit Notes reduce payable (negative)
    if (
      type.includes("PAYMENT") ||
      type.includes("VENDOR_PAYMENT") ||
      type.includes("DEBIT_NOTE") ||
      type.includes("REFUND")
    ) {
      return -absAmount;
    }
    return absAmount;
  } else {
    // Customer: Invoices are positive receivables, Payments/Credit Notes reduce receivable (negative)
    if (
      type.includes("PAYMENT") ||
      type.includes("CUSTOMER_PAYMENT") ||
      type.includes("CREDIT_NOTE") ||
      type.includes("REFUND")
    ) {
      return -absAmount;
    }
    return absAmount;
  }
}

/* 
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("type") || "supplier"; // "supplier" | "customer"
    // const sourceDocType = (searchParams.get("docType") || "").toUpperCase();
    // const sourceEntryId = searchParams.get("entryId");

    const isSupplier = partyType.toLowerCase() === "supplier";

    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";

    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    const query = `
      SELECT 
        e.id,
        e.document_type,
        e.document_id,
        e.document_no,
        e.posting_date,
        e.due_date,
        e.description,
        e.is_open,
        e.on_hold,
        e.on_hold_reason,
        e.journal_entry_id,
        e.journal_line_id,
        e.created_at,
        COALESCE(jc.code, c.code, 'GBP') AS currency_code,
        COALESCE(jel.exchange_rate, e.exchange_rate, 1.0) AS exchange_rate,

        -- 1. Determine FCY Original Amount
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

        -- 2. Determine LCY Original Amount
        CASE 
          WHEN UPPER(e.document_type) IN ('PURCHASE_INVOICE', 'SALES_INVOICE', 'INVOICE') AND COALESCE(jc.code, c.code, 'GBP') <> 'GBP'
            THEN e.original_amount_fcy * COALESCE(jel.exchange_rate, e.exchange_rate, 1.0)
          ELSE e.original_amount_fcy
        END AS derived_lcy_original,

        -- 3. Determine LCY Remaining Amount (DB always tracks remaining balance against base LCY)
        e.remaining_amount_fcy AS raw_remaining_fcy,

        COALESCE(SUM(la.allocated_amount_fcy), 0) AS total_allocated
      FROM ${tableName} e
      LEFT JOIN journal_entry_lines jel ON jel.id = e.journal_line_id
      LEFT JOIN journal_entries je ON je.id = e.journal_entry_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN currencies jc ON jc.id = jel.currency_id
      LEFT JOIN ledger_allocations la 
        ON (la.payment_entry_id = e.id OR la.ledger_entry_id = e.id)
        AND la.is_unapplied = false
      WHERE e.company_id = $1 AND e.${partyColumn} = $2
      GROUP BY e.id, c.code, jc.code, jel.debit, jel.credit, jel.exchange_rate
      ORDER BY e.posting_date DESC, e.created_at DESC
    `;

    console.log("query === ", query);

    const result = await pool.query(query, [companyId, partyId]);

    let totalOriginalFCY = 0;
    let totalRemainingFCY = 0;
    let totalOriginalLCY = 0;
    let totalRemainingLCY = 0;

    const rows = result.rows.map((row) => {
      const currencyCode = (row.currency_code || "GBP").toUpperCase();
      const rate = Number(row.exchange_rate) || 1.0;
      const isForeign = currencyCode !== "GBP";

      const rawFCY = Number(row.derived_fcy_original) || 0;
      const rawLCY = Number(row.derived_lcy_original) || 0;

      // remaining_amount is FCY
      const rawRemFCY = Number(row.raw_remaining_fcy) || 0;
      // Convert FCY remaining to LCY (FCY * Rate)
      const rawRemLCY = isForeign ? rawRemFCY * rate : rawRemFCY;

      // const rawRemLCY = Number(row.raw_remaining_lcy) || 0;

      // // FCY Remaining: Convert LCY remaining back to FCY (LCY / Rate)
      // const rawRemFCY = isForeign && rate !== 0 ? rawRemLCY / rate : rawRemLCY;

      const signedOrigFCY = getSignedAmount(
        row.document_type,
        rawFCY,
        isSupplier,
      );
      const signedRemFCY = getSignedAmount(
        row.document_type,
        rawRemFCY,
        isSupplier,
      );
      const signedOrigLCY = getSignedAmount(
        row.document_type,
        rawLCY,
        isSupplier,
      );
      const signedRemLCY = getSignedAmount(
        row.document_type,
        rawRemLCY,
        isSupplier,
      );

      totalOriginalFCY += signedOrigFCY;
      totalRemainingFCY += signedRemFCY;
      totalOriginalLCY += signedOrigLCY;
      totalRemainingLCY += signedRemLCY;

      return {
        ...row,
        currency_code: currencyCode,
        exchange_rate: rate,
        original_amount_fcy: signedOrigFCY,
        remaining_amount_fcy: signedRemFCY,
        amount_lcy: signedOrigLCY,
        remaining_amount_lcy: signedRemLCY,
        total_allocated: Number(row.total_allocated) || 0,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({
      entries: rows,
      summary: {
        totalOriginalFCY,
        totalRemainingFCY,
        totalOriginalLCY,
        totalRemainingLCY,
        openCount: rows.filter(
          (r) => r.is_open && Math.abs(r.remaining_amount_fcy) > 0,
        ).length,
      },
    });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load ledger activity" },
      { status: 500 },
    );
  }
}
*/
// Define allowed target document types according to business rules
// let allowedTypes: string[] = [];

// if (isSupplier) {
//   if (sourceDocType.includes("PAYMENT")) {
//     allowedTypes = ["PURCHASE_INVOICE", "INVOICE"];
//   } else if (sourceDocType.includes("REFUND")) {
//     allowedTypes = ["DEBIT_NOTE"];
//   } else if (sourceDocType.includes("DEBIT_NOTE")) {
//     allowedTypes = ["PURCHASE_INVOICE", "INVOICE"];
//   } else if (
//     sourceDocType.includes("INVOICE") ||
//     sourceDocType.includes("PURCHASE_INVOICE")
//   ) {
//     allowedTypes = ["DEBIT_NOTE", "PAYMENT"];
//   }
// } else {
//   // Customer Rules
//   if (sourceDocType.includes("PAYMENT")) {
//     allowedTypes = ["SALES_INVOICE", "INVOICE"];
//   } else if (sourceDocType.includes("REFUND")) {
//     allowedTypes = ["CREDIT_NOTE"];
//   } else if (sourceDocType.includes("CREDIT_NOTE")) {
//     allowedTypes = ["SALES_INVOICE", "INVOICE"];
//   } else if (
//     sourceDocType.includes("INVOICE") ||
//     sourceDocType.includes("SALES_INVOICE")
//   ) {
//     allowedTypes = ["CREDIT_NOTE", "PAYMENT"];
//   }
// }

// if (allowedTypes.length === 0) {
//   return NextResponse.json({
//     entries: [],
//     summary: {
//       totalOriginalFCY: 0,
//       totalRemainingFCY: 0,
//       totalOriginalLCY: 0,
//       totalRemainingLCY: 0,
//       openCount: 0,
//     },
//   });
// }
