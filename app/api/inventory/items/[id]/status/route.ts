// app/api/inventory/items/[id]/status/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{ id: string }>;
};

type ItemStatus = "active" | "inactive";

export async function PATCH(req: Request, { params }: Props) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const status = body.status as ItemStatus;

    if (status !== "active" && status !== "inactive") {
      return NextResponse.json(
        { error: "Status must be 'active' or 'inactive'" },
        { status: 400 },
      );
    }

    // Database convention: 1 = Active, 0 = Inactive
    const statusValue = status === "active" ? 1 : 0;

    const result = await pool.query(
      `
        UPDATE items
        SET
          status = $1,
          updated_at = NOW()
        WHERE
          id = $2
          AND company_id = $3
          AND deleted_at IS NULL
        RETURNING id, status, updated_at
      `,
      [statusValue, id, companyId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Item not found or unauthorized" },
        { status: 404 },
      );
    }

    const updatedItem = result.rows[0];

    return NextResponse.json({
      success: true,
      message: `Item ${status === "active" ? "activated" : "deactivated"} successfully`,
      item: {
        ...updatedItem,
        status_label: status === "active" ? "Active" : "Inactive",
      },
    });
  } catch (error) {
    console.error("Update Item Status Error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update item status" },
      { status: 500 },
    );
  }
}
