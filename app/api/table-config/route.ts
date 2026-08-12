// app/api/table-config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ColumnConfig } from "@/types/table";

// System Default Fallback Configurations
const DEFAULT_CONFIGS: Record<string, ColumnConfig[]> = {
  purchase_orders: [
    {
      columnKey: "order_no",
      label: "Order No.",
      dataType: "text",
      isVisible: true,
      isPinned: false,
      columnOrder: 1,
      columnWidth: 150,
    },
    {
      columnKey: "supplier_name",
      label: "Supplier Name",
      dataType: "text",
      isVisible: true,
      isPinned: false,
      columnOrder: 2,
      columnWidth: 200,
    },
    {
      columnKey: "order_date",
      label: "Order Date",
      dataType: "date",
      isVisible: true,
      isPinned: false,
      columnOrder: 3,
      columnWidth: 160,
    },
    {
      columnKey: "status",
      label: "Status",
      dataType: "select",
      isVisible: true,
      isPinned: false,
      columnOrder: 4,
      columnWidth: 130,
      options: [
        { label: "Open", value: "OPEN" },
        { label: "Closed", value: "CLOSED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
    {
      columnKey: "total_amount",
      label: "Total Amount",
      dataType: "number",
      isVisible: true,
      isPinned: false,
      columnOrder: 5,
      columnWidth: 140,
    },
    {
      columnKey: "actions",
      label: "Actions",
      dataType: "text",
      isVisible: true,
      isPinned: false,
      columnOrder: 6,
      columnWidth: 160,
    },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleKey = searchParams.get("moduleKey") || "purchase_orders";

  // Replace with logged user context if available
  const userId = "DEFAULT_USER";

  try {
    const res = await pool.query(
      `SELECT column_key as "columnKey", label, data_type as "dataType", is_visible as "isVisible", is_pinned as "isPinned", column_order as "columnOrder", column_width as "columnWidth", header_color as "headerColor"
       FROM table_column_configs 
       WHERE user_id = $1 AND module_key = $2
       ORDER BY column_order ASC`,
      [userId, moduleKey],
    );

    if (res.rows.length > 0) {
      return NextResponse.json(res.rows);
    }

    return NextResponse.json(DEFAULT_CONFIGS[moduleKey] || []);
  } catch {
    return NextResponse.json(DEFAULT_CONFIGS[moduleKey] || []);
  }
}

export async function POST(req: NextRequest) {
  const { moduleKey, configs } = await req.json();
  const userId = "DEFAULT_USER";

  try {
    for (const col of configs as ColumnConfig[]) {
      await pool.query(
        `INSERT INTO table_column_configs (user_id, module_key, column_key, label, data_type, is_visible, is_pinned, column_order, column_width, header_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, module_key, column_key) DO UPDATE SET
           is_visible = EXCLUDED.is_visible,
           is_pinned = EXCLUDED.is_pinned,
           column_order = EXCLUDED.column_order,
           column_width = EXCLUDED.column_width,
           header_color = EXCLUDED.header_color`,
        [
          userId,
          moduleKey,
          col.columnKey,
          col.label,
          col.dataType,
          col.isVisible,
          col.isPinned,
          col.columnOrder,
          col.columnWidth,
          col.headerColor || null,
        ],
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save config error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
