// app/api/purchase-orders/[id]/receive/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import {
  PurchaseReceiptService,
  type PurchaseReceiptScope,
} from "@/lib/services/purchase-receipts/purchase-receipt.service";

import type { PurchaseReceiptPayload } from "@/types/purchase-receipt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IncomingOrder = {
  receipt_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
};

type ReceiveRequest = {
  scope?: unknown;
  order?: IncomingOrder;
};

type PurchaseOrderHeader = {
  id: string;
  supplier_id: string;
  reference: string | null;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReceiptScope(value: unknown): PurchaseReceiptScope {
  // Backward compatibility for older callers.
  if (value === undefined || value === null) {
    return { type: "ALL_LINES" };
  }

  if (!isRecord(value)) {
    throw new Error("Invalid receipt scope.");
  }

  if (value.type === "ALL_LINES") {
    return { type: "ALL_LINES" };
  }

  if (value.type === "SELECTED_LINES") {
    const ids = value.lineIds;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      !ids.every(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    ) {
      throw new Error("Selected receipt scope requires valid line IDs.");
    }

    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      throw new Error("Duplicate purchase order line IDs are not allowed.");
    }

    return {
      type: "SELECTED_LINES",
      lineIds: ids,
    };
  }

  throw new Error("Unsupported receipt scope.");
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  return value;
}

function parseRequest(value: unknown): {
  scope: PurchaseReceiptScope;
  order: IncomingOrder;
} {
  if (!isRecord(value)) {
    throw new Error("Invalid request body.");
  }

  const scope = parseReceiptScope(value.scope);

  if (value.order !== undefined && !isRecord(value.order)) {
    throw new Error("Invalid order details.");
  }

  const rawOrder = isRecord(value.order) ? value.order : {};

  return {
    scope,
    order: {
      receipt_date: parseOptionalString(rawOrder.receipt_date, "receipt_date"),
      posting_date: parseOptionalString(rawOrder.posting_date, "posting_date"),
      reference: parseOptionalString(rawOrder.reference, "reference"),
      notes: parseOptionalString(rawOrder.notes, "notes"),
    },
  };
}

function normalizeApiDate(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(trimmed)) {
    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  throw new Error("Date must be YYYY-MM-DD or a valid ISO 8601 UTC timestamp.");
}

async function lockPurchaseOrder(
  client: PoolClient,
  companyId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrderHeader> {
  const result = await client.query<PurchaseOrderHeader>(
    `
      SELECT
        id,
        supplier_id,
        reference,
        status
      FROM purchase_orders
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
    `,
    [purchaseOrderId, companyId],
  );

  const po = result.rows[0];

  if (!po) {
    throw new Error("Purchase order not found.");
  }

  if (["completed", "POSTED", "cancelled", "CANCELLED"].includes(po.status)) {
    throw new Error(
      `Purchase order cannot receive stock in status ${po.status}.`,
    );
  }

  return po;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order ID is required.",
        },
        { status: 400 },
      );
    }

    const rawBody: unknown = await req.json();
    const { scope, order } = parseRequest(rawBody);

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // All receipt endpoints must lock the PO header first.
    const po = await lockPurchaseOrder(client, companyId, id);

    const today = new Date().toISOString().slice(0, 10);

    // Receipt lines are intentionally empty.
    // The service loads selected PO lines and their
    // saved allocation records directly from the DB.
    const receiptPayload: PurchaseReceiptPayload = {
      receipt: {
        purchase_order_id: id,
        vendor_id: po.supplier_id,

        receipt_date: normalizeApiDate(order.receipt_date, today),

        posting_date: normalizeApiDate(order.posting_date, today),

        reference_no: order.reference ?? po.reference ?? "",
        notes: order.notes ?? "",
      },
      lines: [],
    };

    const receipt = await PurchaseReceiptService.createTransactional(
      client,
      companyId,
      receiptPayload,
      scope,
    );

    // The updated service recalculates PO status
    // after posting the selected full item lines.
    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      receiptId: receipt.id,
      receiptNo: receipt.receipt_no,
      totals: receipt.totals,
      message: "Purchase order item lines received successfully.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Purchase receipt rollback error:", rollbackError);
      }
    }

    console.error("Purchase receipt error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to receive stock.";

    const isClientError =
      message.includes("scope") ||
      message.includes("line") ||
      message.includes("quantity") ||
      message.includes("allocation") ||
      message.includes("already received") ||
      message.includes("not found") ||
      message.includes("cannot receive") ||
      message.includes("No outstanding");

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: isClientError ? 400 : 500 },
    );
  } finally {
    client?.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService,PurchaseReceiptScope } from "@/lib/services/purchase-receipts/purchase-receipt.service";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";


