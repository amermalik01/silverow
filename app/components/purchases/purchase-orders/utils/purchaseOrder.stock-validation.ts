// app/components/purchases/purchase-orders/utils/purchaseOrder.stock-validation.ts

import type { PurchaseOrderLineUI, PO_StockAllocationRecord } from "@/types/purchase-order";

export type ItemTrackingType = "NONE" | "BATCH" | "SERIAL" | "BATCH_SERIAL";

export type ReceiptScope =
  | { type: "ALL_LINES" }
  | { type: "SELECTED_LINES"; lineIds: string[] };

const EPSILON = 0.000001;

const roundQty = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

const equalQty = (a: number, b: number): boolean =>
  Math.abs(roundQty(a - b)) < EPSILON;

export function getLineAllocations(
  line: PurchaseOrderLineUI,
): PO_StockAllocationRecord[] {
  return (
    line.allocations ??
    line.stock_allocations ??
    line.po_line_allocations ??
    line.initialAllocations ??
    []
  );
}

export function getLineAllocationQuantity(line: PurchaseOrderLineUI): number {
  return roundQty(
    getLineAllocations(line).reduce(
      (sum, allocation) => sum + Number(allocation.quantity || 0),
      0,
    ),
  );
}

export function isLineFullyAllocated(line: PurchaseOrderLineUI): boolean {
  if (line.line_type !== "ITEM") return true;

  const quantity = Number(line.quantity);

  return (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    equalQty(getLineAllocationQuantity(line), quantity)
  );
}

export function isLineFullyReceived(line: PurchaseOrderLineUI): boolean {
  if (line.line_type !== "ITEM") return true;

  const quantity = Number(line.quantity);
  const received = Number(line.received_quantity ?? 0);

  return quantity > 0 && equalQty(received, quantity);
}

