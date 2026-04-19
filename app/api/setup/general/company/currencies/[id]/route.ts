// app/api/setup/general/company/currencies/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const client = await pool.connect();

  try {
    const { id } = await params;
    // Check if base currency
    const check = await client.query(
      `
      SELECT is_base FROM company_currencies
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (check.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (check.rows[0].is_base) {
      return NextResponse.json(
        { error: "Cannot delete base currency" },
        { status: 400 },
      );
    }

    await client.query(
      `DELETE FROM company_currencies WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
