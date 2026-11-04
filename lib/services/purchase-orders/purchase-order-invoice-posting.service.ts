// lib/services/purchase-orders/purchase-order-invoice-posting.service.ts

import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "@/lib/db";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import {
  GLPostingService,
  type GLLineInput,
  type PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { VendorLedgerService } from "@/lib/services/ledger/vendor-ledger.service";

export interface PostPurchaseOrderInvoiceInput {
  companyId: string;
  purchaseOrderId: string;
  userId?: string;
  invoiceData: {
    supplier_invoice_no: string;
    invoice_date?: string;
    due_date?: string;
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

interface PurchaseOrderRow extends QueryResultRow {
  id: string;
  order_no: string;
  supplier_id: string;
  status: string;
  is_posted: boolean;
  is_invoiced: boolean;
  currency_id: string | null;
  exchange_rate: string | number | null;
}

interface PurchaseOrderLineRow extends QueryResultRow {
  id: string;
  line_no: number;
  item_id: string | null;
  gl_account_id: string | null;
  line_type: string | null;
  warehouse_id: string | null;
  quantity: string | number;
  received_quantity: string | number | null;
  cancelled_quantity: string | number | null;
  unit_cost: string | number | null;
  discount_amount: string | number | null;
  description: string | null;
  net_amount: string | number | null;
  vat_percent: string | number | null;
  vat_amount: string | number | null;
}

interface CompanyRow extends QueryResultRow {
  inventory_system: string | null;
}

interface BaseCurrencyRow extends QueryResultRow {
  currency_id: string;
}

interface PurchaseAccountResolution {
  payable_account_id: string | null;
  vat_account_id: string | null;
  grni_account_id: string | null;
  purchase_account_id: string | null;
}

interface GrniRow extends QueryResultRow {
  id: string;
  purchase_order_line_id: string;
  purchase_receipt_line_id: string;
  warehouse_id: string;
  item_id: string;
  amount: string | number;
  cleared_amount: string | number;
  base_amount: string | number | null;
  base_cleared_amount: string | number;
  exchange_rate: string | number | null;
  qty_received: string | number;
  qty_cleared: string | number;
  receipt_line_quantity: string | number;
  receipt_is_posted: boolean;
}

interface CurrencyMovementSetupRow extends QueryResultRow {
  realised_gain_gl_id: string | null;
  realised_loss_gl_id: string | null;
}

interface GrniLineTotals {
  amountFCY: number;
  baseAmountLCY: number;
  quantity: number;
  rows: GrniRow[];
}

interface InvoiceLineTotals {
  subtotal: number;
  vat: number;
  gross: number;
}

const MONEY_TOLERANCE = 0.02;
const QUANTITY_TOLERANCE = 0.000001;

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function requireFiniteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a valid number.`);
  }

  return value;
}

function requireNonNegative(value: number, field: string): number {
  requireFiniteNumber(value, field);

  if (value < 0) {
    throw new Error(`${field} cannot be negative.`);
  }

  return value;
}

function requirePositive(value: number, field: string): number {
  requireFiniteNumber(value, field);

  if (value <= 0) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return value;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getTodayDate(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function isItemLine(line: PurchaseOrderLineRow): boolean {
  return (
    line.line_type === "ITEM" ||
    (!line.line_type && line.item_id !== null)
  );
}

function isGlLine(line: PurchaseOrderLineRow): boolean {
  return (
    line.line_type === "GL_ACCOUNT" ||
    (!line.line_type && line.gl_account_id !== null)
  );
}

function isCommentLine(line: PurchaseOrderLineRow): boolean {
  return line.line_type === "COMMENT";
}

function getLineNetAmount(line: PurchaseOrderLineRow): number {
  if (line.net_amount !== null && line.net_amount !== undefined) {
    return roundMoney(toNumber(line.net_amount));
  }

  return roundMoney(
    toNumber(line.quantity) * toNumber(line.unit_cost) -
      toNumber(line.discount_amount),
  );
}

function addLineAmount(
  target: Map<string, number>,
  lineId: string,
  amount: number,
): void {
  target.set(
    lineId,
    roundMoney((target.get(lineId) ?? 0) + amount),
  );
}

export class PurchaseOrderInvoicePostingService {
  /**
   * Posts the supplier invoice directly against the purchase order.
   *
   * This service:
   * - Does not create purchase_invoices records.
   * - Does not create purchase_invoice_lines records.
   * - Clears GRNI using the historical receipt LCY values.
   * - Rejects FCY commercial differences.
   * - Posts receipt-to-invoice FX using realised FX accounts.
   * - Creates the vendor ledger entry.
   *
   * When an external PoolClient is supplied, transaction ownership
   * remains with the caller.
   */
  static async postInvoice(
    input: PostPurchaseOrderInvoiceInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient ?? (await pool.connect());
    const ownsTransaction = !externalClient;

    const {
      companyId,
      purchaseOrderId,
      userId,
      invoiceData,
      financials,
    } = input;

    try {
      if (ownsTransaction) {
        await client.query("BEGIN");
      }

      /* ============================================================
         1. LOCK PURCHASE ORDER
      ============================================================ */

      const orderResult = await client.query<PurchaseOrderRow>(
        `
          SELECT
            id,
            order_no,
            supplier_id,
            status,
            is_posted,
            is_invoiced,
            currency_id,
            exchange_rate
          FROM purchase_orders
          WHERE id = $1
            AND company_id = $2
          FOR UPDATE
        `,
        [purchaseOrderId, companyId],
      );

      const order = orderResult.rows[0];

      if (!order) {
        throw new Error("Purchase order document not found.");
      }

      if (order.is_posted || order.is_invoiced) {
        throw new Error(
          "This purchase order has already been invoiced or posted.",
        );
      }

      /* ============================================================
         2. LOCK PURCHASE ORDER LINES
      ============================================================ */

      const linesResult = await client.query<PurchaseOrderLineRow>(
        `
          SELECT
            id,
            line_no,
            item_id,
            gl_account_id,
            line_type,
            warehouse_id,
            quantity,
            received_quantity,
            cancelled_quantity,
            unit_cost,
            discount_amount,
            description,
            net_amount,
            vat_percent,
            vat_amount
          FROM purchase_order_lines
          WHERE purchase_order_id = $1
            AND company_id = $2
            AND COALESCE(is_deleted, false) = false
          ORDER BY line_no ASC, id ASC
          FOR UPDATE
        `,
        [purchaseOrderId, companyId],
      );

      const lines = linesResult.rows;

      if (lines.length === 0) {
        throw new Error(
          "Cannot post an invoice for a purchase order without lines.",
        );
      }

      const invalidLines = lines.filter(
        (line) =>
          !isCommentLine(line) &&
          !isItemLine(line) &&
          !isGlLine(line),
      );

      if (invalidLines.length > 0) {
        throw new Error(
          `Purchase order contains unsupported line type on line ${invalidLines[0].line_no}.`,
        );
      }

      const conflictingLines = lines.filter(
        (line) => isItemLine(line) && isGlLine(line),
      );

      if (conflictingLines.length > 0) {
        throw new Error(
          `Purchase order line ${conflictingLines[0].line_no} cannot be both ITEM and GL_ACCOUNT.`,
        );
      }

      const accountingLines = lines.filter(
        (line) => isItemLine(line) || isGlLine(line),
      );

      const itemLines = accountingLines.filter(isItemLine);

      if (accountingLines.length === 0) {
        throw new Error("The purchase order has no billable lines.");
      }

      /* ============================================================
         3. VALIDATE RECEIPT COMPLETION
      ============================================================ */

      const unreceivedLines = itemLines.filter((line) => {
        const ordered = toNumber(line.quantity);
        const received = toNumber(line.received_quantity);
        const cancelled = toNumber(line.cancelled_quantity);

        return (
          received + cancelled + QUANTITY_TOLERANCE < ordered
        );
      });

      if (unreceivedLines.length > 0) {
        throw new Error(
          `Cannot post invoice. Purchase order line ${unreceivedLines[0].line_no} has not been fully received or cancelled.`,
        );
      }

      const invalidQuantities = accountingLines.filter(
        (line) => toNumber(line.quantity) < 0,
      );

      if (invalidQuantities.length > 0) {
        throw new Error(
          `Purchase order line ${invalidQuantities[0].line_no} has an invalid quantity.`,
        );
      }

      /* ============================================================
         4. VALIDATE INVOICE METADATA
      ============================================================ */

      const supplierInvoiceNo = invoiceData.supplier_invoice_no.trim();

      if (!supplierInvoiceNo) {
        throw new Error("Supplier invoice number is required.");
      }

      const invoiceDate = invoiceData.invoice_date ?? getTodayDate();
      const postingDate = invoiceData.posting_date ?? invoiceDate;
      const dueDate = invoiceData.due_date ?? invoiceDate;

      const currencyId =
        invoiceData.currency_id ?? order.currency_id;

      const exchangeRate = requirePositive(
        Number(
          invoiceData.exchange_rate ?? order.exchange_rate ?? 1,
        ),
        "Invoice exchange rate",
      );

      if (
        order.currency_id &&
        currencyId &&
        order.currency_id !== currencyId
      ) {
        throw new Error(
          "Invoice currency must match the purchase order currency. Currency conversion between the PO and supplier invoice is not supported by this posting workflow.",
        );
      }

      const duplicateSupplierInvoice = await client.query(
        `
          SELECT id
          FROM purchase_orders
          WHERE company_id = $1
            AND supplier_id = $2
            AND LOWER(BTRIM(supplier_invoice_no)) =
                LOWER(BTRIM($3))
            AND id <> $4
          LIMIT 1
        `,
        [
          companyId,
          order.supplier_id,
          supplierInvoiceNo,
          purchaseOrderId,
        ],
      );

      if (duplicateSupplierInvoice.rows.length > 0) {
        throw new Error(
          "This supplier invoice number has already been used for this supplier.",
        );
      }

      /* ============================================================
         5. RESOLVE BASE CURRENCY
      ============================================================ */

      const baseCurrencyResult = await client.query<BaseCurrencyRow>(
        `
          SELECT currency_id
          FROM company_currencies
          WHERE company_id = $1
            AND is_base = true
            AND status = 1
          LIMIT 1
        `,
        [companyId],
      );

      const baseCurrencyId =
        baseCurrencyResult.rows[0]?.currency_id;

      if (!baseCurrencyId) {
        throw new Error(
          "Company base currency is not configured or is inactive.",
        );
      }

      if (currencyId) {
        const currencyResult = await client.query(
          `
            SELECT currency_id
            FROM company_currencies
            WHERE company_id = $1
              AND currency_id = $2
              AND status = 1
            LIMIT 1
          `,
          [companyId, currencyId],
        );

        if (currencyResult.rows.length === 0) {
          throw new Error(
            "Invoice currency is not active for this company.",
          );
        }

        if (
          currencyId === baseCurrencyId &&
          Math.abs(exchangeRate - 1) > 0.000001
        ) {
          throw new Error(
            "Base-currency invoices must use exchange rate 1.",
          );
        }
      } else if (Math.abs(exchangeRate - 1) > 0.000001) {
        throw new Error(
          "Invoice currency is required when the exchange rate is not 1.",
        );
      }

      /* ============================================================
         6. COMPANY INVENTORY CONFIGURATION
      ============================================================ */

      const companyResult = await client.query<CompanyRow>(
        `
          SELECT inventory_system
          FROM companies
          WHERE id = $1
        `,
        [companyId],
      );

      if (!companyResult.rows[0]) {
        throw new Error("Company configuration not found.");
      }

      const inventorySystem = (
        companyResult.rows[0].inventory_system ?? "PERIODIC"
      ).toUpperCase();

      if (
        inventorySystem !== "PERPETUAL" &&
        inventorySystem !== "PERIODIC"
      ) {
        throw new Error(
          `Unsupported inventory system: ${inventorySystem}.`,
        );
      }

      /* ============================================================
         7. CALCULATE AND VALIDATE FCY FINANCIAL TOTALS
      ============================================================ */

      let calculatedSubtotal = 0;
      let calculatedLineVat = 0;
      let hasLineVatValues = false;

      for (const line of accountingLines) {
        const lineNet = getLineNetAmount(line);

        if (lineNet < 0) {
          throw new Error(
            `Purchase order line ${line.line_no} has a negative net amount.`,
          );
        }

        calculatedSubtotal += lineNet;

        if (
          line.vat_amount !== null &&
          line.vat_amount !== undefined
        ) {
          hasLineVatValues = true;
          calculatedLineVat += toNumber(line.vat_amount);
        }
      }

      calculatedSubtotal = roundMoney(calculatedSubtotal);

      const suppliedSubtotal = roundMoney(
        requireNonNegative(
          Number(financials.amount),
          "Invoice subtotal",
        ),
      );

      const suppliedVat = roundMoney(
        requireNonNegative(
          Number(financials.vat),
          "Invoice VAT",
        ),
      );

      const suppliedGross = roundMoney(
        requireNonNegative(
          Number(financials.amountInclVat),
          "Invoice gross total",
        ),
      );

      if (
        Math.abs(suppliedSubtotal - calculatedSubtotal) >
        MONEY_TOLERANCE
      ) {
        throw new Error(
          "Invoice subtotal does not match the purchase order line totals.",
        );
      }

      if (
        hasLineVatValues &&
        Math.abs(
          roundMoney(calculatedLineVat) - suppliedVat,
        ) > MONEY_TOLERANCE
      ) {
        throw new Error(
          "Invoice VAT does not match the VAT amounts stored on the purchase order lines.",
        );
      }

      const vatAmount = suppliedVat;
      const grossTotal = roundMoney(
        calculatedSubtotal + vatAmount,
      );

      if (
        Math.abs(suppliedGross - grossTotal) >
        MONEY_TOLERANCE
      ) {
        throw new Error(
          "Invoice gross total does not equal subtotal plus VAT.",
        );
      }

      /* ============================================================
         8. GENERATE INTERNAL INVOICE NUMBER
      ============================================================ */

      const sequenceResult = await client.query<{ code: string | null }>(
        `
          SELECT get_next_sequence($1, $2) AS code
        `,
        [companyId, "purchase_invoice"],
      );

      const invoiceNo = sequenceResult.rows[0]?.code;

      if (!invoiceNo?.trim()) {
        throw new Error(
          "Failed to generate the purchase invoice number. Check the purchase_invoice sequence configuration.",
        );
      }

      /* ============================================================
         9. RESOLVE PURCHASE ACCOUNTS
      ============================================================ */

      let payableAccountId: string | null = null;
      let vatAccountId: string | null = null;

      const itemAccounts = new Map<
        string,
        PurchaseAccountResolution
      >();

      for (const line of itemLines) {
        if (!line.item_id) {
          throw new Error(
            `ITEM purchase order line ${line.line_no} has no item selected.`,
          );
        }

        const accounts =
          (await AccountResolutionService.resolvePurchaseAccounts(
            client,
            companyId,
            line.item_id,
          )) as PurchaseAccountResolution;

        if (!accounts.payable_account_id) {
          throw new Error(
            `Accounts Payable account is not configured for item ${line.item_id}.`,
          );
        }

        if (
          payableAccountId &&
          payableAccountId !== accounts.payable_account_id
        ) {
          throw new Error(
            "Purchase order lines resolve to different Accounts Payable control accounts. Resolve the supplier posting setup before invoicing.",
          );
        }

        payableAccountId ??= accounts.payable_account_id;
        vatAccountId ??= accounts.vat_account_id;

        itemAccounts.set(line.id, accounts);
      }

      /*
       * Resolve default AP/VAT accounts for G/L-only orders,
       * or when VAT is present but no item line supplied a VAT account.
       *
       * The account resolver must support a null item ID for this path.
       */
      if (!payableAccountId || (vatAmount > 0 && !vatAccountId)) {
        const defaults =
          (await AccountResolutionService.resolvePurchaseAccounts(
            client,
            companyId,
            null,
          )) as PurchaseAccountResolution;

        payableAccountId ??= defaults.payable_account_id;
        vatAccountId ??= defaults.vat_account_id;
      }

      if (!payableAccountId) {
        throw new Error(
          "Accounts Payable account is not configured in the supplier posting setup.",
        );
      }

      if (vatAmount > 0 && !vatAccountId) {
        throw new Error(
          "Purchase VAT account is not configured.",
        );
      }

      /* ============================================================
         10. LOCK AND VALIDATE GRNI RECORDS
      ============================================================ */

      const grniByLine = new Map<string, GrniLineTotals>();

      let totalGrniFCY = 0;
      let totalGrniLCY = 0;

      if (inventorySystem === "PERPETUAL" && itemLines.length > 0) {
        for (const line of itemLines) {
          const grniResult = await client.query<GrniRow>(
            `
              SELECT
                g.id,
                g.purchase_order_line_id,
                g.purchase_receipt_line_id,
                g.warehouse_id,
                g.item_id,
                g.amount,
                g.cleared_amount,
                g.base_amount,
                g.base_cleared_amount,
                g.exchange_rate,
                g.qty_received,
                g.qty_cleared,
                prl.quantity AS receipt_line_quantity,
                pr.is_posted AS receipt_is_posted
              FROM grni_entries g
              INNER JOIN purchase_receipt_lines prl
                ON prl.id = g.purchase_receipt_line_id
               AND prl.company_id = g.company_id
              INNER JOIN purchase_receipts pr
                ON pr.id = g.grn_id
               AND pr.company_id = g.company_id
              WHERE g.company_id = $1
                AND g.purchase_order_line_id = $2
                AND g.status::text IN ('OPEN', 'PARTIAL')
              ORDER BY
                pr.posting_date ASC,
                pr.created_at ASC,
                g.id ASC
              FOR UPDATE OF g
            `,
            [companyId, line.id],
          );

          const grniRows = grniResult.rows;

          if (grniRows.length === 0) {
            throw new Error(
              `No outstanding GRNI entries were found for purchase order line ${line.line_no}.`,
            );
          }

          let lineGrniFCY = 0;
          let lineGrniLCY = 0;
          let lineGrniQuantity = 0;

          for (const grni of grniRows) {
            if (!grni.receipt_is_posted) {
              throw new Error(
                `GRNI entry ${grni.id} belongs to a receipt that is not posted.`,
              );
            }

            const amountFCY = roundMoney(
              toNumber(grni.amount),
            );

            const clearedFCY = roundMoney(
              toNumber(grni.cleared_amount),
            );

            const baseAmountValue =
              grni.base_amount === null
                ? null
                : toNumber(grni.base_amount);

            const baseClearedLCY = roundMoney(
              toNumber(grni.base_cleared_amount),
            );

            const receiptRate = toNumber(grni.exchange_rate);

            const receivedQuantity = roundQuantity(
              toNumber(grni.qty_received) > 0
                ? toNumber(grni.qty_received)
                : toNumber(grni.receipt_line_quantity),
            );

            const clearedQuantity = roundQuantity(
              toNumber(grni.qty_cleared),
            );

            if (
              baseAmountValue === null ||
              !Number.isFinite(baseAmountValue)
            ) {
              throw new Error(
                `GRNI entry ${grni.id} does not contain its historical LCY amount. Update the receipt posting service and reconcile this historical entry before invoicing.`,
              );
            }

            if (!Number.isFinite(receiptRate) || receiptRate <= 0) {
              throw new Error(
                `GRNI entry ${grni.id} does not contain a valid historical receipt exchange rate.`,
              );
            }

            if (
              amountFCY < 0 ||
              baseAmountValue < 0 ||
              clearedFCY < 0 ||
              baseClearedLCY < 0
            ) {
              throw new Error(
                `GRNI entry ${grni.id} contains an invalid negative amount.`,
              );
            }

            if (
              clearedFCY > MONEY_TOLERANCE ||
              baseClearedLCY > MONEY_TOLERANCE ||
              clearedQuantity > QUANTITY_TOLERANCE
            ) {
              throw new Error(
                `GRNI entry ${grni.id} has already been partially cleared. This single-invoice workflow requires an unreconciled GRNI balance.`,
              );
            }

            if (
              receivedQuantity <= 0 &&
              toNumber(grni.receipt_line_quantity) > 0
            ) {
              throw new Error(
                `GRNI entry ${grni.id} has an invalid receipt quantity.`,
              );
            }

            const outstandingFCY = roundMoney(
              amountFCY - clearedFCY,
            );

            const outstandingLCY = roundMoney(
              baseAmountValue - baseClearedLCY,
            );

            if (
              outstandingFCY < 0 ||
              outstandingLCY < 0
            ) {
              throw new Error(
                `GRNI entry ${grni.id} has a cleared amount greater than its original amount.`,
              );
            }

            lineGrniFCY = roundMoney(
              lineGrniFCY + outstandingFCY,
            );

            lineGrniLCY = roundMoney(
              lineGrniLCY + outstandingLCY,
            );

            lineGrniQuantity = roundQuantity(
              lineGrniQuantity + receivedQuantity,
            );
          }

          const invoiceLineFCY = getLineNetAmount(line);

          /*
           * Strict three-way commercial match:
           * received GRNI FCY must equal invoice line FCY.
           *
           * Do not classify price/discount differences as FX.
           */
          if (
            Math.abs(lineGrniFCY - invoiceLineFCY) >
            MONEY_TOLERANCE
          ) {
            throw new Error(
              `FCY mismatch on purchase order line ${line.line_no}. GRNI received value: ${lineGrniFCY.toFixed(2)}, invoice line value: ${invoiceLineFCY.toFixed(2)}. Reconcile the purchase order price or discount before posting this invoice.`,
            );
          }

          const expectedReceivedQuantity = roundQuantity(
            toNumber(line.received_quantity),
          );

          if (
            Math.abs(
              lineGrniQuantity - expectedReceivedQuantity,
            ) > QUANTITY_TOLERANCE
          ) {
            throw new Error(
              `GRNI quantity does not reconcile with received quantity on purchase order line ${line.line_no}.`,
            );
          }

          grniByLine.set(line.id, {
            amountFCY: lineGrniFCY,
            baseAmountLCY: lineGrniLCY,
            quantity: lineGrniQuantity,
            rows: grniRows,
          });

          totalGrniFCY = roundMoney(
            totalGrniFCY + lineGrniFCY,
          );

          totalGrniLCY = roundMoney(
            totalGrniLCY + lineGrniLCY,
          );
        }
      }

      /* ============================================================
         11. BUILD LCY JOURNAL
      ============================================================ */

      const glLines: GLLineInput[] = [];

      let fxVarianceLCY = 0;

      for (const line of accountingLines) {
        const lineNetFCY = getLineNetAmount(line);
        const lineNetLCY = roundMoney(
          lineNetFCY * exchangeRate,
        );

        const quantity = toNumber(line.quantity);

        if (isItemLine(line)) {
          if (!line.item_id) {
            throw new Error(
              `ITEM purchase order line ${line.line_no} has no item.`,
            );
          }

          const accounts = itemAccounts.get(line.id);

          if (!accounts) {
            throw new Error(
              `Purchase accounts could not be resolved for line ${line.line_no}.`,
            );
          }

          if (inventorySystem === "PERPETUAL") {
            if (!accounts.grni_account_id) {
              throw new Error(
                `GRNI account is not configured for item ${line.item_id}.`,
              );
            }

            const grni = grniByLine.get(line.id);

            if (!grni) {
              throw new Error(
                `GRNI reconciliation is missing for purchase order line ${line.line_no}.`,
              );
            }

            /*
             * Debit GRNI at its historical LCY value.
             * Never multiply this value by the invoice exchange rate.
             */
            if (grni.baseAmountLCY > 0) {
              glLines.push({
                account_id: accounts.grni_account_id,
                debit: grni.baseAmountLCY,
                credit: 0,
                party_id: order.supplier_id,
                item_id: line.item_id,
                warehouse_id: line.warehouse_id,
                quantity,
                reference_type: "PURCHASE_ORDER",
                reference_id: order.id,
                description: `GRNI clearing for invoice ${invoiceNo}`,
              });
            }

            /*
             * Receipt GRNI LCY minus invoice line LCY:
             *
             * Positive = FX gain.
             * Negative = FX loss.
             */
            const invoiceLineLCY = lineNetLCY;

            fxVarianceLCY = roundMoney(
              fxVarianceLCY +
                grni.baseAmountLCY -
                invoiceLineLCY,
            );
          } else {
            /*
             * Periodic inventory:
             * no GRNI clearing is expected in this workflow.
             */
            if (!accounts.purchase_account_id) {
              throw new Error(
                `Purchase expense account is not configured for item ${line.item_id}.`,
              );
            }

            if (lineNetLCY > 0) {
              glLines.push({
                account_id: accounts.purchase_account_id,
                debit: lineNetLCY,
                credit: 0,
                party_id: order.supplier_id,
                item_id: line.item_id,
                warehouse_id: line.warehouse_id,
                quantity,
                reference_type: "PURCHASE_ORDER",
                reference_id: order.id,
                description: `Purchase expense for invoice ${invoiceNo}`,
              });
            }
          }
        } else if (isGlLine(line)) {
          if (!line.gl_account_id) {
            throw new Error(
              `G/L purchase line ${line.line_no} has no G/L account selected.`,
            );
          }

          if (lineNetLCY > 0) {
            glLines.push({
              account_id: line.gl_account_id,
              debit: lineNetLCY,
              credit: 0,
              party_id: order.supplier_id,
              reference_type: "PURCHASE_ORDER",
              reference_id: order.id,
              description:
                line.description ||
                `Purchase G/L line for invoice ${invoiceNo}`,
            });
          }
        }
      }

      /* ============================================================
         12. REALISED FX GAIN / LOSS
      ============================================================ */

      fxVarianceLCY = roundMoney(fxVarianceLCY);

      if (Math.abs(fxVarianceLCY) > MONEY_TOLERANCE) {
        const fxSetupResult =
          await client.query<CurrencyMovementSetupRow>(
            `
              SELECT
                realised_gain_gl_id,
                realised_loss_gl_id
              FROM currency_movement_setup
              WHERE company_id = $1
              LIMIT 1
            `,
            [companyId],
          );

        const fxSetup = fxSetupResult.rows[0];

        if (!fxSetup) {
          throw new Error(
            "Currency movement setup is not configured for this company.",
          );
        }

        if (fxVarianceLCY > 0) {
          if (!fxSetup.realised_gain_gl_id) {
            throw new Error(
              "Realised FX gain account is not configured.",
            );
          }

          glLines.push({
            account_id: fxSetup.realised_gain_gl_id,
            debit: 0,
            credit: fxVarianceLCY,
            party_id: order.supplier_id,
            reference_type: "PURCHASE_ORDER",
            reference_id: order.id,
            description: `Realised FX gain on purchase invoice ${invoiceNo}`,
          });
        } else {
          if (!fxSetup.realised_loss_gl_id) {
            throw new Error(
              "Realised FX loss account is not configured.",
            );
          }

          glLines.push({
            account_id: fxSetup.realised_loss_gl_id,
            debit: Math.abs(fxVarianceLCY),
            credit: 0,
            party_id: order.supplier_id,
            reference_type: "PURCHASE_ORDER",
            reference_id: order.id,
            description: `Realised FX loss on purchase invoice ${invoiceNo}`,
          });
        }
      }

      /* ============================================================
         13. VAT AND ACCOUNTS PAYABLE
      ============================================================ */

      const vatAmountLCY = roundMoney(
        vatAmount * exchangeRate,
      );

      const grossTotalLCY = roundMoney(
        grossTotal * exchangeRate,
      );

      if (vatAmountLCY > 0) {
        if (!vatAccountId) {
          throw new Error(
            "Purchase VAT account is not configured.",
          );
        }

        glLines.push({
          account_id: vatAccountId,
          debit: vatAmountLCY,
          credit: 0,
          party_id: order.supplier_id,
          reference_type: "PURCHASE_ORDER",
          reference_id: order.id,
          description: `Input VAT for invoice ${invoiceNo}`,
        });
      }

      if (grossTotalLCY > 0) {
        glLines.push({
          account_id: payableAccountId,
          debit: 0,
          credit: grossTotalLCY,
          party_id: order.supplier_id,
          reference_type: "PURCHASE_ORDER",
          reference_id: order.id,
          description: `Accounts payable for supplier invoice ${supplierInvoiceNo}`,
        });
      }

      if (glLines.length === 0) {
        throw new Error(
          "No financial journal lines were generated for this invoice.",
        );
      }

      /*
       * All journal amounts are now LCY.
       * Post using base currency and exchange rate 1.
       */
      GLValidationService.validateBalanced(glLines);

      /* ============================================================
         14. POST GENERAL LEDGER JOURNAL
      ============================================================ */

      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "PURCHASE",
        journal_type: "PURCHASE_INVOICE",
        reference: invoiceNo,
        source_id: order.id,
        description: `Posted Purchase Invoice ${invoiceNo} for PO ${order.order_no}`,
        currency_id: baseCurrencyId,
        exchange_rate: 1,
        created_by: userId ?? null,
        lines: glLines,
      });

      const payableJournalLine = journal.lines.find(
        (line: PostedJournalLine) =>
          line.account_id === payableAccountId &&
          Number(line.credit) > 0,
      );

      if (!payableJournalLine) {
        throw new Error(
          "The Accounts Payable journal line could not be identified.",
        );
      }

      /* ============================================================
         15. CREATE VENDOR LEDGER ENTRY
      ============================================================ */

      await VendorLedgerService.createEntry(client, {
        companyId,
        vendorId: order.supplier_id,
        documentType: "PURCHASE_INVOICE",
        documentId: order.id,
        documentNo: invoiceNo,
        postingDate,
        dueDate,
        description: `Invoice ${invoiceNo} (Supplier Ref: ${supplierInvoiceNo})`,
        originalAmount: grossTotal,
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: payableJournalLine.id,
      });

      /* ============================================================
         16. CLEAR GRNI SUBLEDGER
      ============================================================ */

      if (inventorySystem === "PERPETUAL") {
        for (const line of itemLines) {
          const grni = grniByLine.get(line.id);

          if (!grni) {
            throw new Error(
              `Cannot clear missing GRNI data for purchase order line ${line.line_no}.`,
            );
          }

          for (const grniRow of grni.rows) {
            const cleared = await client.query(
              `
                UPDATE grni_entries
                SET
                  cleared_amount = amount,
                  base_cleared_amount = base_amount,
                  qty_received = CASE
                    WHEN COALESCE(qty_received, 0) = 0
                      THEN $1
                    ELSE qty_received
                  END,
                  qty_cleared = CASE
                    WHEN COALESCE(qty_cleared, 0) = 0
                      THEN CASE
                        WHEN COALESCE(qty_received, 0) = 0
                          THEN $1
                        ELSE qty_received
                      END
                    ELSE qty_cleared
                  END,
                  status = 'CLEARED'
                WHERE id = $2
                  AND company_id = $3
                  AND purchase_order_line_id = $4
                  AND status::text IN ('OPEN', 'PARTIAL')
                  AND COALESCE(cleared_amount, 0) = 0
                  AND COALESCE(base_cleared_amount, 0) = 0
                  AND COALESCE(qty_cleared, 0) = 0
                RETURNING id
              `,
              [
                toNumber(grniRow.receipt_line_quantity),
                grniRow.id,
                companyId,
                line.id,
              ],
            );

            if (cleared.rowCount !== 1) {
              throw new Error(
                `Failed to clear GRNI entry ${grniRow.id}. The entry may have been changed by another transaction.`,
              );
            }
          }
        }
      }

      /* ============================================================
         17. UPDATE PURCHASE ORDER LINE INVOICED QUANTITIES
      ============================================================ */

      const lineUpdate = await client.query(
        `
          UPDATE purchase_order_lines
          SET
            invoiced_quantity = quantity,
            updated_at = NOW()
          WHERE purchase_order_id = $1
            AND company_id = $2
            AND COALESCE(is_deleted, false) = false
            AND (
              line_type = 'ITEM'
              OR (line_type IS NULL AND item_id IS NOT NULL)
              OR line_type = 'GL_ACCOUNT'
              OR gl_account_id IS NOT NULL
            )
        `,
        [purchaseOrderId, companyId],
      );

      if (
        lineUpdate.rowCount !== accountingLines.length
      ) {
        throw new Error(
          "Not all purchase order lines could be marked as invoiced.",
        );
      }

      /* ============================================================
         18. UPDATE PURCHASE ORDER HEADER
      ============================================================ */

      const orderUpdate = await client.query(
        `
          UPDATE purchase_orders
          SET
            purchase_invoice_no = $1,
            supplier_invoice_no = $2,
            invoice_date = $3,
            due_date = $4,
            posting_date = $5,
            currency_id = $6,
            exchange_rate = $7,
            subtotal = $8,
            tax_amount = $9,
            vat_amount = $9,
            total_amount = $10,
            invoice_status = 'INVOICED',
            is_invoiced = true,
            is_posted = true,
            posted_at = NOW(),
            notes = COALESCE($11, notes),
            updated_at = NOW()
          WHERE id = $12
            AND company_id = $13
            AND is_invoiced = false
            AND is_posted = false
        `,
        [
          invoiceNo,
          supplierInvoiceNo,
          invoiceDate,
          dueDate,
          postingDate,
          currencyId,
          exchangeRate,
          calculatedSubtotal,
          vatAmount,
          grossTotal,
          normalizeOptionalText(invoiceData.notes),
          purchaseOrderId,
          companyId,
        ],
      );

      if (orderUpdate.rowCount !== 1) {
        throw new Error(
          "Purchase order could not be finalized as invoiced.",
        );
      }

      /* ============================================================
         19. COMMIT
      ============================================================ */

      if (ownsTransaction) {
        await client.query("COMMIT");
      }

      return {
        id: order.id,
        purchase_order_id: order.id,
        purchase_order_no: order.order_no,
        invoice_no: invoiceNo,
        supplier_invoice_no: supplierInvoiceNo,
        journal_id: journal.id,
        subtotal: calculatedSubtotal,
        vat_amount: vatAmount,
        total_amount: grossTotal,
        fx_variance_lcy: fxVarianceLCY,
        grni_amount_fcy: totalGrniFCY,
        grni_amount_lcy: totalGrniLCY,
      };
    } catch (error) {
      if (ownsTransaction) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      if (ownsTransaction) {
        client.release();
      }
    }
  }

  /**
   * Caller-owned transaction helper.
   */
  static async postInvoiceTransactional(
    client: PoolClient,
    input: PostPurchaseOrderInvoiceInput,
  ) {
    return this.postInvoice(input, client);
  }
}

/* 
import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "@/lib/db";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import {
  GLPostingService,
  type GLLineInput,
  type PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { VendorLedgerService } from "@/lib/services/ledger/vendor-ledger.service";

export interface PostPurchaseOrderInvoiceInput {
  companyId: string;
  purchaseOrderId: string;
  userId?: string;
  invoiceData: {
    supplier_invoice_no: string;
    invoice_date?: string;
    due_date?: string;
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

interface PurchaseOrderRow extends QueryResultRow {
  id: string;
  order_no: string;
  supplier_id: string;
  status: string;
  is_posted: boolean;
  is_invoiced: boolean;
  currency_id: string | null;
  exchange_rate: string | number | null;
}

interface PurchaseOrderLineRow extends QueryResultRow {
  id: string;
  item_id: string | null;
  gl_account_id: string | null;
  line_type: string | null;
  warehouse_id: string | null;
  quantity: string | number;
  received_quantity: string | number | null;
  unit_cost: string | number | null;
  discount_amount: string | number | null;
  description: string | null;
  net_amount: string | number | null;
  vat_percent: string | number | null;
  vat_amount: string | number | null;
}

interface CompanyRow extends QueryResultRow {
  inventory_system: string | null;
}

interface PurchaseAccountResolution {
  payable_account_id: string | null;
  vat_account_id: string | null;
  grni_account_id: string | null;
  purchase_account_id: string | null;
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getLineNetAmount(line: PurchaseOrderLineRow): number {
  if (line.net_amount !== null && line.net_amount !== undefined) {
    return roundMoney(toNumber(line.net_amount));
  }

  return roundMoney(
    toNumber(line.quantity) * toNumber(line.unit_cost) -
      toNumber(line.discount_amount),
  );
}

function isItemLine(line: PurchaseOrderLineRow): boolean {
  return line.line_type === "ITEM" || (!line.line_type && !!line.item_id);
}

function isGlLine(line: PurchaseOrderLineRow): boolean {
  return line.line_type === "GL_ACCOUNT" || !!line.gl_account_id;
}

export class PurchaseOrderInvoicePostingService {
  static async postInvoice(
    input: PostPurchaseOrderInvoiceInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient ?? (await pool.connect());
    const ownsTransaction = !externalClient;

    const { companyId, purchaseOrderId, userId, invoiceData, financials } =
      input;

    try {
      if (ownsTransaction) {
        await client.query("BEGIN");
      }

      // Lock the PO header. This serializes concurrent invoice attempts.
      const orderResult = await client.query<PurchaseOrderRow>(
        `
          SELECT
            id,
            order_no,
            supplier_id,
            status,
            is_posted,
            is_invoiced,
            currency_id,
            exchange_rate
          FROM purchase_orders
          WHERE id = $1
            AND company_id = $2
          FOR UPDATE
        `,
        [purchaseOrderId, companyId],
      );

      const order = orderResult.rows[0];

      if (!order) {
        throw new Error("Purchase order document not found.");
      }

      if (order.is_posted || order.is_invoiced) {
        throw new Error("This purchase order has already been invoiced.");
      }

      // Lock active PO lines as well, preventing line changes during posting.
      const linesResult = await client.query<PurchaseOrderLineRow>(
        `
          SELECT
            id,
            item_id,
            gl_account_id,
            line_type,
            warehouse_id,
            quantity,
            received_quantity,
            unit_cost,
            discount_amount,
            description,
            net_amount,
            vat_percent,
            vat_amount
          FROM purchase_order_lines
          WHERE purchase_order_id = $1
            AND company_id = $2
            AND COALESCE(is_deleted, false) = false
          ORDER BY line_no ASC
          FOR UPDATE
        `,
        [purchaseOrderId, companyId],
      );

      const lines = linesResult.rows;

      if (lines.length === 0) {
        throw new Error(
          "Cannot post an invoice for a purchase order without lines.",
        );
      }

      const itemLines = lines.filter(isItemLine);
      const accountingLines = lines.filter(
        (line) => isItemLine(line) || isGlLine(line),
      );

      if (accountingLines.length === 0) {
        throw new Error("The purchase order has no billable lines.");
      }

      // Single-invoice mode: every stock line must be fully received.
      const unreceivedLines = itemLines.filter(
        (line) =>
          toNumber(line.received_quantity) + 0.000001 < toNumber(line.quantity),
      );

      if (unreceivedLines.length > 0) {
        throw new Error(
          "Cannot post this invoice because one or more stock lines have not been fully received.",
        );
      }

      const supplierInvoiceNo = invoiceData.supplier_invoice_no.trim();

      if (!supplierInvoiceNo) {
        throw new Error("Supplier invoice number is required.");
      }

      const invoiceDate =
        invoiceData.invoice_date ?? new Date().toISOString().slice(0, 10);
      const postingDate = invoiceData.posting_date ?? invoiceDate;
      const dueDate = invoiceData.due_date ?? invoiceDate;

      const currencyId = invoiceData.currency_id ?? order.currency_id;
      const exchangeRate = Number(
        invoiceData.exchange_rate ?? order.exchange_rate ?? 1,
      );

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new Error("The invoice exchange rate must be greater than zero.");
      }

      // Check supplier invoice reference before generating the internal number.
      const duplicateSupplierInvoice = await client.query(
        `
          SELECT id
          FROM purchase_orders
          WHERE company_id = $1
            AND supplier_id = $2
            AND LOWER(BTRIM(supplier_invoice_no)) = LOWER(BTRIM($3))
            AND id <> $4
          LIMIT 1
        `,
        [companyId, order.supplier_id, supplierInvoiceNo, purchaseOrderId],
      );

      if (duplicateSupplierInvoice.rows.length > 0) {
        throw new Error(
          "This supplier invoice number has already been used for this supplier.",
        );
      }

      const sequenceResult = await client.query<{ code: string }>(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "purchase_invoice"],
      );

      const invoiceNo = sequenceResult.rows[0]?.code ?? `PINV-${Date.now()}`;

      const companyResult = await client.query<CompanyRow>(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );

      const inventorySystem =
        companyResult.rows[0]?.inventory_system ?? "PERIODIC";

      const glLines: GLLineInput[] = [];

      let payableAccountId: string | null = null;
      let vatAccountId: string | null = null;

      let calculatedSubtotal = 0;
      let calculatedLineVat = 0;

      // Build the journal in memory. COMMENT lines are deliberately ignored.
      for (const line of accountingLines) {
        const lineNet = getLineNetAmount(line);
        const quantity = toNumber(line.quantity);

        if (lineNet < 0) {
          throw new Error(
            `Purchase order line ${line.id} has a negative net amount.`,
          );
        }

        calculatedSubtotal += lineNet;
        calculatedLineVat += toNumber(line.vat_amount);

        if (isItemLine(line)) {
          if (!line.item_id) {
            throw new Error(
              `Purchase order line ${line.id} is an ITEM line but has no item.`,
            );
          }

          const accounts =
            (await AccountResolutionService.resolvePurchaseAccounts(
              client,
              companyId,
              line.item_id,
            )) as PurchaseAccountResolution;

          payableAccountId ??= accounts.payable_account_id;
          vatAccountId ??= accounts.vat_account_id;

          const accountId =
            inventorySystem === "PERPETUAL"
              ? accounts.grni_account_id
              : accounts.purchase_account_id;

          if (!accountId) {
            throw new Error(
              `Purchase posting account is not configured for item ${line.item_id}.`,
            );
          }

          glLines.push({
            account_id: accountId,
            debit: lineNet,
            credit: 0,
            party_id: order.supplier_id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity,
            reference_type: "PURCHASE_ORDER",
            reference_id: order.id,
            description:
              inventorySystem === "PERPETUAL"
                ? `GRNI clearing for invoice ${invoiceNo}`
                : `Purchase expense for invoice ${invoiceNo}`,
          });
        } else if (isGlLine(line)) {
          if (!line.gl_account_id) {
            throw new Error(
              `G/L purchase line ${line.id} has no G/L account selected.`,
            );
          }

          glLines.push({
            account_id: line.gl_account_id,
            debit: lineNet,
            credit: 0,
            party_id: order.supplier_id,
            reference_type: "PURCHASE_ORDER",
            reference_id: order.id,
            description:
              line.description || `Purchase G/L line for ${invoiceNo}`,
          });
        }
      }

      calculatedSubtotal = roundMoney(calculatedSubtotal);

      // Resolve default payable/VAT accounts even when the PO contains only
      // direct G/L lines. The existing resolver is also used by the old service
      // with a null item ID for non-item lines.
      if (!payableAccountId || (financials.vat > 0 && !vatAccountId)) {
        const defaults =
          (await AccountResolutionService.resolvePurchaseAccounts(
            client,
            companyId,
            null,
          )) as PurchaseAccountResolution;

        payableAccountId ??= defaults.payable_account_id;
        vatAccountId ??= defaults.vat_account_id;
      }

      if (!payableAccountId) {
        throw new Error(
          "Accounts Payable account is not configured in the supplier posting setup.",
        );
      }

      const vatAmount = roundMoney(
        Number.isFinite(Number(financials.vat))
          ? Number(financials.vat)
          : calculatedLineVat,
      );

      if (vatAmount < 0) {
        throw new Error("Invoice VAT cannot be negative.");
      }

      if (vatAmount > 0) {
        if (!vatAccountId) {
          throw new Error("Purchase VAT account is not configured.");
        }

        glLines.push({
          account_id: vatAccountId,
          debit: vatAmount,
          credit: 0,
          party_id: order.supplier_id,
          reference_type: "PURCHASE_ORDER",
          reference_id: order.id,
          description: `Input VAT for invoice ${invoiceNo}`,
        });
      }

      const grossTotal = roundMoney(calculatedSubtotal + vatAmount);

      // Guard against a stale or inconsistent invoice form total.
      if (
        Number.isFinite(Number(financials.amountInclVat)) &&
        Math.abs(roundMoney(Number(financials.amountInclVat)) - grossTotal) >
          0.02
      ) {
        throw new Error(
          "The invoice total does not match the purchase order lines and VAT. Refresh the order totals before posting.",
        );
      }

      glLines.push({
        account_id: payableAccountId,
        debit: 0,
        credit: grossTotal,
        party_id: order.supplier_id,
        reference_type: "PURCHASE_ORDER",
        reference_id: order.id,
        description: `Accounts payable for supplier invoice ${supplierInvoiceNo}`,
      });

      GLValidationService.validateBalanced(glLines);

      // The PO ID is now the permanent source ID for this invoice journal.
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "PURCHASE",
        journal_type: "PURCHASE_INVOICE",
        reference: invoiceNo,
        source_id: order.id,
        description: `Posted Purchase Invoice ${invoiceNo} for PO ${order.order_no}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId ?? null,
        lines: glLines,
      });

      const payableJournalLine = journal.lines.find(
        (line: PostedJournalLine) =>
          line.account_id === payableAccountId && Number(line.credit) > 0,
      );

      await VendorLedgerService.createEntry(client, {
        companyId,
        vendorId: order.supplier_id,
        documentType: "PURCHASE_INVOICE",
        documentId: order.id,
        documentNo: invoiceNo,
        postingDate,
        dueDate,
        description: `Invoice ${invoiceNo} (Supplier Ref: ${supplierInvoiceNo})`,
        originalAmount: grossTotal,
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: payableJournalLine?.id ?? null,
      });

      // Set invoiced quantities in one statement. Since partial invoicing is
      // disabled, every active billable line is invoiced in full.
      await client.query(
        `
          UPDATE purchase_order_lines
          SET
            invoiced_quantity = quantity,
            updated_at = NOW()
          WHERE purchase_order_id = $1
            AND company_id = $2
            AND COALESCE(is_deleted, false) = false
            AND (
              line_type = 'ITEM'
              OR (line_type IS NULL AND item_id IS NOT NULL)
              OR line_type = 'GL_ACCOUNT'
              OR gl_account_id IS NOT NULL
            )
        `,
        [purchaseOrderId, companyId],
      );

      // Do not change PO receipt status here. Receipt lifecycle and invoice
      // lifecycle are separate concerns.
      await client.query(
        `
          UPDATE purchase_orders
          SET
            purchase_invoice_no = $1,
            supplier_invoice_no = $2,
            invoice_date = $3,
            due_date = $4,
            posting_date = $5,
            currency_id = $6,
            exchange_rate = $7,
            subtotal = $8,
            tax_amount = $9,
            vat_amount = $9,
            total_amount = $10,
            invoice_status = 'INVOICED',
            is_invoiced = true,
            is_posted = true,
            posted_at = NOW(),
            notes = COALESCE($11, notes),
            updated_at = NOW()
          WHERE id = $12
            AND company_id = $13
        `,
        [
          invoiceNo,
          supplierInvoiceNo,
          invoiceDate,
          dueDate,
          postingDate,
          currencyId,
          exchangeRate,
          calculatedSubtotal,
          vatAmount,
          grossTotal,
          invoiceData.notes?.trim() || null,
          purchaseOrderId,
          companyId,
        ],
      );

      if (ownsTransaction) {
        await client.query("COMMIT");
      }

      return {
        id: order.id,
        purchase_order_id: order.id,
        purchase_order_no: order.order_no,
        invoice_no: invoiceNo,
        supplier_invoice_no: supplierInvoiceNo,
        journal_id: journal.id,
        subtotal: calculatedSubtotal,
        vat_amount: vatAmount,
        total_amount: grossTotal,
      };
    } catch (error) {
      if (ownsTransaction) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      if (ownsTransaction) {
        client.release();
      }
    }
  }

  static async postInvoiceTransactional(
    client: PoolClient,
    input: PostPurchaseOrderInvoiceInput,
  ) {
    return this.postInvoice(input, client);
  }
} */
