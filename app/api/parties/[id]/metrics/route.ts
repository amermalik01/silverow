// app/api/parties/[id]/metrics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/parties/[id]/metrics?partyType=customer|supplier
 *
 * Summary widgets for the General and Finance tabs, worked out from the
 * party's ledger entries (the Activities tab) and its orders:
 *   - partySince          earliest of record creation / first ledger entry
 *   - ordersThisYear      sales (or purchase) orders dated this year
 *   - spendThisYear       invoices - credit notes posted this year (FCY)
 *   - lastActivityAt      latest ledger posting or order
 *   - outstanding         signed remaining balance (same rule as ledger summary)
 *   - lastPayment / lastInvoice, open + overdue invoice counts
 */
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
    const partyType = (
      new URL(req.url).searchParams.get("partyType") || "customer"
    ).toLowerCase();
    const isSupplier = partyType === "supplier";

    const ledgerTable = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const ledgerPartyColumn = isSupplier ? "vendor_id" : "customer_id";
    const orderTable = isSupplier ? "purchase_orders" : "sales_orders";
    const orderPartyColumn = isSupplier ? "supplier_id" : "customer_id";

    /* Same sign convention as /ledger/summary */
    const isReducing = `(
      UPPER(e.document_type) LIKE '%PAYMENT%'
      OR UPPER(e.document_type) LIKE '%CREDIT_MEMO%'
      OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
      OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
      OR UPPER(e.document_type) LIKE '%REFUND%'
    )`;

    const isInvoice = `(UPPER(e.document_type) LIKE '%INVOICE%')`;
    const isCredit = `(
      UPPER(e.document_type) LIKE '%CREDIT_MEMO%'
      OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
      OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
    )`;
    const isPayment = `(UPPER(e.document_type) LIKE '%PAYMENT%')`;

    const query = `
      WITH party AS (
        SELECT p.id, p.created_at, p.credit_limit, p.currency_id, c.code AS currency_code
        FROM parties p
        LEFT JOIN currencies c ON c.id = p.currency_id
        WHERE p.id = $2
          AND p.company_id = $1
      ),

      ledger AS (
        SELECT
          MIN(e.posting_date) AS first_posting,
          MAX(e.posting_date) AS last_posting,

          COALESCE(SUM(
            CASE WHEN ${isReducing}
              THEN -ABS(e.remaining_amount_fcy)
              ELSE ABS(e.remaining_amount_fcy)
            END
          ), 0) AS outstanding_fcy,

          COALESCE(SUM(
            CASE WHEN ${isReducing}
              THEN -ABS(e.remaining_amount_lcy)
              ELSE ABS(e.remaining_amount_lcy)
            END
          ), 0) AS outstanding_lcy,

          COALESCE(SUM(
            CASE
              WHEN e.posting_date >= date_trunc('year', CURRENT_DATE)
               AND ${isInvoice} THEN ABS(e.original_amount_fcy)
              WHEN e.posting_date >= date_trunc('year', CURRENT_DATE)
               AND ${isCredit} THEN -ABS(e.original_amount_fcy)
              ELSE 0
            END
          ), 0) AS spend_this_year_fcy,

          COUNT(*) FILTER (
            WHERE ${isInvoice}
              AND e.is_open = TRUE
              AND ABS(e.remaining_amount_fcy) > 0
          ) AS open_invoices,

          COUNT(*) FILTER (
            WHERE ${isInvoice}
              AND e.is_open = TRUE
              AND ABS(e.remaining_amount_fcy) > 0
              AND e.due_date IS NOT NULL
              AND e.due_date < CURRENT_DATE
          ) AS overdue_invoices
        FROM ${ledgerTable} e
        WHERE e.company_id = $1
          AND e.${ledgerPartyColumn} = $2
      ),

      last_payment AS (
        SELECT ABS(e.original_amount_fcy) AS amount, e.posting_date
        FROM ${ledgerTable} e
        WHERE e.company_id = $1
          AND e.${ledgerPartyColumn} = $2
          AND ${isPayment}
        ORDER BY e.posting_date DESC, e.created_at DESC
        LIMIT 1
      ),

      last_invoice AS (
        SELECT ABS(e.original_amount_fcy) AS amount, e.posting_date
        FROM ${ledgerTable} e
        WHERE e.company_id = $1
          AND e.${ledgerPartyColumn} = $2
          AND ${isInvoice}
        ORDER BY e.posting_date DESC, e.created_at DESC
        LIMIT 1
      ),

      orders AS (
        SELECT
          COUNT(*) FILTER (
            WHERE o.order_date >= date_trunc('year', CURRENT_DATE)
          ) AS orders_this_year,
          MAX(o.order_date) AS last_order
        FROM ${orderTable} o
        WHERE o.company_id = $1
          AND o.${orderPartyColumn} = $2
          AND LOWER(COALESCE(o.status::text, '')) NOT IN ('cancelled', 'canceled')
      )

      SELECT
        party.created_at,
        party.credit_limit,
        party.currency_code,

        LEAST(party.created_at::date, ledger.first_posting::date) AS party_since,
        GREATEST(ledger.last_posting::date, orders.last_order::date) AS last_activity,

        ledger.outstanding_fcy,
        ledger.outstanding_lcy,
        ledger.spend_this_year_fcy,
        ledger.open_invoices,
        ledger.overdue_invoices,

        orders.orders_this_year,

        last_payment.amount AS last_payment_amount,
        last_payment.posting_date AS last_payment_date,
        last_invoice.amount AS last_invoice_amount,
        last_invoice.posting_date AS last_invoice_date
      FROM party
      CROSS JOIN ledger
      CROSS JOIN orders
      LEFT JOIN last_payment ON TRUE
      LEFT JOIN last_invoice ON TRUE
    `;

    const result = await pool.query(query, [companyId, partyId]);
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ error: "Party not found." }, { status: 404 });
    }

    const toNumber = (value: unknown) => Number(value) || 0;
    const toDate = (value: unknown) =>
      value ? new Date(value as string).toISOString().slice(0, 10) : null;

    const creditLimit = toNumber(row.credit_limit);
    const outstanding = toNumber(row.outstanding_fcy);

    return NextResponse.json(
      {
        metrics: {
          currencyCode: row.currency_code ?? null,
          partySince: toDate(row.party_since ?? row.created_at),
          creditLimit,
          ordersThisYear: toNumber(row.orders_this_year),
          spendThisYear: toNumber(row.spend_this_year_fcy),
          lastActivityAt: toDate(row.last_activity),
          outstanding,
          outstandingLcy: toNumber(row.outstanding_lcy),
          /* null = no credit limit set */
          availableCredit: creditLimit > 0 ? creditLimit - outstanding : null,
          openInvoices: toNumber(row.open_invoices),
          overdueInvoices: toNumber(row.overdue_invoices),
          lastPayment:
            row.last_payment_amount != null
              ? {
                  amount: toNumber(row.last_payment_amount),
                  date: toDate(row.last_payment_date),
                }
              : null,
          lastInvoice:
            row.last_invoice_amount != null
              ? {
                  amount: toNumber(row.last_invoice_amount),
                  date: toDate(row.last_invoice_date),
                }
              : null,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("Party metrics API error:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to load party metrics." },
      { status: 500 },
    );
  }
}
