// app/components/purchases/purchase-orders/utils/purchaseOrder.validation.ts

import { PurchaseOrder, PurchaseOrderLineUI } from "@/types/purchase-order";

export function validatePurchaseOrderDates(
  order: Partial<PurchaseOrder>,
): string[] {
  const errors: string[] = [];

  const orderDate = order.order_date
    ? new Date(order.order_date).getTime()
    : null;

  const invoiceDate = order.invoice_date
    ? new Date(order.invoice_date).getTime()
    : null;

  const requiredReceiptDate = order.req_receipt_date
    ? new Date(order.req_receipt_date).getTime()
    : null;

  const receiptDate = order.receipt_date
    ? new Date(order.receipt_date).getTime()
    : null;

  if (orderDate && invoiceDate && orderDate > invoiceDate) {
    errors.push("Order Date cannot be after Invoice Date.");
  }

  if (orderDate && requiredReceiptDate && orderDate > requiredReceiptDate) {
    errors.push("Order Date cannot be after Required Receipt Date.");
  }

  if (orderDate && receiptDate && orderDate > receiptDate) {
    errors.push("Order Date cannot be after Receipt Date.");
  }

  if (requiredReceiptDate && receiptDate && requiredReceiptDate > receiptDate) {
    errors.push("Receipt Date cannot be before Required Receipt Date.");
  }

  return errors;
}

export function validatePurchaseOrderLines(
  lines: PurchaseOrderLineUI[],
): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Purchase orders require at least one line."];
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const lineType = line.line_type || "ITEM";
    const quantity = Number(line.quantity || 0);

    if (lineType === "ITEM") {
      if (!line.item_id) {
        errors.push(`Line ${lineNo}: Please select an item.`);
      }

      if (!line.warehouse_id) {
        errors.push(`Line ${lineNo}: Warehouse is required.`);
      }

      if (quantity <= 0) {
        errors.push(`Line ${lineNo}: Quantity must be greater than zero.`);
      }
    } else if (lineType === "GL_ACCOUNT") {
      if (!line.gl_account_id) {
        errors.push(`Line ${lineNo}: Please select a G/L account.`);
      }

      if (quantity <= 0) {
        errors.push(`Line ${lineNo}: Quantity must be greater than zero.`);
      }
    } else {
      errors.push(`Line ${lineNo}: Invalid line type.`);
    }
  });

  return errors;
}

export function validatePurchaseOrder(
  order: Partial<PurchaseOrder>,
  lines: PurchaseOrderLineUI[],
  currencyId: string,
  includeLines = true,
): string[] {
  const errors: string[] = [];

  if (!order.supplier_id) {
    errors.push("Supplier selection is required.");
  }

  if (
    !order.purchase_posting_group_id &&
    !order.vat_business_posting_group_id
  ) {
    errors.push(
      "Selected supplier does not have a valid Purchase/VAT Posting Group assigned.",
    );
  }

  if (!currencyId) {
    errors.push("Transactional currency is required.");
  }

  if (includeLines) {
    errors.push(...validatePurchaseOrderLines(lines));
  }

  errors.push(...validatePurchaseOrderDates(order));

  return errors;
}

export function validatePurchaseOrderForStockAction(
  lines: PurchaseOrderLineUI[],
): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Purchase order has no lines."];
  }

  const allGLAccountLines = lines.every(
    (line) => (line.line_type || "ITEM") === "GL_ACCOUNT",
  );

  if (allGLAccountLines) {
    return [];
  }

  const hasItemLines = lines.some(
    (line) => (line.line_type || "ITEM") === "ITEM",
  );

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const lineType = line.line_type || "ITEM";

    if (lineType === "ITEM") {
      const quantity = Number(line.quantity || 0);

      if (!line.item_id) {
        errors.push(`Line ${lineNo}: Item is required.`);
        return;
      }

      if (!line.warehouse_id) {
        errors.push(`Line ${lineNo}: Warehouse is required.`);
        return;
      }

      if (quantity <= 0) {
        errors.push(`Line ${lineNo}: Quantity must be greater than zero.`);
        return;
      }

      if (hasItemLines) {
        const allocations = line.allocations || line.initialAllocations || [];

        const allocatedQuantity = allocations.reduce(
          (sum, allocation) => sum + Number(allocation.quantity || 0),
          0,
        );

        if (allocatedQuantity !== quantity) {
          errors.push(
            `Line ${lineNo}: Stock allocation is incomplete. ` +
              `Allocated ${allocatedQuantity} of ${quantity}.`,
          );
        }
      }
    }

    if (lineType === "GL_ACCOUNT" && !line.gl_account_id) {
      errors.push(`Line ${lineNo}: G/L account is required.`);
    }
  });

  return errors;
}
