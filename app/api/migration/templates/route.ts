//  app/api/migration/templates/route.ts

// import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  try {
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

    console.log("Generated buffer:", buffer.length);

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="purchase_order_lines_template.xlsx"',
      },
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: String(err),
      },
      {
        status: 500,
      },
    );
  }
}
// return new Response(buffer, {
//   headers: {
//     "Content-Type":
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     "Content-Disposition":
//       'attachment; filename="purchase_order_lines_template.xlsx"',
//     "Content-Length": buffer.length.toString(),
//   },
// });

// return new NextResponse(buffer, {
//   headers: {
//     "Content-Type":
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

//     "Content-Disposition":
//       'attachment; filename="purchase_order_lines_template.xlsx"',
//   },
// });