type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingOrder {
  supplier_id: string;
  receipt_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
}

interface RequestBody {
  order: IncomingOrder;
}

function parseReceiptScope(
  value: unknown,
): PurchaseReceiptScope {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error("Receipt scope is required.");
  }

  const record = value as Record<string, unknown>;

  if (record.type === "ALL_LINES") {
    return { type: "ALL_LINES" };
  }

  if (
    record.type === "SELECTED_LINES" &&
    Array.isArray(record.lineIds) &&
    record.lineIds.length > 0 &&
    record.lineIds.every(
      (id): id is string =>
        typeof id === "string" &&
        id.trim().length > 0,
    )
  ) {
    return {
      type: "SELECTED_LINES",
      lineIds: record.lineIds,
    };
  }

  throw new Error("Invalid receipt scope.");
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
        { status: 401 }
      );
    }

    // const body: RequestBody = await req.json();

    const body: unknown = await req.json();

if (
  !body ||
  typeof body !== "object"
) {
  return NextResponse.json(
    { success: false, error: "Invalid request." },
    { status: 400 },
  );
}

const request = body as {
  scope?: unknown;
  order?: {
    receipt_date?: string;
    posting_date?: string;
    reference?: string;
    notes?: string;
  };
};

const scope = parseReceiptScope(request.scope);

    const { order } = body;

    await client.query("BEGIN");

    // 1. Fetch persistent Purchase Order Lines directly from DB with row locks
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
      [id, companyId]
    );

    const dbLines = poLinesResult.rows;

    // 2. Filter for lines that still have remaining quantities to receive
    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const rec = Number(l.received_quantity || 0);
      return qty - rec > 0;
    });

    if (!unfulfilledLines.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          success: false,
          // error: "No unfulfilled line quantities available to receive on this order.",
          error: "No Stock available to receive",
        },
        { status: 400 }
      );
    }

    // 3. Map database lines to the PurchaseReceiptPayload format
    const receiptPayload: PurchaseReceiptPayload = {
      receipt: {
        purchase_order_id: id,
        vendor_id: order.supplier_id,
        receipt_date:
          order.receipt_date || new Date().toISOString().split("T")[0],
        posting_date:
          order.posting_date || new Date().toISOString().split("T")[0],
        reference_no: order.reference,
        notes: order.notes,
        currency_id: order.currency_id,
        exchange_rate: order.exchange_rate,
        userId,
      },
      lines: unfulfilledLines.map((line, idx) => {
        const remainingQty =
          Number(line.quantity || 0) - Number(line.received_quantity || 0);
        const rawCost = Number(line.unit_cost || 0);
        const totalLineQty = Number(line.quantity || 1);
        const totalDiscount = Number(line.discount_amount || 0);

        // Pro-rate discount for remaining quantities
        const discountPerUnit = totalDiscount / totalLineQty;
        const netUnitCost = rawCost - discountPerUnit;

        return {
          line_no: idx + 1,
          purchase_order_line_id: line.id, // Persisted DB UUID guaranteed
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: remainingQty,
          unit_cost: netUnitCost,
        };
      }),
    };

    // 4. Process receipt, GL postings, GRNI entries, and inventory layers
    const receipt = await PurchaseReceiptService.createTransactional(
      client,
      companyId,
      receiptPayload
    );

    // 5. Recalculate status and commit
    await PurchaseOrderService.recalculateStatus(client, id);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, receiptId: receipt.id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stock receive error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to receive stock",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} */
