// app/api/migration/templates/route.ts

import * as XLSX from "xlsx";
// import { pool } from "@/lib/db";

export const runtime = "nodejs";

// Interface extending standard XLSX WorkSheet to safely include dataValidation property
interface DataValidationRule {
  sqref: string;
  type:
    | "list"
    | "whole"
    | "decimal"
    | "date"
    | "time"
    | "textLength"
    | "custom";
  operator?: string;
  formula1: string;
  formula2?: string;
  allowBlank?: boolean;
  showErrorMessage?: boolean;
  errorTitle?: string;
  error?: string;
}

interface ExtendedWorkSheet extends XLSX.WorkSheet {
  "!dataValidation"?: DataValidationRule[];
}

export async function GET() {
  try {
    const allowedVatRates = [0, 5, 20];
    // Keys match exact Excel column headers visible to users
    const rows = [
      {
        "Line Type": "ITEM", // ITEM or GL_ACCOUNT
        "Item Code": "ITEM001",
        "G/L Account Code": "",
        Description: "XYZ",
        Quantity: 10,
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
        Description: "Shipping & Freight Expense",
        Quantity: 1,
        "Unit Cost": 120.0,
        "Warehouse Code": "",
        "Discount Type": "FIXED",
        "Discount Value": 0,
        "VAT Rate (%)": 0,
      },
    ];

    // const worksheet = XLSX.utils.json_to_sheet(rows);

    // Cast worksheet to ExtendedWorkSheet interface directly
    const worksheet = XLSX.utils.json_to_sheet(rows) as ExtendedWorkSheet;

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

    // / 2. Add Excel Data Validations (Dropdowns) for 100 rows
    const vatListString = `"${allowedVatRates.join(",")}"`;

    worksheet["!dataValidation"] = [
      // Line Type Dropdown (Column A)
      {
        sqref: "A2:A100",
        type: "list",
        operator: "equal",
        formula1: '"ITEM,GL_ACCOUNT"',
        allowBlank: false,
        showErrorMessage: true,
        errorTitle: "Invalid Line Type",
        error: "Please select either ITEM or GL_ACCOUNT from the list.",
      },
      // Discount Type Dropdown (Column H)
      {
        sqref: "H2:H100",
        type: "list",
        operator: "equal",
        formula1: '"PERCENT,FIXED"',
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: "Invalid Discount Type",
        error: "Please select PERCENT or FIXED.",
      },
      // VAT Rate Dropdown (Column J)
      {
        sqref: "J2:J100",
        type: "list",
        operator: "equal",
        formula1: vatListString, // Renders as "0,5,20"
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: "Invalid VAT Rate",
        error: `Allowed VAT rates are: ${allowedVatRates.join("%, ")}%`,
      },
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

    return Response.json({ error: String(err) }, { status: 500 });
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
