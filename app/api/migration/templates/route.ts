//  app/api/migration/templates/route.ts

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    {
      item_code: "ITEM001",
      quantity: 10,
      unit_cost: 25,
      warehouse_code: "MAIN",
      description: "Example item",
      discount_type: "",
      discount_value: "",
      vat_percent: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order Lines");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "Content-Disposition":
        'attachment; filename="purchase_order_lines_template.xlsx"',
    },
  });
}

// export async function GET() {
//   return NextResponse.json({
//     module: "PURCHASE_ORDER_LINES",

//     columns: [
//       "item_code",
//       "quantity",
//       "unit_cost",
//       "warehouse_code",
//       "description",
//       "discount_type",
//       "discount_value",
//       "vat_percent",
//     ],
//   });
// }
