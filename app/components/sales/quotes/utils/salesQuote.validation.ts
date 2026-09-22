// app/components/sales/quotes/utils/salesQuote.validation.ts

import { SalesQuote, SalesQuoteLineUI } from "@/types/sales-quote";

export function validateSalesQuoteDates(quote: Partial<SalesQuote>): string[] {
  const errors: string[] = [];

  const orderDate = quote.order_date
    ? new Date(quote.order_date).getTime()
    : null;

  const dispatchDate = quote.dispatch_date
    ? new Date(quote.dispatch_date).getTime()
    : null;

  const deliveryDate = quote.delivery_date
    ? new Date(quote.delivery_date).getTime()
    : null;

  if (orderDate && dispatchDate && orderDate > dispatchDate) {
    errors.push("Order Date cannot be after Dispatch Date.");
  }

  if (orderDate && deliveryDate && orderDate > deliveryDate) {
    errors.push("Order Date cannot be after Delivery Date.");
  }

  if (dispatchDate && deliveryDate && dispatchDate > deliveryDate) {
    errors.push("Delivery Date cannot be before Dispatch Date.");
  }

  return errors;
}

export function validateSalesQuote(
  quote: Partial<SalesQuote>,
  lines: SalesQuoteLineUI[],
  currencyId: string,
): string[] {
  const errors: string[] = [];

  if (!quote.customer_id) {
    errors.push("Customer selection is required.");
  }

  if (!quote.customer_posting_group_id && !quote.vat_business_posting_group_id) {
    errors.push(
      "Selected customer does not have a valid Sales/VAT Posting Group assigned.",
    );
  }

  if (!quote.order_date) {
    errors.push("Quote Date field is mandatory.");
  }

  if (!currencyId) {
    errors.push("Transactional currency is required.");
  }

  if (lines.length === 0) {
    errors.push("Sales Quote requires at least one line item.");
  }

  errors.push(...validateSalesQuoteDates(quote));

  return errors;
}
