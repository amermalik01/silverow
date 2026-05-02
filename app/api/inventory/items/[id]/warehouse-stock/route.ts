// api/inventory/items/[id]/warehouse-stock/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
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

  const result = await pool.query(
    `
    SELECT
      wi.id,

      wi.warehouse_id,
      w.name AS warehouse_name,

      wi.location_id,
      wl.name AS location_name,

      wi.quantity,
      wi.reserved_quantity,
      wi.available_quantity,

      wi.average_cost,

      wi.batch_no,
      wi.serial_no,

      wi.last_movement_at

    FROM warehouse_inventory wi

    LEFT JOIN warehouses w
      ON w.id = wi.warehouse_id

    LEFT JOIN warehouse_locations wl
      ON wl.id = wi.location_id

    WHERE wi.item_id = $1

    ORDER BY
      w.name,
      wl.name
    `,
    [id],
  );

  return NextResponse.json(result.rows);
}
