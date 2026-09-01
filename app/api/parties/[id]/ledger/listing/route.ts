// app/api/parties/[id]/ledger/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

// Helper for signing amounts according to sub-ledger conventions
function getSignedAmount(
  docType: string,
  amount: number,
  isSupplier: boolean,
): number {
  const type = (docType || "").toUpperCase();
  const absAmount = Math.abs(amount);

  if (isSupplier) {
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

// Map DataTable column keys to actual SQL column names for safe dynamic sorting
const SORT_COLUMN_MAP: Record<string, string> = {
  posting_date: "e.posting_date",
  document_no: "e.document_no",
  document_type: "e.document_type",
  currency_code: "c.code",
  original_amount_fcy: "e.original_amount_fcy",
  remaining_amount_fcy: "e.remaining_amount_fcy",
  original_amount_lcy: "e.original_amount_lcy",
  remaining_amount_lcy: "e.remaining_amount_lcy",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const body = await req.json();

    const {
      page = 1,
      pageSize = 10,
      search = "",
      sortColumn = "posting_date",
      sortDirection = "desc",
      partyType = "supplier",
      statusFilter = "ALL",
      sourceDocType = "",
    } = body;

    const isSupplier = partyType.toLowerCase() === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    const glPartyType = isSupplier ? "SUPPLIER" : "CUSTOMER";

    // 1. Unfiltered summary calculation for cards top-bar
    // const summaryQuery = ` WITH party_totals AS ( SELECT COALESCE( SUM( CASE WHEN UPPER(e.document_type) LIKE '%PAYMENT%' OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' OR UPPER(e.document_type) LIKE '%REFUND%' THEN -ABS(e.original_amount_fcy) ELSE ABS(e.original_amount_fcy) END ), 0 ) AS total_original_fcy, COALESCE( SUM( CASE WHEN UPPER(e.document_type) LIKE '%PAYMENT%' OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' OR UPPER(e.document_type) LIKE '%REFUND%' THEN -ABS(e.remaining_amount_fcy) ELSE ABS(e.remaining_amount_fcy) END ), 0 ) AS total_remaining_fcy, COALESCE( SUM( CASE WHEN UPPER(e.document_type) LIKE '%PAYMENT%' OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' OR UPPER(e.document_type) LIKE '%REFUND%' THEN -ABS(e.original_amount_lcy) ELSE ABS(e.original_amount_lcy) END ), 0 ) AS total_original_lcy, COALESCE( SUM( CASE WHEN UPPER(e.document_type) LIKE '%PAYMENT%' OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' OR UPPER(e.document_type) LIKE '%REFUND%' THEN -ABS(e.remaining_amount_lcy) ELSE ABS(e.remaining_amount_lcy) END ), 0 ) AS total_remaining_lcy, COUNT( CASE WHEN e.is_open = true AND ABS(e.remaining_amount_fcy) > 0 THEN 1 END ) AS open_count FROM ${tableName} e WHERE e.company_id = $1 AND e.${partyColumn} = $2 ), fx_totals AS ( SELECT COALESCE( SUM( CASE WHEN gle.debit > 0 THEN gle.debit WHEN gle.credit > 0 THEN -gle.credit ELSE 0 END ), 0 ) AS fx_lcy FROM gl_ledger_entries gle WHERE gle.company_id = $1 AND gle.source_type::text = 'FX_VARIANCE' AND gle.party_type::text = '${glPartyType}' AND gle.party_id = $2 ) SELECT p.total_original_fcy, p.total_remaining_fcy, p.total_original_lcy, p.total_remaining_lcy, f.fx_lcy, p.total_original_lcy + f.fx_lcy AS adjusted_original_lcy, p.total_remaining_lcy + f.fx_lcy AS adjusted_remaining_lcy, p.open_count FROM party_totals p CROSS JOIN fx_totals f `;
    const summaryQuery = `
      WITH party_totals AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN UPPER(e.document_type) LIKE '%PAYMENT%'
                  OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%REFUND%'
                THEN -ABS(e.original_amount_fcy)
                ELSE ABS(e.original_amount_fcy)
              END
            ),
            0
          ) AS total_original_fcy,

          COALESCE(
            SUM(
              CASE
                WHEN UPPER(e.document_type) LIKE '%PAYMENT%'
                  OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%REFUND%'
                THEN -ABS(e.remaining_amount_fcy)
                ELSE ABS(e.remaining_amount_fcy)
              END
            ),
            0
          ) AS total_remaining_fcy,

          COALESCE(
            SUM(
              CASE
                WHEN UPPER(e.document_type) LIKE '%PAYMENT%'
                  OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%REFUND%'
                THEN -ABS(e.original_amount_lcy)
                ELSE ABS(e.original_amount_lcy)
              END
            ),
            0
          ) AS total_original_lcy,

          COALESCE(
            SUM(
              CASE
                WHEN UPPER(e.document_type) LIKE '%PAYMENT%'
                  OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%'
                  OR UPPER(e.document_type) LIKE '%REFUND%'
                THEN -ABS(e.remaining_amount_lcy)
                ELSE ABS(e.remaining_amount_lcy)
              END
            ),
            0
          ) AS total_remaining_lcy,

          COUNT(
            CASE
              WHEN e.is_open = true
                AND ABS(e.remaining_amount_fcy) > 0
              THEN 1
            END
          ) AS open_count

        FROM ${tableName} e
        WHERE e.company_id = $1
          AND e.${partyColumn} = $2
      ),

      fx_totals AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN gle.debit > 0 THEN gle.debit
                WHEN gle.credit > 0 THEN -gle.credit
                ELSE 0
              END
            ),
            0
          ) AS fx_lcy

        FROM gl_ledger_entries gle
        WHERE gle.company_id = $1
          AND gle.source_type::text = 'FX_VARIANCE'
          AND gle.party_type::text = '${glPartyType}'
          AND gle.party_id = $2
      )

      SELECT
        p.total_original_fcy,
        p.total_remaining_fcy,
        p.total_original_lcy,
        p.total_remaining_lcy,

        f.fx_lcy,

        p.total_original_lcy + f.fx_lcy
          AS adjusted_original_lcy,

        p.total_remaining_lcy + f.fx_lcy
          AS adjusted_remaining_lcy,

        p.open_count

      FROM party_totals p
      CROSS JOIN fx_totals f
    `;
    const summaryResult = await pool.query(summaryQuery, [companyId, partyId]);
    const sRow = summaryResult.rows[0] || {};
    const summary = {
      totalOriginalFCY: Number(sRow.total_original_fcy) || 0,
      totalRemainingFCY: Number(sRow.total_remaining_fcy) || 0,
      // Use the FX-adjusted LCY values.
      // // This keeps listing cards consistent with the dedicated summary API.
      totalOriginalLCY: Number(sRow.adjusted_original_lcy) || 0,
      totalRemainingLCY: Number(sRow.adjusted_remaining_lcy) || 0,
      openCount: Number(sRow.open_count) || 0,
      // Optional diagnostic value.
      // Safe to expose if the frontend wants to display FX separately.
      fxVarianceLCY: Number(sRow.fx_lcy) || 0,
    };
    

    // 2. Build parameterized dynamic query for filtering & pagination
    const queryParams: (string | number | boolean)[] = [companyId, partyId];
    const whereConditions: string[] = [
      `e.company_id = $1`,
      `e.${partyColumn} = $2`,
    ];

    // Status Filter (ALL / OPEN / CLOSED)
    if (statusFilter === "OPEN") {
      whereConditions.push(
        `e.is_open = true AND ABS(e.remaining_amount_fcy) > 0`,
      );
    } else if (statusFilter === "CLOSED") {
      whereConditions.push(
        `(e.is_open = false OR ABS(e.remaining_amount_fcy) = 0)`,
      );
    }

    // Source Document Type Filter
    if (sourceDocType) {
      queryParams.push(sourceDocType);
      whereConditions.push(`e.document_type = $${queryParams.length}`);
    }

    // Global Search Filter
    if (search && search.trim() !== "") {
      queryParams.push(`%${search.trim()}%`);
      const searchIdx = queryParams.length;
      whereConditions.push(
        `(e.document_no ILIKE $${searchIdx} OR e.description ILIKE $${searchIdx} OR e.document_type ILIKE $${searchIdx})`,
      );
    }

    const whereClause = whereConditions.join(" AND ");

    // 3. Count matching entries
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${tableName} e
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // 4. Resolve sorting and offset limits
    const dbSortColumn = SORT_COLUMN_MAP[sortColumn] || "e.posting_date";

    const orderDirection =
      String(sortDirection).toLowerCase() === "asc" ? "ASC" : "DESC";

    const parsedPageSize = Number(pageSize);
    const parsedPage = Number(page);

    const limit = Number.isFinite(parsedPageSize)
      ? Math.max(1, Math.min(parsedPageSize, 500))
      : 10;

    const currentPage = Number.isFinite(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;

    const offset = (currentPage - 1) * limit;

    // const orderDirection =
    //   sortDirection?.toLowerCase() === "asc" ? "ASC" : "DESC";
    // const limit = Math.max(1, Number(pageSize));
    // const offset = (Math.max(1, Number(page)) - 1) * limit;

    queryParams.push(limit);
    const limitIdx = queryParams.length;

    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    // 5. Query page data
    const dataQuery = `
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
        COALESCE(SUM(la.allocated_amount_fcy), 0) AS total_allocated,
        COALESCE(
          SUM(la.realized_gain_loss),
          0
        ) AS fx_variance_lcy

      FROM ${tableName} e
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN ledger_allocations la 
        ON (la.payment_entry_id = e.id OR la.ledger_entry_id = e.id)
        AND la.is_unapplied = false
      WHERE ${whereClause}
      GROUP BY e.id, c.code
      ORDER BY ${dbSortColumn} ${orderDirection}, e.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    const rows = dataResult.rows.map((row) => {
      const currencyCode = (row.currency_code || "GBP").toUpperCase();
      const rate = Number(row.exchange_rate) || 1.0;

      const rawFCY = Number(row.original_amount_fcy) || 0;
      const rawRemFCY = Number(row.remaining_amount_fcy) || 0;
      const rawLCY = Number(row.original_amount_lcy) || 0;
      const rawRemLCY = Number(row.remaining_amount_lcy) || 0;

      const totalAllocated = Number(row.total_allocated) || 0;

      const fxVarianceLCY = Number(row.fx_variance_lcy) || 0;

      return {
        ...row,
        currency_code: currencyCode,
        exchange_rate: rate,
        original_amount_fcy: getSignedAmount(
          row.document_type,
          rawFCY,
          isSupplier,
        ),
        remaining_amount_fcy: getSignedAmount(
          row.document_type,
          rawRemFCY,
          isSupplier,
        ),
        original_amount_lcy: getSignedAmount(
          row.document_type,
          rawLCY,
          isSupplier,
        ),
        remaining_amount_lcy: getSignedAmount(
          row.document_type,
          rawRemLCY,
          isSupplier,
        ),
        total_allocated: totalAllocated,
        fx_variance_lcy: fxVarianceLCY,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({
      data: rows,
      total: totalRecords,
      summary,
    });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to fetch party ledger listing." },
      { status: 500 },
    );
  }
}

/* const summaryQuery = `
      SELECT 
        e.document_type,
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        e.original_amount_lcy,
        e.remaining_amount_lcy,
        e.is_open
      FROM ${tableName} e
      WHERE e.company_id = $1 AND e.${partyColumn} = $2
    `;
    const summaryResult = await pool.query(summaryQuery, [companyId, partyId]); */

/* let totalOriginalFCY = 0;
    let totalRemainingFCY = 0;
    let totalOriginalLCY = 0;
    let totalRemainingLCY = 0;
    let openCount = 0;

    summaryResult.rows.forEach((row) => {
      const origFCY = Number(row.original_amount_fcy) || 0;
      const remFCY = Number(row.remaining_amount_fcy) || 0;
      const origLCY = Number(row.original_amount_lcy) || 0;
      const remLCY = Number(row.remaining_amount_lcy) || 0;

      totalOriginalFCY += getSignedAmount(row.document_type, origFCY, isSupplier);
      totalRemainingFCY += getSignedAmount(row.document_type, remFCY, isSupplier);
      totalOriginalLCY += getSignedAmount(row.document_type, origLCY, isSupplier);
      totalRemainingLCY += getSignedAmount(row.document_type, remLCY, isSupplier);

      if (row.is_open && Math.abs(remFCY) > 0) {
        openCount++;
      }
    }); */

// summary: {
//   totalOriginalFCY,
//   totalRemainingFCY,
//   totalOriginalLCY,
//   totalRemainingLCY,
//   openCount,
// },
/* const summaryQuery = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.original_amount_fcy)
            ELSE ABS(e.original_amount_fcy)
          END
        ), 0) AS total_original_fcy,
        COALESCE(SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.remaining_amount_fcy)
            ELSE ABS(e.remaining_amount_fcy)
          END
        ), 0) AS total_remaining_fcy,
        COALESCE(SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.original_amount_lcy)
            ELSE ABS(e.original_amount_lcy)
          END
        ), 0) AS total_original_lcy,
        COALESCE(SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.remaining_amount_lcy)
            ELSE ABS(e.remaining_amount_lcy)
          END
        ), 0) AS total_remaining_lcy,
        COUNT(CASE WHEN e.is_open = true AND ABS(e.remaining_amount_fcy) > 0 THEN 1 END) AS open_count
      FROM ${tableName} e
      WHERE e.company_id = $1 AND e.${partyColumn} = $2
    `;

    const summaryResult = await pool.query(summaryQuery, [companyId, partyId]);
    const sRow = summaryResult.rows[0];

    const summary = {
      totalOriginalFCY: Number(sRow.total_original_fcy),
      totalRemainingFCY: Number(sRow.total_remaining_fcy),
      totalOriginalLCY: Number(sRow.total_original_lcy),
      totalRemainingLCY: Number(sRow.total_remaining_lcy),
      openCount: Number(sRow.open_count),
    }; */