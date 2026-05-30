// /app/api/sales/sales-returns/[id]/post/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await client.query("BEGIN");

    const result = await SalesReturnService.post(client, id, companyId);

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: `Credit Note ${result.returnNo} has been posted successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string; message?: string };

    console.error("Aborted posting sales return transaction:", dbError);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Database execution failed during posting process.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
