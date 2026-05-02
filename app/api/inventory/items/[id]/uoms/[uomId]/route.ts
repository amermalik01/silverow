// app/api/inventory/items/[id]/uoms/[uomId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
    uomId: string;
  }>;
};

export async function PUT(
  req: NextRequest,
  { params }: Params,
) {
  const client = await pool.connect();

  try {
    const session =
      await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const { id, uomId } =
      await params;

    await client.query("BEGIN");

    /*
      ONLY ONE BASE UOM
    */

    if (body.is_base === true) {
      await client.query(
        `
          UPDATE item_uoms
          SET is_base = FALSE
          WHERE item_id = $1
            AND id <> $2
        `,
        [id, uomId],
      );
    }

    const result =
      await client.query(
        `
          UPDATE item_uoms

          SET
            uom_id = $1,

            is_base = $2,

            conversion_factor = $3,

            barcode = $4,

            weight = $5,

            volume = $6

          WHERE id = $7

          RETURNING *
        `,
        [
          body.uom_id,

          body.is_base,

          body.conversion_factor,

          body.barcode || null,

          body.weight || null,

          body.volume || null,

          uomId,
        ],
      );

    await client.query("COMMIT");

    return NextResponse.json(
      result.rows[0],
    );
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      {
        error:
          "Failed to update item UOM",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  _req: Request,
  { params }: Params,
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { uomId } =
      await params;

    await pool.query(
      `
        DELETE FROM item_uoms
        WHERE id = $1
      `,
      [uomId],
    );

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          "Failed to delete item UOM",
      },
      {
        status: 500,
      },
    );
  }
}