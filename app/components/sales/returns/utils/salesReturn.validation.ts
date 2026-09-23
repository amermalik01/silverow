// /app/components/sales/returns/utils/salesReturn.validation.ts

import { SalesReturn, SalesReturnLineUI } from "@/types/sales-return";

export function validateSalesReturnDates(
  returnOrder: Partial<SalesReturn>,
): string[] {
  const errors: string[] = [];

  const creditNoteDate = returnOrder.credit_note_date
    ? new Date(returnOrder.credit_note_date).getTime()
    : null;

  const postingDate = returnOrder.posting_date
    ? new Date(returnOrder.posting_date).getTime()
    : null;

  const orderDate = returnOrder.order_date
    ? new Date(returnOrder.order_date).getTime()
    : null;

  const receiptDate = returnOrder.receipt_date
    ? new Date(returnOrder.receipt_date).getTime()
    : null;

  if (orderDate && creditNoteDate && orderDate > creditNoteDate) {
    errors.push("Original Order Date cannot be after Credit Note Date.");
  }

  if (creditNoteDate && postingDate && creditNoteDate > postingDate) {
    errors.push("Credit Note Date cannot be after Posting Date.");
  }

  if (receiptDate && postingDate && receiptDate > postingDate) {
    errors.push("Goods Receipt Date cannot be after Posting Date.");
  }

  return errors;
}

export function validateSalesReturnLines(lines: SalesReturnLineUI[]): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Sales credit notes require at least one line."];
  }

  lines.forEach((line, index) => {
    const lineNo = line.line_no || index + 1;
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
        errors.push(
          `Line ${lineNo}: Return quantity must be greater than zero.`,
        );
      }
    } else if (lineType === "GL_ACCOUNT") {
      if (!line.gl_account_id) {
        errors.push(`Line ${lineNo}: Please select a G/L account.`);
      }

      if (quantity <= 0) {
        errors.push(`Line ${lineNo}: Quantity must be greater than zero.`);
      }
    } else if (lineType === "COMMENT") {
      if (!line.description || line.description.trim() === "") {
        errors.push(`Line ${lineNo}: Comment line requires a description.`);
      }
    } else {
      errors.push(`Line ${lineNo}: Invalid line type.`);
    }
  });

  return errors;
}

export function validateSalesReturn(
  returnOrder: Partial<SalesReturn>,
  lines: SalesReturnLineUI[],
  currencyId: string,
  includeLines = true,
): string[] {
  const errors: string[] = [];

  if (!returnOrder.customer_id) {
    errors.push("Customer selection is required.");
  }

  if (
    !returnOrder.customer_posting_group_id &&
    !returnOrder.vat_business_posting_group_id &&
    !returnOrder.sales_posting_group_id
  ) {
    errors.push(
      "Selected customer does not have valid Sales/VAT/Customer Posting Groups assigned.",
    );
  }

  if (!returnOrder.credit_note_date) {
    errors.push("Credit Note Date is required.");
  }

  if (!currencyId) {
    errors.push("Transactional currency is required.");
  }

  if (includeLines) {
    errors.push(...validateSalesReturnLines(lines));
  }

  errors.push(...validateSalesReturnDates(returnOrder));

  return errors;
}

export function validateSalesReturnForPosting(
  lines: SalesReturnLineUI[],
): string[] {
  const errors: string[] = [];

  if (lines.length === 0) {
    return ["Credit note has no lines to post."];
  }

  const allGLOrCommentLines = lines.every(
    (line) =>
      (line.line_type || "ITEM") === "GL_ACCOUNT" ||
      (line.line_type || "ITEM") === "COMMENT",
  );

  if (allGLOrCommentLines) {
    return [];
  }

  lines.forEach((line, index) => {
    const lineNo = line.line_no || index + 1;
    const lineType = line.line_type || "ITEM";

    if (lineType === "ITEM") {
      const quantity = Number(line.quantity || 0);

      if (!line.item_id) {
        errors.push(`Line ${lineNo}: Item is required.`);
        return;
      }

      if (!line.warehouse_id) {
        errors.push(`Line ${lineNo}: Warehouse is required for restock.`);
        return;
      }

      if (quantity <= 0) {
        errors.push(
          `Line ${lineNo}: Return quantity must be greater than zero.`,
        );
        return;
      }
    }

    if (lineType === "GL_ACCOUNT" && !line.gl_account_id) {
      errors.push(`Line ${lineNo}: G/L account is required.`);
    }
  });

  return errors;
}
