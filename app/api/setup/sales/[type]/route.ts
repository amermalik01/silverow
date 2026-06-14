// app/api/setup/sales/[type]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

// Maps routing slugs safely to internal system types
const STAGE_TYPE_MAP: Record<string, string> = {
  order_stages: "sales_order",
  credit_note_stages: "credit_note",
  purchase_order_stages: "purchase_order",
  debit_note_stages: "debit_note",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await pool.connect();
  const { type } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const module_type = searchParams.get("module") ?? "sales";

    if (type in STAGE_TYPE_MAP) {
      const stageType = STAGE_TYPE_MAP[type];
      const result = await client.query(
        `SELECT * FROM common_order_stages 
         WHERE company_id = $1 AND stage_type = $2 
         ORDER BY rank ASC, name ASC`,
        [companyId, stageType],
      );
      return NextResponse.json(result.rows);
    }

    const commonTables = ["segments", "territories"];

    const crmTables = [
      "credit_ratings",
      "buying_groups",
      "sources",
      "order_sources",
    ];

    const table_name = commonTables.includes(type)
      ? type
      : crmTables.includes(type)
        ? `crm_${type}`
        : `srm_${type}`;

    const query = commonTables.includes(type)
      ? `SELECT * FROM ${table_name} WHERE company_id = $1 AND module_type = $2 ORDER BY name`
      : `SELECT * FROM ${table_name} WHERE company_id = $1 ORDER BY name`;

    const values = commonTables.includes(type)
      ? [companyId, module_type]
      : [companyId];

    const result = await client.query(query, values);
    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await pool.connect();
  const { type } = await params;
  const body = await req.json();
  const { name, module } = body;

  try {
    if (type in STAGE_TYPE_MAP) {
      const stageType = STAGE_TYPE_MAP[type];

      // Compute incremental trailing default position offset
      const maxRankRes = await client.query(
        `SELECT COALESCE(MAX(rank), 0) as max_rank FROM common_order_stages WHERE company_id = $1 AND stage_type = $2`,
        [companyId, stageType],
      );
      const nextRank = maxRankRes.rows[0].max_rank + 10;

      const result = await client.query(
        `INSERT INTO common_order_stages (company_id, stage_type, name, rank)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [companyId, stageType, name, nextRank],
      );
      return NextResponse.json(result.rows[0]);
    }

    // --- FALLBACK FOR PRE-EXISTING TABLES ---
    const commonTables = ["segments", "territories"];
    const table_name = commonTables.includes(type)
      ? type
      : [
            "credit_ratings",
            "buying_groups",
            "sources",
            "order_sources",
          ].includes(type)
        ? `crm_${type}`
        : `srm_${type}`;

    const query = commonTables.includes(type)
      ? `INSERT INTO ${table_name} (company_id, module_type, name) VALUES ($1, $2, $3) RETURNING *`
      : `INSERT INTO ${table_name} (company_id, name) VALUES ($1, $2) RETURNING *`;

    const values = commonTables.includes(type)
      ? [companyId, module, name]
      : [companyId, name];
    const result = await client.query(query, values);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* 
  const srmTables = ["selling_groups"];
  let table_name = "";

  if (commonTables.includes(type)) {
    table_name = type;
  } else if (crmTables.includes(type)) {
    table_name = `crm_${type}`;
  } else if (srmTables.includes(type)) {
    table_name = `srm_${type}`;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } */

/* let query = "";
    let values: unknown[] = [];

    if (commonTables.includes(type)) {
      query = `
        SELECT *
        FROM ${table_name}
        WHERE company_id = $1
        AND module_type = $2
        ORDER BY name
      `;
      values = [companyId, module_type];
    } else {
      query = `
        SELECT *
        FROM ${table_name}
        WHERE company_id = $1
        ORDER BY name
      `;
      values = [companyId];
    } 
      */
/* export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = await pool.connect();

  const { type } = await params;
  const body = await req.json();

  const { name, module } = body;

  const commonTables = ["segments", "territories"];

  const crmTables = [
    "credit_ratings",
    "buying_groups",
    "sources",
    "order_sources",
    "order_stages",
  ];

  const srmTables = ["selling_groups"];

  let table_name = "";

  if (commonTables.includes(type)) {
    table_name = type;
  } else if (crmTables.includes(type)) {
    table_name = `crm_${type}`;
  } else if (srmTables.includes(type)) {
    table_name = `srm_${type}`;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    let query = "";
    let values: unknown[] = [];

    if (commonTables.includes(type)) {
      query = `
        INSERT INTO ${table_name}
        (company_id, module_type, name)
        VALUES ($1,$2,$3)
        RETURNING *
      `;

      values = [companyId, module, name];
    } else {
      query = `
        INSERT INTO ${table_name}
        (company_id, name)
        VALUES ($1,$2)
        RETURNING *
      `;

      values = [companyId, name];
    }

    const result = await client.query(query, values);

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
} */
