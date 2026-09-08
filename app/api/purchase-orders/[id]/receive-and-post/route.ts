// app/api/purchase-orders/[id]/receive-and-post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";
import { PurchaseInvoicePostingService } from "@/lib/services/purchase-invoices/purchase-invoice-posting.service";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface ReceiveAndPostRequestBody {
  supplier_invoice_no: string;
  invoice_date?: string;
  due_date?: string;
  posting_date?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
  order: {
    supplier_id: string;
    receipt_date?: string;
    posting_date?: string;
    reference?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const userId = req.headers.get("x-user-id") || undefined;
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: ReceiveAndPostRequestBody = await req.json();

    if (!body.supplier_invoice_no) {
      return NextResponse.json(
        { success: false, error: "Supplier Invoice Number is required." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // ==========================================
    // STEP 1: RECEIVE REMAINING UNFULFILLED STOCK
    // ==========================================
    const poLinesResult = await client.query(
      `
      SELECT 
        id,
        line_no,
        item_id,
        warehouse_id,
        quantity,
        received_quantity,
        unit_cost,
        discount_amount,
        line_type
      FROM purchase_order_lines
      WHERE purchase_order_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId],
    );

    const dbLines = poLinesResult.rows;
    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const rec = Number(l.received_quantity || 0);
      return qty - rec > 0;
    });

    if (unfulfilledLines.length > 0) {
      const receiptPayload: PurchaseReceiptPayload = {
        receipt: {
          purchase_order_id: id,
          vendor_id: body.order.supplier_id,
          receipt_date:
            body.order.receipt_date || new Date().toISOString().split("T")[0],
          posting_date:
            body.order.posting_date || new Date().toISOString().split("T")[0],
          reference_no: body.order.reference,
          notes: body.order.notes,
          currency_id: body.order.currency_id,
          exchange_rate: body.order.exchange_rate,
          userId,
        },
        lines: unfulfilledLines.map((line, idx) => {
          const remainingQty =
            Number(line.quantity || 0) - Number(line.received_quantity || 0);
          const rawCost = Number(line.unit_cost || 0);
          const totalLineQty = Number(line.quantity || 1);
          const totalDiscount = Number(line.discount_amount || 0);

          const discountPerUnit = totalDiscount / totalLineQty;
          const netUnitCost = rawCost - discountPerUnit;

          return {
            line_no: idx + 1,
            purchase_order_line_id: line.id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: remainingQty,
            unit_cost: netUnitCost,
          };
        }),
      };

      await PurchaseReceiptService.createTransactional(
        client,
        companyId,
        receiptPayload,
      );
    }

    // ==========================================
    // STEP 2: POST PURCHASE INVOICE TO GL / AP
    // ==========================================
    const invoiceResult =
      await PurchaseInvoicePostingService.postInvoiceTransactional(client, {
        companyId,
        purchaseOrderId: id,
        userId,
        skip3WayMatchCheck: true, // Bypass check since stock is received in Step 1
        invoiceData: {
          supplier_invoice_no: body.supplier_invoice_no,
          invoice_date: body.invoice_date,
          due_date: body.due_date,
          posting_date: body.posting_date,
          notes: body.notes,
          currency_id: body.currency_id,
          exchange_rate: body.exchange_rate,
        },
        financials: body.financials,
      });

    // ==========================================
    // STEP 3: RECALCULATE PO STATUS & COMMIT
    // ==========================================
    await PurchaseOrderService.recalculateStatus(client, id);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoiceId: invoiceResult.id,
      invoiceNo: invoiceResult.invoice_no,
      message: "Stock received & Purchase Invoice posted cleanly.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("[RECEIVE_AND_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to receive stock and post invoice.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
