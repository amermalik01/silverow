// app/api/inventory/items/[id]/cards-activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import {
  ItemActivityService,
  type ItemMovement,
  type ItemAllocation,
} from "@/lib/services/inventory/item-activity.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type StockDetailRow = {
  id: string;

  document_type: string;
  document_url: string | null;

  date: string | null;
  document_no: string | null;

  invoice_no: string | null;
  invoice_url: string | null;

  consignment_no: string | null;
  batch_no: string | null;
  serial_no: string | null;

  production_date: string | null;
  use_by_date: string | null;
  received_date: string | null;
  dispatch_date: string | null;

  warehouse: string;
  storage_location: string | null;

  qty: number;
  sold_qty: number | null;
  allocated_qty: number | null;
  available_qty: number | null;

  uom: string | null;

  direction?: string;
  status?: string;
};

const transactionLabels: Record<string, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt",
  PURCHASE_RETURN: "Purchase Return",

  SALES_SHIPMENT: "Sales Shipment",
  SHIPMENT: "Sales Shipment",

  STOCK_TRANSFER_OUT: "Stock Transfer Out",
  STOCK_TRANSFER_IN: "Stock Transfer In",

  OPENING_BALANCE: "Opening Balance",

  ITEM_JOURNAL_IN: "Item Journal Positive",
  ITEM_JOURNAL_OUT: "Item Journal Negative",

  DEBIT_NOTE_RETURN: "Debit Note Return",
  CREDIT_NOTE_RETURN: "Credit Note Return",

  ADJUSTMENT: "Stock Adjustment",
  TRANSFER: "Stock Transfer",
  RETURN: "Stock Return",
  PRODUCTION: "Production",
};

function getTransactionLabel(
  transactionType: string,
  direction: "IN" | "OUT",
): string {
  return (
    transactionLabels[transactionType] ??
    (direction === "IN" ? "Stock Receipt" : "Stock Issue")
  );
}

function getAllocationLabel(allocation: ItemAllocation): string {
  if (allocation.allocation_category === "CONSUMPTION") {
    return "Posted Stock Consumption";
  }

  if (allocation.allocation_category === "RESERVATION") {
    return "Sales Order Reservation";
  }

  if (allocation.purchase_order_line_id) {
    return "Purchase Order Allocation";
  }

  if (allocation.purchase_invoice_line_id) {
    return "Purchase Invoice Allocation";
  }

  if (allocation.debit_note_line_id) {
    return "Debit Note Allocation";
  }

  if (allocation.credit_note_line_id) {
    return "Credit Note Allocation";
  }

  if (allocation.journal_line_id) {
    return "Item Journal Allocation";
  }

  if (allocation.sales_order_line_id) {
    return "Sales Order Allocation";
  }

  return "Stock Allocation";
}

function mapTransaction(movement: ItemMovement): StockDetailRow {
  const isInbound = movement.movement_direction === "IN";

  const isSalesShipment =
    movement.transaction_type === "SALES_SHIPMENT" ||
    movement.transaction_type === "SHIPMENT";

  return {
    id: movement.id,

    document_type: getTransactionLabel(
      movement.transaction_type,
      movement.movement_direction,
    ),

    // Actual document/order detail page.
    document_url: movement.document_url ?? null,

    date: movement.posting_date,
    document_no: movement.transaction_no,

    // Invoice details come from the linked order header.
    invoice_no: movement.invoice_no ?? null,
    invoice_url: movement.invoice_url ?? null,

    consignment_no: null,

    batch_no: movement.batch_no,
    serial_no: movement.tracking_code,

    production_date: null,
    use_by_date: movement.expiry_date,

    received_date: isInbound ? movement.posting_date : null,
    dispatch_date: isInbound ? null : movement.posting_date,

    warehouse: movement.warehouse_name,

    storage_location:
      movement.location_name ??
      movement.tracking_code ??
      movement.bin_code,

    qty: isInbound ? movement.quantity : -movement.quantity,

    sold_qty: isSalesShipment ? movement.quantity : null,

    allocated_qty: null,

    available_qty: isInbound ? movement.remaining_quantity : null,

    uom: null,

    direction: movement.movement_direction,
    status: movement.status,
  };
}

