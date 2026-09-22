// utils/salesOrder.validation.ts

import { SalesOrder, SalesOrderLineUI } from "@/types/sales-order";

export function validateSalesOrderDates(order: Partial<SalesOrder>): string[] {
  const errors: string[] = [];

  const orderDate = order.order_date
    ? new Date(order.order_date).getTime()
    : null;

  const invoiceDate = order.posting_date
    ? new Date(order.posting_date).getTime()
    : null;

  const requiredShipmentDate = order.requested_delivery_date
    ? new Date(order.requested_delivery_date).getTime()
    : null;

  const shipmentDate = order.shipment_date
    ? new Date(order.shipment_date).getTime()
    : null;

  if (orderDate && invoiceDate && orderDate > invoiceDate) {
    errors.push("Order Date cannot be after Invoice Date.");
  }

  if (orderDate && requiredShipmentDate && orderDate > requiredShipmentDate) {
    errors.push("Order Date cannot be after Required Shipment Date.");
  }

  if (orderDate && shipmentDate && orderDate > shipmentDate) {
    errors.push("Order Date cannot be after Shipment Date.");
  }

  if (
    requiredShipmentDate &&
    shipmentDate &&
    requiredShipmentDate > shipmentDate
  ) {
    errors.push("Shipment Date cannot be before Required Shipment Date.");
  }

  return errors;
}

export function validateSalesOrderLines(lines: SalesOrderLineUI[]): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Sales orders require at least one line."];
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

export function validateSalesOrder(
  order: Partial<SalesOrder>,
  lines: SalesOrderLineUI[],
  currencyId: string,
  includeLines = true,
): string[] {
  const errors: string[] = [];

  if (!order.customer_id) {
    errors.push("Customer selection is required.");
  }

  /**
   * Sales Order normally requires Sales/VAT posting groups.
   *
   * Adjust these names if your SalesOrder type uses different
   * field names.
   */
  if (!order.customer_posting_group_id && !order.vat_business_posting_group_id) {
    errors.push(
      "Selected customer does not have a valid Sales/VAT Posting Group assigned.",
    );
  }

  if (!currencyId) {
    errors.push("Transactional currency is required.");
  }

  if (includeLines) {
    errors.push(...validateSalesOrderLines(lines));
  }

  errors.push(...validateSalesOrderDates(order));

  return errors;
}

/**
 * Validation used before stock dispatch / invoice posting.
 *
 * ITEM lines must have:
 * - item
 * - warehouse
 * - positive quantity
 * - complete stock allocation
 *
 * GL_ACCOUNT lines don't require stock allocation.
 */
export function validateSalesOrderForStockAction(
  lines: SalesOrderLineUI[],
): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Sales order has no lines."];
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
