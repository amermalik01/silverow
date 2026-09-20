// app/api/migration/templates/route.ts

import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Keys match exact Excel column headers visible to users
    const rows = [
      {
        "Line Type": "ITEM", // ITEM or GL_ACCOUNT
        "Item Code": "ITEM001",
        "G/L Account Code": "",
        "Description": "Standard Desk Chair",
        "Quantity": 10,
        "Unit Cost": 45.5,
        "Warehouse Code": "MAIN",
        "Discount Type": "PERCENT", // PERCENT or FIXED
        "Discount Value": 5,
        "VAT Rate (%)": 20,
      },
      {
        "Line Type": "GL_ACCOUNT",
        "Item Code": "",
        "G/L Account Code": "6000",
        "Description": "Shipping & Freight Expense",
        "Quantity": 1,
        "Unit Cost": 120.0,
        "Warehouse Code": "",
        "Discount Type": "FIXED",
        "Discount Value": 0,
        "VAT Rate (%)": 0,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Optimized column widths matching display names
    worksheet["!cols"] = [
      { wch: 14 }, // Line Type
      { wch: 16 }, // Item Code
      { wch: 20 }, // G/L Account Code
      { wch: 32 }, // Description
      { wch: 12 }, // Quantity
      { wch: 14 }, // Unit Cost
      { wch: 18 }, // Warehouse Code
      { wch: 16 }, // Discount Type
      { wch: 16 }, // Discount Value
      { wch: 14 }, // VAT Rate (%)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PO Lines Template");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="purchase_order_lines_template.xlsx"',
      },
    });
  } catch (err) {
    console.error("Failed to generate Excel template:", err);

    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

/* import * as XLSX from "xlsx";

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
} */
