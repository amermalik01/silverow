// app/api/inventory/items/[id]/uoms/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { QueryResult, QueryResultRow } from "pg";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type ItemUOMRow = QueryResultRow & {
  id: string;
  uom_id: string;
  uom_name: string;

  is_base: boolean;

  conversion_factor: string;

  barcode: string | null;

  weight: string | null;

  volume: string | null;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    const result: QueryResult<ItemUOMRow> = await pool.query(
      `
          SELECT
            iu.id,

            iu.uom_id,

            u.name AS uom_name,

            iu.is_base,

            iu.conversion_factor,

            iu.barcode,

            iu.weight,

            iu.volume

          FROM item_uoms iu

          INNER JOIN uoms u
            ON u.id = iu.uom_id

          WHERE iu.item_id = $1

          ORDER BY
            iu.is_base DESC,
            u.name ASC
        `,
      [id],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load item UOMs",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const companyId = session.user.company_id;

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Company not found",
        },
        {
          status: 400,
        },
      );
    }

    const { id } = await params;

    const body = await req.json();

    await client.query("BEGIN");

    if (body.is_base === true) {
      await client.query(
        `
          UPDATE item_uoms
          SET is_base = FALSE
          WHERE item_id = $1
        `,
        [id],
      );
    }

    const result = await client.query(
      `
          INSERT INTO item_uoms (
            item_id,

            uom_id,

            is_base,

            conversion_factor,

            barcode,

            weight,

            volume
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )

          RETURNING *
        `,
      [
        id,

        body.uom_id,

        body.is_base,

        body.conversion_factor,

        body.barcode || null,

        body.weight || null,

        body.volume || null,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to create item UOM",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