export function validateStockAllocations(
  allocations: PO_StockAllocationRecord[],
  targetQuantity: number,
  trackingType: ItemTrackingType,
): string[] {
  const errors: string[] = [];
  const serialNumbers = new Set<string>();

  if (!Number.isFinite(targetQuantity) || targetQuantity <= 0) {
    return ["Target quantity must be greater than zero."];
  }

  if (allocations.length === 0) {
    return ["At least one allocation is required."];
  }

  let totalQuantity = 0;

  allocations.forEach((allocation, index) => {
    const row = index + 1;
    const quantity = Number(allocation.quantity);
    const batchNo = allocation.batch_no?.trim() ?? "";
    const serialNo = allocation.serial_no?.trim() ?? "";

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Allocation ${row}: Quantity must be positive.`);
      return;
    }

    if (!allocation.location_id) {
      errors.push(`Allocation ${row}: Storage location is required.`);
    }

    if (
      (trackingType === "BATCH" || trackingType === "BATCH_SERIAL") &&
      !batchNo
    ) {
      errors.push(`Allocation ${row}: Batch number is required.`);
    }

    if (trackingType === "SERIAL" || trackingType === "BATCH_SERIAL") {
      if (!serialNo) {
        errors.push(`Allocation ${row}: Serial number is required.`);
      }

      if (!equalQty(quantity, 1)) {
        errors.push(`Allocation ${row}: Serial-tracked quantity must be 1.`);
      }

      if (serialNo) {
        const normalizedSerial = serialNo.toUpperCase();

        if (serialNumbers.has(normalizedSerial)) {
          errors.push(
            `Allocation ${row}: Duplicate serial number ${serialNo}.`,
          );
        }

        serialNumbers.add(normalizedSerial);
      }
    }
    // } else if (serialNo) {
    //   errors.push(
    //     `Allocation ${row}: Serial number is not allowed for ` +
    //       `${trackingType} tracking.`,
    //   );
    // }

    if (
      allocation.prod_date &&
      allocation.date_received &&
      allocation.prod_date > allocation.date_received
    ) {
      errors.push(
        `Allocation ${row}: Production date cannot be after receipt date.`,
      );
    }

    if (
      allocation.expiry_date &&
      allocation.prod_date &&
      allocation.expiry_date < allocation.prod_date
    ) {
      errors.push(
        `Allocation ${row}: Expiry date cannot be before production date.`,
      );
    }

    totalQuantity += quantity;
  });

  if (!equalQty(totalQuantity, targetQuantity)) {
    errors.push(
      `Stock allocation incomplete: ` +
        `${roundQty(totalQuantity)} of ${targetQuantity}.`,
    );
  }

  return errors;
}

export function validateReceiptScope(
  lines: PurchaseOrderLineUI[],
  scope: ReceiptScope,
): string[] {
  const errors: string[] = [];

  const activeItemLines = lines.filter(
    (line) =>
      (line.line_type === "ITEM" || (!line.line_type && !!line.item_id)) &&
      !line.is_deleted,
  );

  const requestedIds =
    scope.type === "SELECTED_LINES"
      ? scope.lineIds
      : activeItemLines
          .filter(
            (line) =>
              Number(line.received_quantity ?? 0) === 0 &&
              Number(line.cancelled_quantity ?? 0) === 0,
          )
          .map((line) => line.id)
          .filter((id): id is string => !!id);

  if (
    requestedIds.length === 0 ||
    new Set(requestedIds).size !== requestedIds.length
  ) {
    return ["Select at least one outstanding purchase order item line."];
  }

  const lineMap = new Map(
    activeItemLines
      .filter((line): line is PurchaseOrderLineUI & { id: string } => !!line.id)
      .map((line) => [line.id, line]),
  );

  for (const id of requestedIds) {
    const line = lineMap.get(id);

    if (!line) {
      errors.push(
        `Selected line ${id} does not belong to the active item lines.`,
      );
      continue;
    }

    const label = line.item_code || `Line ${line.line_no ?? id}`;

    const ordered = Number(line.quantity);
    const received = Number(line.received_quantity ?? 0);
    const cancelled = Number(line.cancelled_quantity ?? 0);

    if (!Number.isFinite(ordered) || ordered <= 0) {
      errors.push(`${label}: Invalid ordered quantity.`);
      continue;
    }

    if (received !== 0 || cancelled !== 0) {
      errors.push(`${label}: Already received or cancelled.`);
      continue;
    }

    if (!line.warehouse_id) {
      errors.push(`${label}: Warehouse is required.`);
    }

    if (!isLineFullyAllocated(line)) {
      errors.push(
        `${label}: Entire ordered quantity must be allocated. ` +
          `Allocated ${getLineAllocationQuantity(line)} of ${ordered}.`,
      );
    }
  }

  return errors;
}

/* export function validateReceiptScope(
  lines: PurchaseOrderLineUI[],
  scope: ReceiptScope,
): string[] {
  const errors: string[] = [];

  const activeItemLines = lines.filter(
    (line) => line.line_type === "ITEM" && !line.is_deleted,
  );

  const selectedIds =
    scope.type === "SELECTED_LINES" ? new Set(scope.lineIds) : null;

  const selectedLines = selectedIds
    ? activeItemLines.filter((line) => line.id && selectedIds.has(line.id))
    : activeItemLines;

  if (selectedLines.length === 0) {
    return ["No eligible purchase order item lines selected."];
  }

  for (const line of selectedLines) {
    const label =
      line.item_code ?? String(line.line_no ?? line.id ?? "Unknown");

    if (!line.id) {
      errors.push(`${label}: Save the purchase order first.`);
      continue;
    }

    const quantity = Number(line.quantity);
    const received = Number(line.received_quantity ?? 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`${label}: Invalid ordered quantity.`);
      continue;
    }

    if (received > EPSILON) {
      errors.push(`${label}: This line already has received stock.`);
      continue;
    }

    if (!isLineFullyAllocated(line)) {
      errors.push(`${label}: Entire ordered quantity must be allocated.`);
    }
  }

  return errors;
} */
