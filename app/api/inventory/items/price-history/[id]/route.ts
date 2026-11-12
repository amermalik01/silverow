// app/api/inventory/items/price-history/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await pool.query(
      `
        SELECT
          h.id,
          h.item_id,
          h.price_list_id,
          h.price_list_item_id,
          h.action,
          h.old_snapshot,
          h.new_snapshot,
          h.changed_fields,
          h.changed_at,
          h.changed_by,
          COALESCE(u.name, 'System User') AS changed_by_name
        FROM price_list_history h
        LEFT JOIN users u
          ON u.id = h.changed_by
        WHERE h.company_id = $1
          AND h.price_list_item_id = $2
        ORDER BY h.changed_at DESC, h.id DESC
      `,
      [companyId, id],
    );

    return NextResponse.json({
      success: true,
      history: result.rows,
    });
  } catch (error: unknown) {
    console.error("Price List History API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch price history.",
      },
      { status: 500 },
    );
  }
}
