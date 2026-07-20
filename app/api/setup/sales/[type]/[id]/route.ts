// app/api/setup/sales/[type]/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

const STAGE_TYPE_MAP: Record<string, string> = {
  order_stages: "sales_order",
  credit_note_stages: "credit_note",
  purchase_order_stages: "purchase_order",
  debit_note_stages: "debit_note",
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await pool.connect();
  const { type, id } = await params;
  const { name } = await req.json();

  try {
    if (type in STAGE_TYPE_MAP) {
      const result = await client.query(
        `UPDATE common_order_stages SET name = $1, updated_at = now()
         WHERE id = $2 AND company_id = $3 RETURNING *`,
        [name, id, companyId],
      );
      return NextResponse.json(result.rows[0]);
    }

    // --- FALLBACK PRE-EXISTING LOGIC ---
    const table_name = ["segments", "territories", "classification"].includes(
      type,
    )
      ? type
      : [
            "credit_ratings",
            "buying_groups",
            "sources",
            "order_sources",
            "ownership_type",
            "type",
            "status",
          ].includes(type)
        ? `crm_${type}`
        : `srm_${type}`;

    const result = await client.query(
      `UPDATE ${table_name} SET name = $1, updated_at = now() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [name, id, companyId],
    );
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, id } = await params;
  if (!(type in STAGE_TYPE_MAP)) {
    return NextResponse.json(
      { error: "Operation context invalid" },
      { status: 400 },
    );
  }

  const { direction } = await req.json();
  const stageType = STAGE_TYPE_MAP[type];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentRes = await client.query(
      "SELECT id, rank FROM common_order_stages WHERE id = $1 AND company_id = $2 AND stage_type = $3",
      [id, companyId, stageType],
    );
    if (currentRes.rows.length === 0)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    const currentStage = currentRes.rows[0];

    const targetQuery =
      direction === "up"
        ? `SELECT id, rank FROM common_order_stages WHERE company_id = $1 AND stage_type = $2 AND rank < $3 ORDER BY rank DESC LIMIT 1`
        : `SELECT id, rank FROM common_order_stages WHERE company_id = $1 AND stage_type = $2 AND rank > $3 ORDER BY rank ASC LIMIT 1`;

    const targetRes = await client.query(targetQuery, [
      companyId,
      stageType,
      currentStage.rank,
    ]);

    if (targetRes.rows.length > 0) {
      const targetStage = targetRes.rows[0];
      await client.query(
        "UPDATE common_order_stages SET rank = $1 WHERE id = $2",
        [targetStage.rank, currentStage.id],
      );
      await client.query(
        "UPDATE common_order_stages SET rank = $1 WHERE id = $2",
        [currentStage.rank, targetStage.id],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await pool.connect();
  const { type, id } = await params;

  try {
    if (type in STAGE_TYPE_MAP) {
      await client.query(
        `DELETE FROM common_order_stages WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      return NextResponse.json({ success: true });
    }

    const table_name = ["segments", "territories", "classification"].includes(
      type,
    )
      ? type
      : [
            "credit_ratings",
            "buying_groups",
            "sources",
            "order_sources",
            "ownership_type",
            "type",
            "status",
          ].includes(type)
        ? `crm_${type}`
        : `srm_${type}`;
    await client.query(
      `DELETE FROM ${table_name} WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
