// /app/api/sales/sales-returns/[id]/post-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnPostingService } from "@/lib/services/sales/sales-return-posting.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface postSalesReturnRequestBody {
  customer_credit_note_no?: string;
  credit_note_date?: string;
  due_date?: string;
  posting_date?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;
    const userId = req.headers.get("x-user-id") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: postSalesReturnRequestBody = await req.json();

    const result = await SalesReturnPostingService.postSalesReturn({
      companyId,
      salesReturnId: id,
      userId,
      creditNoteData: {
        customer_credit_note_no: body.customer_credit_note_no,
        credit_note_date: body.credit_note_date,
        due_date: body.due_date,
        posting_date: body.posting_date,
        notes: body.notes,
        currency_id: body.currency_id,
        exchange_rate: body.exchange_rate,
      },
      financials: body.financials,
    });

    return NextResponse.json({
      success: true,
      creditNoteId: result.id,
      creditNoteNo: result.credit_note_no,
      message: "Sales credit note posted successfully.",
    });
  } catch (err: unknown) {
    console.error("[SALES_CREDIT_NOTE_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to post sales credit note.",
      },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

// Replace with your application's actual auth session extraction logic
async function getUserId(): Promise<string | undefined> {
  return "00000000-0000-0000-0000-000000000000";
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized Access" },
        { status: 401 },
      );
    }

    const userId = await getUserId();
    const { id } = await params;

    await client.query("BEGIN");

    // const result = await SalesReturnService.post(client, id, companyId, userId);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      // message: `Credit Note ${result.creditNoteNo} generated from Return ${result.returnNo} posted successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      "Critical failure during Credit Note posting operations:",
      error,
    );

    const dbError = error as { code?: string; message?: string };
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Execution engine failed processing transaction request.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
 */