function mapAllocation(allocation: ItemAllocation): StockDetailRow {
  const isReservation =
    allocation.allocation_category === "RESERVATION";

  return {
    id: allocation.id,

    document_type: getAllocationLabel(allocation),

    // Allocation records currently contain line references,
    // not a resolved document detail URL.
    document_url: null,

    date: allocation.created_at,

    document_no: null,

    invoice_no: null,
    invoice_url: null,

    consignment_no: null,

    batch_no: allocation.batch_no,
    serial_no: allocation.tracking_code,

    production_date: allocation.prod_date,
    use_by_date: allocation.expiry_date,

    received_date: allocation.date_received,
    dispatch_date: null,

    warehouse: allocation.warehouse_name,

    storage_location:
      allocation.location_name ??
      allocation.tracking_code ??
      allocation.bin_code,

    qty: allocation.allocated_quantity,

    sold_qty: null,

    allocated_qty: allocation.allocated_quantity,

    // Only reservations reduce uncommitted availability.
    // The allocation record itself does not contain the
    // current available stock balance.
    available_qty: null,

    uom: null,

    direction: isReservation ? "RESERVED" : "ALLOCATED",
    status: allocation.status,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const activity = await ItemActivityService.getActivity(
      companyId,
      itemId,
    );

    const transactions: StockDetailRow[] =
      activity.transactions.map(mapTransaction);

    const allocations: StockDetailRow[] =
      activity.allocations.map(mapAllocation);

    return NextResponse.json({
      summary: activity.summary,
      warehouseStock: activity.warehouseStock,
      transactions,
      allocations,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "ITEM_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 },
      );
    }

    console.error("Item Cards Activity API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item card activity",
      },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import {
  ItemActivityService,
  type ItemMovement,
  type ItemAllocation,
} from "@/lib/services/inventory/item-activity.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type StockDetailRow = {
  id: string;
  document_type: string;
  date: string | null;
  document_no: string | null;
  invoice_no: string | null;


  consignment_no: string | null;
  batch_no: string | null;
  serial_no: string | null;
  production_date: string | null;
  use_by_date: string | null;
  received_date: string | null;
  dispatch_date: string | null;
  warehouse: string;
  storage_location: string | null;
  qty: number;
  sold_qty: number | null;
  allocated_qty: number | null;
  available_qty: number | null;
  uom: string | null;
  direction?: string;
  status?: string;
};

const transactionLabels: Record<string, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt",
  PURCHASE_RETURN: "Purchase Return",
  SALES_SHIPMENT: "Sales Shipment",
  SHIPMENT: "Sales Shipment",
  STOCK_TRANSFER_OUT: "Stock Transfer Out",
  STOCK_TRANSFER_IN: "Stock Transfer In",
  OPENING_BALANCE: "Opening Balance",
  ITEM_JOURNAL_IN: "Item Journal Positive",
  ITEM_JOURNAL_OUT: "Item Journal Negative",
  DEBIT_NOTE_RETURN: "Debit Note Return",
  CREDIT_NOTE_RETURN: "Credit Note Return",
  ADJUSTMENT: "Stock Adjustment",
  TRANSFER: "Stock Transfer",
  RETURN: "Stock Return",
  PRODUCTION: "Production",
};

function getTransactionLabel(
  transactionType: string,
  direction: "IN" | "OUT",
): string {
  return (
    transactionLabels[transactionType] ??
    (direction === "IN" ? "Stock Receipt" : "Stock Issue")
  );
}

function getAllocationLabel(allocation: ItemAllocation): string {
  if (allocation.allocation_category === "CONSUMPTION") {
    return "Posted Stock Consumption";
  }

  if (allocation.allocation_category === "RESERVATION") {
    return "Sales Order Reservation";
  }

  if (allocation.purchase_order_line_id) {
    return "Purchase Order Allocation";
  }

  if (allocation.purchase_invoice_line_id) {
    return "Purchase Invoice Allocation";
  }

  if (allocation.debit_note_line_id) {
    return "Debit Note Allocation";
  }

  if (allocation.credit_note_line_id) {
    return "Credit Note Allocation";
  }

  if (allocation.journal_line_id) {
    return "Item Journal Allocation";
  }

  if (allocation.sales_order_line_id) {
    return "Sales Order Allocation";
  }

  return "Stock Allocation";
}

function mapTransaction(movement: ItemMovement): StockDetailRow {
  const isInbound = movement.movement_direction === "IN";

  return {
    id: movement.id,

    document_type: getTransactionLabel(
      movement.transaction_type,
      movement.movement_direction,
    ),

    date: movement.posting_date,
    document_no: movement.transaction_no,

    invoice_no: null,
    consignment_no: null,

    batch_no: movement.batch_no,
    serial_no: movement.tracking_code,
    production_date: null,
    use_by_date: movement.expiry_date,
    received_date: isInbound ? movement.posting_date : null,
    dispatch_date: isInbound ? null : movement.posting_date,

    warehouse: movement.warehouse_name,
    storage_location:
      movement.location_name ?? movement.tracking_code ?? movement.bin_code,

    qty: isInbound ? movement.quantity : -movement.quantity,

    sold_qty:
      movement.transaction_type === "SALES_SHIPMENT" ||
      movement.transaction_type === "SHIPMENT"
        ? movement.quantity
        : null,

    allocated_qty: null,

    available_qty: isInbound ? movement.remaining_quantity : null,

    uom: null,
    direction: movement.movement_direction,
    status: movement.status,
  };
}

function mapAllocation(allocation: ItemAllocation): StockDetailRow {
  const isReservation = allocation.allocation_category === "RESERVATION";

  return {
    id: allocation.id,

    document_type: getAllocationLabel(allocation),
    date: allocation.created_at,

    // The allocation schema contains line IDs,
    // not the human-readable document number.
    document_no: null,
    invoice_no: null,
    consignment_no: null,

    batch_no: allocation.batch_no,
    serial_no: allocation.tracking_code,
    
    production_date: allocation.prod_date,
    use_by_date: allocation.expiry_date,
    received_date: allocation.date_received,
    dispatch_date: null,

    warehouse: allocation.warehouse_name,

    storage_location:
      allocation.location_name ??
      allocation.tracking_code ??
      allocation.bin_code,

    qty: allocation.allocated_quantity,
    sold_qty: null,

    allocated_qty: allocation.allocated_quantity,

    // Only a reservation reduces uncommitted
    // availability. An allocation row itself
    // does not contain the available stock balance.
    available_qty: null,

    uom: null,

    direction: isReservation ? "RESERVED" : "ALLOCATED",
    status: allocation.status,
  };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const activity = await ItemActivityService.getActivity(companyId, itemId);

    const transactions: StockDetailRow[] =
      activity.transactions.map(mapTransaction);

    const allocations: StockDetailRow[] =
      activity.allocations.map(mapAllocation);

    return NextResponse.json({
      summary: activity.summary,
      warehouseStock: activity.warehouseStock,
      transactions,
      allocations,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.error("Item Cards Activity API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item card activity",
      },
      { status: 500 },
    );
  }
} */
