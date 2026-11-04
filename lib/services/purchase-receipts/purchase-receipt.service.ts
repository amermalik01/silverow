//  lib/services/purchase-receipts/purchase-receipt.service.ts

import { pool } from "@/lib/db";
import type { PoolClient } from "pg";

import type { PurchaseReceiptPayload } from "@/types/purchase-receipt";
import type { JournalLineInput } from "@/types/journal";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

import {
  roundMoney,
  roundQuantity,
  roundUnitCost,
} from "@/lib/services/inventory/costing/inventory-costing.service";

interface PurchaseOrderRow {
  id: string;
  company_id: string;
  supplier_id: string;
  status: string;
  is_posted: boolean | null;
  currency_id: string | null;
  exchange_rate: string | number | null;
  reference: string | null;
}

interface PurchaseOrderLineRow {
  id: string;
  line_no: number;
  item_id: string;
  warehouse_id: string | null;
  quantity: string;
  received_quantity: string | null;
  cancelled_quantity: string | null;
  unit_cost: string;
  discount_amount: string | null;
}

interface SavedAllocationRow {
  id: string;

  purchase_order_line_id: string;
  item_id: string;
  warehouse_id: string;
  warehouse_location_id: string | null;

  batch_no: string | null;
  bin_code: string | null;
  serial_no: string | null;

  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;

  allocated_quantity: string;
  status: string;
}

interface ReceiptRow {
  id: string;
  receipt_no: string | null;
  purchase_order_id: string;
  posting_date: string;
  is_posted: boolean;
}

interface ReceiptLineRow {
  id: string;
  purchase_order_line_id: string;
  quantity: string;
}

interface ReceiptAllocation {
  allocationId: string;
  purchaseOrderLineId: string;
  itemId: string;
  warehouseId: string;
  locationId: string | null;
  batchNo: string | null;
  binCode: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  dateReceived: string | null;
  productionDate: string | null;
  quantity: number;
  unitCost: number;
  commercialAmount: number;
}

interface ReceiptPlan {
  poLine: PurchaseOrderLineRow;
  allocations: ReceiptAllocation[];
  totalQuantity: number;
  totalCommercialAmount: number;
}

interface CompanySettingsRow {
  inventory_system: string | null;
}

interface PostedReceiptLineResult {
  receiptLineId: string;
  allocationId: string;
  inventoryLedgerEntryId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  commercialAmountFCY: number;
  inventoryValue: number;
  purchasePriceVariance: number;
}

export interface PurchaseReceiptPostingResult {
  id: string;
  receipt_no: string | null;
  purchase_order_id: string;
  is_posted: boolean;
  receiptLines: PostedReceiptLineResult[];
  totals: {
    quantity: number;
    commercialAmount: number;
    inventoryValue: number;
    purchasePriceVariance: number;
  };
}

export type PurchaseReceiptScope =
  | {
      type: "ALL_LINES";
    }
  | {
      type: "SELECTED_LINES";
      lineIds: string[];
    };

/* ============================================================
   HELPERS
============================================================ */

function requirePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return value;
}

function requireNonNegativeNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must not be negative.`);
  }

  return value;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeDate(
  value: string | Date | null | undefined,
  field: string,
): string {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${field} is required.`);
  }

  let normalized: string;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${field} is an invalid date.`);
    }

    normalized = value.toISOString().slice(0, 10);
  } else if (typeof value === "string") {
    const trimmed = value.trim();

    // PostgreSQL DATE format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      normalized = trimmed;
    }
    // ISO 8601 UTC timestamp
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(trimmed)) {
      const parsed = new Date(trimmed);

      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${field} is an invalid ISO date.`);
      }

      normalized = parsed.toISOString().slice(0, 10);
    } else {
      throw new Error(
        `${field} must be YYYY-MM-DD or a valid ISO 8601 UTC timestamp.`,
      );
    }
  } else {
    throw new Error(`${field} has an unsupported date format.`);
  }

  // Validate the actual calendar date.
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error(`${field} is not a valid calendar date.`);
  }

  return normalized;
}

function quantitiesMatch(actual: number, expected: number): boolean {
  return Math.abs(roundQuantity(actual - expected)) < 0.000001;
}

function sumQuantities(values: number[]): number {
  return roundQuantity(values.reduce((sum, value) => sum + value, 0));
}

function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

function convertToLCY(amountFCY: number, exchangeRate: number): number {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Invalid purchase order exchange rate.");
  }

  // Assumes 1 FCY = exchangeRate LCY.
  return roundMoney(amountFCY * exchangeRate);
}

/* ============================================================
   SERVICE
============================================================ */

export class PurchaseReceiptService {
  /**
   * Standalone transaction wrapper.
   *
   * Use createTransactional() when receipt posting is
   * combined with invoice posting in one transaction.
   */
  static async create(
    companyId: string,
    payload: PurchaseReceiptPayload,
    scope: PurchaseReceiptScope = { type: "ALL_LINES" },
  ): Promise<PurchaseReceiptPostingResult> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await this.createTransactional(
        client,
        companyId,
        payload,
        scope,
      );

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Full-receipt-only posting.
   *
   * IMPORTANT:
   * - Caller owns BEGIN / COMMIT / ROLLBACK.
   * - Never call pool.connect() here.
   * - All PO lines must be fully allocated.
   * - All item quantities must be received together.
   * - Saved allocations are authoritative.
   */
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: PurchaseReceiptPayload,
    scope: PurchaseReceiptScope = { type: "ALL_LINES" },
  ): Promise<PurchaseReceiptPostingResult> {
    const purchaseOrderId = payload.receipt.purchase_order_id;

    if (!purchaseOrderId) {
      throw new Error("Purchase order ID is required for stock receipt.");
    }

    /*
     * 1. Lock PO header first.
     *
     * All receipt and invoice posting endpoints should
     * follow the same locking order.
     */
    const po = await this.lockPurchaseOrder(client, companyId, purchaseOrderId);

    /*
     * 2. Reject duplicate receipt posting.
     */
    // await this.assertReceiptNotAlreadyPosted(
    //   client,
    //   companyId,
    //   purchaseOrderId,
    // );

    /*
     * 3. Load and lock every active ITEM line.
     */
    // const poLines = await this.lockPurchaseOrderLines(
    //   client,
    //   companyId,
    //   purchaseOrderId,
    // );

    // Lock all active item lines in deterministic order.
    const allPoLines = await this.lockPurchaseOrderLines(
      client,
      companyId,
      purchaseOrderId,
    );

    // Identify lines that have not yet been received.
    const outstandingLines = allPoLines.filter((line) => {
      const received = roundQuantity(Number(line.received_quantity ?? 0));

      const cancelled = roundQuantity(Number(line.cancelled_quantity ?? 0));

      const ordered = roundQuantity(Number(line.quantity));

      return received === 0 && cancelled === 0 && ordered > 0;
    });

    let selectedLines: PurchaseOrderLineRow[];

    if (scope.type === "ALL_LINES") {
      selectedLines = outstandingLines;
    } else {
      const requestedIds = scope.lineIds;

      if (requestedIds.length === 0 || requestedIds.some((id) => !id)) {
        throw new Error("Select at least one valid purchase order line.");
      }

      const requestedSet = new Set(requestedIds);

      if (requestedSet.size !== requestedIds.length) {
        throw new Error("Duplicate purchase order line IDs are not allowed.");
      }

      const allLinesById = new Map(allPoLines.map((line) => [line.id, line]));

      selectedLines = requestedIds.map((lineId) => {
        const line = allLinesById.get(lineId);

        if (!line) {
          throw new Error(
            `PO line ${lineId} does not belong to this purchase order.`,
          );
        }

        const received = Number(line.received_quantity ?? 0);

        const cancelled = Number(line.cancelled_quantity ?? 0);

        if (received !== 0 || cancelled !== 0) {
          throw new Error(
            `PO line ${line.line_no} has already been received ` +
              "or contains cancelled quantities.",
          );
        }

        return line;
      });
    }

    if (selectedLines.length === 0) {
      throw new Error(
        "There are no outstanding purchase order lines to receive.",
      );
    }

    // Load the saved allocation plans from the database.
    const savedAllocations = await this.loadSavedAllocations(
      client,
      companyId,
      purchaseOrderId,
    );

    // Only selected lines are posted.
    const plans = this.buildReceiptPlans(selectedLines, savedAllocations);
    // const plans = this.buildReceiptPlans(poLines, savedAllocations);

    /*
     * 6. Validate company inventory configuration.
     */
    const inventorySystem = await this.getInventorySystem(client, companyId);

    /*
     * The new inventory costing engine maintains
     * perpetual financial inventory valuation.
     *
     * Do not silently post an empty journal for
     * PERIODIC inventory companies.
     */
    if (inventorySystem !== "PERPETUAL") {
      throw new Error(
        "This receipt posting workflow currently requires " +
          "PERPETUAL inventory accounting. " +
          `Company configuration: ${inventorySystem}.`,
      );
    }

    /*
     * 7. Resolve document metadata from trusted PO.
     */
    if (
      payload.receipt.vendor_id &&
      payload.receipt.vendor_id !== po.supplier_id
    ) {
      throw new Error("Receipt supplier does not match the purchase order.");
    }

    const postingDate = normalizeDate(
      payload.receipt.posting_date,
      "posting_date",
    );

    const receiptDate = normalizeDate(
      payload.receipt.receipt_date,
      "receipt_date",
    );

    const currencyId =
      po.currency_id ?? payload.receipt.currency_id ?? undefined;

    const exchangeRate = requirePositiveNumber(
      Number(po.exchange_rate ?? payload.receipt.exchange_rate ?? 1),
      "exchange_rate",
    );

    /*
     * The costing engine and GL amounts below are
     * assumed to use the company's base currency.
     *
     * Until explicit FCY -> LCY conversion is added,
     * reject non-base-currency receipts.
     */
    await this.validateReceiptCurrency(
      client,
      companyId,
      currencyId,
      exchangeRate,
    );

    /*
     * 8. Create receipt header.
     */
    const receiptResult = await client.query<ReceiptRow>(
      `
        INSERT INTO purchase_receipts (
          company_id,
          purchase_order_id,
          vendor_id,
          receipt_date,
          posting_date,
          reference_no,
          notes,
          status,
          is_posted
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          'OPEN', false
        )
        RETURNING
          id,
          receipt_no,
          purchase_order_id,
          posting_date::text,
          is_posted
        `,
      [
        companyId,
        purchaseOrderId,
        po.supplier_id,
        receiptDate,
        postingDate,
        normalizeOptionalText(payload.receipt.reference_no) ?? po.reference,
        normalizeOptionalText(payload.receipt.notes),
      ],
    );

    const receipt = receiptResult.rows[0];

    if (!receipt) {
      throw new Error("Failed to create purchase receipt header.");
    }

    /*
     * 9. Post each physical allocation independently.
     *
     * This preserves batch/location-specific layers.
     */
    const glLines: JournalLineInput[] = [];
    const postedLines: PostedReceiptLineResult[] = [];

    let receiptLineNumber = 0;

    for (const plan of plans) {
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        plan.poLine.item_id,
      );

      for (const allocation of plan.allocations) {
        receiptLineNumber += 1;

        /*
         * Save the commercial receipt line.
         */
        const receiptLineResult = await client.query<ReceiptLineRow>(
          `
            INSERT INTO purchase_receipt_lines (
              company_id,
              purchase_receipt_id,
              purchase_order_line_id,
              line_no,
              item_id,
              warehouse_id,
              location_id,
              bin_code,
              batch_no,
              serial_no,
              expiry_date,
              quantity,
              unit_cost,
              total_cost
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13, $14
            )
            RETURNING
              id,
              purchase_order_line_id,
              quantity::text
            `,
          [
            companyId,
            receipt.id,
            allocation.purchaseOrderLineId,
            receiptLineNumber * 10000,
            allocation.itemId,
            allocation.warehouseId,
            allocation.locationId,
            allocation.binCode,
            allocation.batchNo,
            allocation.serialNo,
            allocation.expiryDate,
            allocation.quantity,
            allocation.unitCost,
            allocation.commercialAmount,
          ],
        );

        const receiptLine = receiptLineResult.rows[0];

        if (!receiptLine) {
          throw new Error("Failed to create purchase receipt line.");
        }

        const unitCostLCY = roundUnitCost(allocation.unitCost * exchangeRate);

        /*
         * Post inventory using the costing engine.
         *
         * The engine owns:
         * - Inventory ledger entry
         * - Company-wide cost balance
         * - Cost movement audit
         * - Item current cost synchronization
         */
        const inbound = await UnifiedInventoryEngineService.processInboundStock(
          client,
          companyId,
          postingDate,
          "PURCHASE_RECEIPT",
          {
            item_id: allocation.itemId,
            warehouse_id: allocation.warehouseId,
            location_id: allocation.locationId,
            bin_code: allocation.binCode,
            batch_no: allocation.batchNo,
            serial_no: allocation.serialNo,
            expiry_date: allocation.expiryDate,
            date_received: allocation.dateReceived,
            prod_date: allocation.productionDate,
            quantity: allocation.quantity,

            // unit_cost: allocation.unitCost,
            unit_cost: unitCostLCY,

            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            reference_line_id: receiptLine.id,
          },
        );

        const inventoryValueLCY = roundMoney(inbound.totalCost);

        const commercialAmountFCY = roundMoney(allocation.commercialAmount);

        const commercialAmountLCY = convertToLCY(
          commercialAmountFCY,
          exchangeRate,
        );

        const ppvAmountLCY = roundMoney(
          commercialAmountLCY - inventoryValueLCY,
        );

        /*
         * Calculate GL variance from the actual
         * amounts being posted.
         *
         * This also absorbs any legitimate cent-level
         * rounding difference between allocation values
         * and the financial inventory movement.
         */
        // const ppvAmount = roundMoney(commercialAmount - inventoryValue);

        /*
         * Validate engine's PPV calculation.
         *
         * This should normally match exactly.
         */
        // if (Math.abs(roundMoney(ppvAmount - inbound.ppvAmount)) > 0.01) {
        //   throw new Error(
        //     "Inventory engine PPV does not reconcile " +
        //       `for item ${allocation.itemId}.`,
        //   );
        // }

        /*
         * Create GRNI at commercial receipt value,
         * NOT the financial inventory valuation.
         */

        await client.query(
          `
            INSERT INTO grni_entries (
              company_id,
              purchase_order_line_id,
              purchase_receipt_line_id,
              warehouse_id,
              item_id,
              grn_id,
              amount,
              cleared_amount,
              exchange_rate,
              base_amount,
              base_cleared_amount,
              qty_received,
              qty_cleared,
              status
            )
            VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, 0, $8, $9, 0, $10, 0,
              'OPEN'
            )
          `,
          [
            companyId,
            allocation.purchaseOrderLineId,
            receiptLine.id,
            allocation.warehouseId,
            allocation.itemId,
            receipt.id,
            commercialAmountFCY,
            exchangeRate,
            commercialAmountLCY,
            allocation.quantity,
          ],
        );
        // await client.query(
        //   `
        //   INSERT INTO grni_entries (
        //     company_id,
        //     purchase_order_line_id,
        //     purchase_receipt_line_id,
        //     warehouse_id,
        //     item_id,
        //     grn_id,
        //     amount,
        //     cleared_amount,
        //     status
        //   )
        //   VALUES (
        //     $1, $2, $3, $4, $5, $6,
        //     $7, 0, 'OPEN'
        //   )
        //   `,
        //   [
        //     companyId,
        //     allocation.purchaseOrderLineId,
        //     receiptLine.id,
        //     allocation.warehouseId,
        //     allocation.itemId,
        //     receipt.id,
        //     commercialAmountFCY,
        //   ],
        // );

        /*
         * DR Inventory Asset.
         */
        if (inventoryValueLCY > 0) {
          glLines.push({
            account_id: accounts.inventory_account_id,
            debit: inventoryValueLCY,
            credit: 0,
            item_id: allocation.itemId,
            warehouse_id: allocation.warehouseId,
            quantity: allocation.quantity,
            unit_cost: roundUnitCost(inventoryValueLCY / allocation.quantity),
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            description: `Inventory receipt: ${allocation.itemId}`,
          });
        }

        /*
         * DR / CR Purchase Price Variance.
         *
         * Standard costing normally generates PPV.
         */
        if (ppvAmountLCY !== 0) {
          const varianceAccountId = accounts.purchase_price_variance_account_id;

          if (!varianceAccountId) {
            throw new Error(
              "Purchase price variance account is " +
                `not configured for item ${allocation.itemId}.`,
            );
          }

          glLines.push({
            account_id: varianceAccountId,
            debit: ppvAmountLCY > 0 ? ppvAmountLCY : 0,
            credit: ppvAmountLCY < 0 ? Math.abs(ppvAmountLCY) : 0,
            item_id: allocation.itemId,
            warehouse_id: allocation.warehouseId,
            quantity: allocation.quantity,
            unit_cost: roundUnitCost(
              Math.abs(ppvAmountLCY) / allocation.quantity,
            ),
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            description: `Purchase price variance: ${allocation.itemId}`,
          });
        }

        /*
         * CR GRNI Liability.
         */
        if (commercialAmountLCY > 0) {
          glLines.push({
            account_id: accounts.grni_account_id,
            debit: 0,
            credit: commercialAmountLCY,
            item_id: allocation.itemId,
            warehouse_id: allocation.warehouseId,
            quantity: allocation.quantity,
            unit_cost: allocation.unitCost,
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            description: `GRNI receipt: ${allocation.itemId}`,
          });
        }

        postedLines.push({
          receiptLineId: receiptLine.id,
          allocationId: allocation.allocationId,
          inventoryLedgerEntryId: inbound.ledgerEntry.id,
          itemId: allocation.itemId,
          warehouseId: allocation.warehouseId,
          quantity: allocation.quantity,
          commercialAmountFCY,
          inventoryValue: inventoryValueLCY,
          purchasePriceVariance: ppvAmountLCY,
        });
      }

      /*
       * Update received quantity once per PO line.
       *
       * Avoid updating it separately for every batch.
       */

      const updated = await client.query(
        `
        UPDATE purchase_order_lines
        SET
          received_quantity = quantity,
          remaining_quantity = 0,
          updated_at = NOW()
        WHERE id = $1
          AND company_id = $2
          AND purchase_order_id = $3
          AND COALESCE(is_deleted, false) = false
          AND COALESCE(received_quantity, 0) = 0
          AND COALESCE(cancelled_quantity, 0) = 0
          AND quantity = $4
        `,
        [plan.poLine.id, companyId, purchaseOrderId, plan.totalQuantity],
      );

      if (updated.rowCount !== 1) {
        throw new Error(
          `PO line ${plan.poLine.line_no} was changed or already received.`,
        );
      }
    }

    /*
     * 10. Validate all PO lines are fully received.
     */
    // await this.assertPurchaseOrderFullyReceived(
    //   client,
    //   companyId,
    //   purchaseOrderId,
    // );

    /*
     * 11. Validate and post GL.
     */
    if (glLines.length > 0) {
      const baseCurrencyId = await this.getBaseCurrencyId(client, companyId);
      GLValidationService.validateBalanced(glLines);

      const accountIds = [...new Set(glLines.map((line) => line.account_id))];

      for (const accountId of accountIds) {
        await this.validateCompanyAccount(client, companyId, accountId);
      }

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "PURCHASE",
        journal_type: "PURCHASE_RECEIPT",
        reference: receipt.receipt_no ?? receipt.id,
        source_id: receipt.id,
        description: `Purchase receipt ${receipt.receipt_no ?? receipt.id}`,
        currency_id: baseCurrencyId,
        exchange_rate: 1, // exchangeRate,
        created_by: payload.receipt.userId ?? null,
        lines: glLines,
      });
    }

    /*
     * 12. Mark receipt posted.
     */
    const posted = await client.query(
      `
      UPDATE purchase_receipts
      SET
        is_posted = true,
        posted_at = NOW()
      WHERE id = $1
        AND company_id = $2
        AND is_posted = false
      `,
      [receipt.id, companyId],
    );

    if (posted.rowCount !== 1) {
      throw new Error("Failed to finalize purchase receipt.");
    }

    /*
     * 13. Mark PO received.
     *
     * Do not mark it invoiced here.
     */

    await this.recalculateReceiptStatus(client, companyId, purchaseOrderId);

    return {
      id: receipt.id,
      receipt_no: receipt.receipt_no,
      purchase_order_id: purchaseOrderId,
      is_posted: true,
      receiptLines: postedLines,
      totals: {
        quantity: sumQuantities(postedLines.map((line) => line.quantity)),
        commercialAmount: sumMoney(
          postedLines.map((line) => line.commercialAmountFCY),
        ),
        inventoryValue: sumMoney(
          postedLines.map((line) => line.inventoryValue),
        ),
        purchasePriceVariance: sumMoney(
          postedLines.map((line) => line.purchasePriceVariance),
        ),
      },
    };
  }

  /* ============================================================
     LOCK PURCHASE ORDER
  ============================================================ */

  private static async lockPurchaseOrder(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderRow> {
    const result = await client.query<PurchaseOrderRow>(
      `
        SELECT
          id,
          company_id,
          supplier_id,
          status::text,
          is_posted,
          currency_id,
          exchange_rate,
          reference
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

    if (
      ["received", "completed", "cancelled"].includes(po.status.toLowerCase())
    ) {
      throw new Error(
        `Purchase order cannot be received in status ${po.status}.`,
      );
    }

    return po;
  }

  /* ============================================================
     DUPLICATE RECEIPT PROTECTION
  ============================================================ */

  // private static async assertReceiptNotAlreadyPosted(
  //   client: PoolClient,
  //   companyId: string,
  //   purchaseOrderId: string,
  // ): Promise<void> {
  //   const result = await client.query<{
  //     id: string;
  //   }>(
  //     `
  //     SELECT id
  //     FROM purchase_receipts
  //     WHERE company_id = $1
  //       AND purchase_order_id = $2
  //       AND is_posted = true
  //     LIMIT 1
  //     `,
  //     [companyId, purchaseOrderId],
  //   );

  //   if (result.rows.length > 0) {
  //     throw new Error("This purchase order already has a posted receipt.");
  //   }
  // }

  /* ============================================================
     LOCK ALL PO ITEM LINES
  ============================================================ */

  private static async lockPurchaseOrderLines(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderLineRow[]> {
    const result = await client.query<PurchaseOrderLineRow>(
      `
        SELECT
          id,
          line_no,
          item_id,
          warehouse_id,
          quantity::text,
          received_quantity::text,
          cancelled_quantity::text,
          unit_cost::text,
          discount_amount::text
        FROM purchase_order_lines
        WHERE company_id = $1
          AND purchase_order_id = $2
          AND COALESCE(is_deleted, false) = false
          AND (
            line_type = 'ITEM'
            OR (
              line_type IS NULL
              AND item_id IS NOT NULL
            )
          )
        ORDER BY line_no, id
        FOR UPDATE
        `,
      [companyId, purchaseOrderId],
    );

    if (result.rows.length === 0) {
      throw new Error("Purchase order has no active inventory item lines.");
    }

    for (const line of result.rows) {
      const ordered = Number(line.quantity);
      const received = Number(line.received_quantity ?? 0);
      const cancelled = Number(line.cancelled_quantity ?? 0);

      requirePositiveNumber(ordered, `PO line ${line.line_no} quantity`);

      requireNonNegativeNumber(
        received,
        `PO line ${line.line_no} received quantity`,
      );

      requireNonNegativeNumber(
        cancelled,
        `PO line ${line.line_no} cancelled quantity`,
      );

      if (roundQuantity(received + cancelled) > roundQuantity(ordered)) {
        throw new Error(
          `PO line ${line.line_no} has inconsistent received ` +
            "or cancelled quantities.",
        );
      }

      // A line may be either entirely unreceived or fully received.
      // Reject legacy partial-line receipts in this workflow.
      if (received > 0 && !quantitiesMatch(received, ordered)) {
        throw new Error(
          `PO line ${line.line_no} is partially received. ` +
            "Resolve this existing line before using full-line receipt posting.",
        );
      }

      // if (received > 0) {
      //   throw new Error(
      //     "Partial or previous receipt detected for PO line " +
      //       line.id +
      //       ". Full-receipt-only posting cannot continue.",
      //   );
      // }

      // if (cancelled > 0) {
      //   throw new Error(
      //     "Cancelled quantities detected for PO line " +
      //       line.id +
      //       ". Resolve the PO before full receipt.",
      //   );
      // }
    }

    return result.rows;
  }

  /* ============================================================
     LOAD SAVED STOCK ALLOCATIONS
  ============================================================ */

  private static async loadSavedAllocations(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<SavedAllocationRow[]> {
    const result = await client.query<SavedAllocationRow>(
      `
        SELECT
          a.id,
          a.purchase_order_line_id,
          a.item_id,
          a.warehouse_id,
          a.warehouse_location_id,
          a.batch_no,
          a.bin_code,
          a.serial_no,
          a.expiry_date::text,
          a.date_received::text,
          a.prod_date::text,
          a.allocated_quantity::text,
          a.status
        FROM inventory_allocations a
        INNER JOIN purchase_order_lines pol
          ON pol.id = a.purchase_order_line_id
         AND pol.company_id = a.company_id
        WHERE a.company_id = $1
          AND pol.purchase_order_id = $2
          AND COALESCE(pol.is_deleted, false) = false
          AND a.outbound_entry_id IS NULL
          AND a.inbound_entry_id IS NULL
          AND a.status = 'ACTIVE'
        ORDER BY
          pol.line_no,
          a.created_at,
          a.id
        FOR UPDATE OF a
        `,
      [companyId, purchaseOrderId],
    );

    return result.rows;
  }

  /* ============================================================
     BUILD FULL RECEIPT PLAN
  ============================================================ */

  private static buildReceiptPlans(
    poLines: PurchaseOrderLineRow[],
    savedAllocations: SavedAllocationRow[],
  ): ReceiptPlan[] {
    const allocationsByLine = new Map<string, SavedAllocationRow[]>();

    for (const allocation of savedAllocations) {
      const existing =
        allocationsByLine.get(allocation.purchase_order_line_id) ?? [];

      existing.push(allocation);

      allocationsByLine.set(allocation.purchase_order_line_id, existing);
    }

    const plans: ReceiptPlan[] = [];

    for (const poLine of poLines) {
      const orderedQuantity = roundQuantity(Number(poLine.quantity));

      const lineAllocations = allocationsByLine.get(poLine.id) ?? [];

      if (lineAllocations.length === 0) {
        throw new Error(
          `No stock allocations found for PO line ${poLine.line_no}.`,
        );
      }

      const totalAllocatedQuantity = sumQuantities(
        lineAllocations.map((allocation) =>
          Number(allocation.allocated_quantity),
        ),
      );

      if (!quantitiesMatch(totalAllocatedQuantity, orderedQuantity)) {
        throw new Error(
          `PO line ${poLine.line_no} must be fully allocated. ` +
            `Ordered: ${orderedQuantity}, ` +
            `allocated: ${totalAllocatedQuantity}.`,
        );
      }

      /*
       * Pricing convention:
       *
       * purchase_order_lines.unit_cost is assumed to
       * be the gross unit cost before discount_amount.
       *
       * If your unit_cost is already discounted,
       * remove the discount subtraction below.
       */
      const grossUnitCost = requireNonNegativeNumber(
        Number(poLine.unit_cost),
        `PO line ${poLine.line_no} unit cost`,
      );

      const discountAmount = requireNonNegativeNumber(
        Number(poLine.discount_amount ?? 0),
        `PO line ${poLine.line_no} discount`,
      );

      const grossLineAmount = roundMoney(orderedQuantity * grossUnitCost);

      const netLineAmount = roundMoney(grossLineAmount - discountAmount);

      if (netLineAmount < 0) {
        throw new Error(
          `Discount exceeds gross amount on PO line ${poLine.line_no}.`,
        );
      }

      const netUnitCost = roundUnitCost(netLineAmount / orderedQuantity);

      const allocations: ReceiptAllocation[] = [];

      let assignedCommercialAmount = 0;

      for (let index = 0; index < lineAllocations.length; index++) {
        const allocation = lineAllocations[index];

        const quantity = roundQuantity(
          requirePositiveNumber(
            Number(allocation.allocated_quantity),
            `Allocation ${allocation.id} quantity`,
          ),
        );

        if (allocation.item_id !== poLine.item_id) {
          throw new Error(`Allocation ${allocation.id} has an incorrect item.`);
        }

        if (!allocation.warehouse_id) {
          throw new Error(
            `Warehouse is missing for allocation ${allocation.id}.`,
          );
        }

        /*
         * A PO may allow allocations across warehouses.
         * If your business rule requires one PO-line
         * warehouse, enforce equality here.
         */

        const isLast = index === lineAllocations.length - 1;

        const commercialAmount = isLast
          ? roundMoney(netLineAmount - assignedCommercialAmount)
          : roundMoney((quantity * netLineAmount) / orderedQuantity);

        assignedCommercialAmount = roundMoney(
          assignedCommercialAmount + commercialAmount,
        );

        allocations.push({
          allocationId: allocation.id,
          purchaseOrderLineId: poLine.id,
          itemId: poLine.item_id,
          warehouseId: allocation.warehouse_id,
          locationId: allocation.warehouse_location_id,
          batchNo: allocation.batch_no,
          binCode: allocation.bin_code,
          // serialNo: null,
          serialNo: allocation.serial_no,
          expiryDate: allocation.expiry_date,
          dateReceived: allocation.date_received,
          productionDate: allocation.prod_date,
          quantity,
          unitCost: netUnitCost,
          commercialAmount,
        });
      }

      if (
        sumMoney(
          allocations.map((allocation) => allocation.commercialAmount),
        ) !== netLineAmount
      ) {
        throw new Error(
          `Receipt value does not reconcile for PO line ${poLine.line_no}.`,
        );
      }

      plans.push({
        poLine,
        allocations,
        totalQuantity: orderedQuantity,
        totalCommercialAmount: netLineAmount,
      });
    }

    return plans;
  }

  /* ============================================================
     INVENTORY SYSTEM
  ============================================================ */

  private static async getInventorySystem(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const result = await client.query<CompanySettingsRow>(
      `
        SELECT inventory_system
        FROM companies
        WHERE id = $1
        `,
      [companyId],
    );

    if (!result.rows[0]) {
      throw new Error("Company inventory configuration not found.");
    }

    return (result.rows[0].inventory_system ?? "PERIODIC").toUpperCase();
  }

  /* ============================================================
     BASE CURRENCY VALIDATION
  ============================================================ */

  private static async getBaseCurrencyId(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const result = await client.query<{
      currency_id: string;
    }>(
      `
    SELECT cc.currency_id
    FROM company_currencies cc
    INNER JOIN currencies curr
      ON curr.id = cc.currency_id
    WHERE cc.company_id = $1
      AND cc.is_base = true
      AND cc.status = 1
    LIMIT 1
    `,
      [companyId],
    );

    const baseCurrencyId = result.rows[0]?.currency_id;

    if (!baseCurrencyId) {
      throw new Error(
        "Company base currency is not configured or is inactive.",
      );
    }

    return baseCurrencyId;
  }

  private static async validateReceiptCurrency(
    client: PoolClient,
    companyId: string,
    currencyId: string | undefined,
    exchangeRate: number,
  ): Promise<void> {
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error(
        "Purchase order exchange rate must be greater than zero.",
      );
    }

    // Resolve the company's configured base currency.
    const baseCurrencyResult = await client.query<{
      currency_id: string;
    }>(
      `
      SELECT cc.currency_id
      FROM company_currencies cc
      WHERE cc.company_id = $1
        AND cc.is_base = true
        AND cc.status = 1
      LIMIT 1
      `,
      [companyId],
    );

    const baseCurrencyId = baseCurrencyResult.rows[0]?.currency_id;

    if (!baseCurrencyId) {
      throw new Error("Company base currency is not configured.");
    }

    // If no currency was supplied, only a base-currency
    // receipt with exchange rate 1 is acceptable.
    if (!currencyId) {
      if (Math.abs(exchangeRate - 1) > 0.000001) {
        throw new Error(
          "Receipt currency is required when exchange rate is not 1.",
        );
      }

      return;
    }

    // Verify the receipt currency is enabled for this company.
    const currencyResult = await client.query<{
      currency_id: string;
    }>(
      `
      SELECT cc.currency_id
      FROM company_currencies cc
      WHERE cc.company_id = $1
        AND cc.currency_id = $2
        AND cc.status = 1
      LIMIT 1
      `,
      [companyId, currencyId],
    );

    if (!currencyResult.rows[0]) {
      throw new Error("Receipt currency is not active for this company.");
    }

    const isBaseCurrency = currencyId === baseCurrencyId;

    if (isBaseCurrency && Math.abs(exchangeRate - 1) > 0.000001) {
      throw new Error(
        "Base-currency purchase receipts must use exchange rate 1.",
      );
    }

    // Foreign currency is allowed when exchangeRate > 0.
    // The posting workflow must convert FCY to LCY.
  }

  /* ============================================================
     VALIDATE GL ACCOUNT OWNERSHIP
  ============================================================ */

  private static async validateCompanyAccount(
    client: PoolClient,
    companyId: string,
    accountId: string,
  ): Promise<void> {
    const result = await client.query<{
      is_active: boolean;
      is_posting: boolean;
    }>(
      `
      SELECT is_active, is_posting
      FROM chart_of_accounts
      WHERE id = $1
        AND company_id = $2
      `,
      [accountId, companyId],
    );

    const account = result.rows[0];

    if (!account) {
      throw new Error(
        `GL account ${accountId} does not belong to this company.`,
      );
    }

    if (!account.is_active || !account.is_posting) {
      throw new Error(
        `GL account ${accountId} is not an active posting account.`,
      );
    }
  }

  /* ============================================================
     VERIFY FULL RECEIPT
  ============================================================ */

  // private static async assertPurchaseOrderFullyReceived(
  //   client: PoolClient,
  //   companyId: string,
  //   purchaseOrderId: string,
  // ): Promise<void> {
  //   const result = await client.query<{
  //     incomplete_count: string;
  //   }>(
  //     `
  //     SELECT COUNT(*)::text AS incomplete_count
  //     FROM purchase_order_lines
  //     WHERE company_id = $1
  //       AND purchase_order_id = $2
  //       AND COALESCE(is_deleted, false) = false
  //       AND (
  //         line_type = 'ITEM'
  //         OR (
  //           line_type IS NULL
  //           AND item_id IS NOT NULL
  //         )
  //       )
  //       AND ABS(
  //         quantity - COALESCE(received_quantity, 0)
  //       ) > 0.000001
  //     `,
  //     [companyId, purchaseOrderId],
  //   );

  //   if (Number(result.rows[0]?.incomplete_count ?? 0) > 0) {
  //     throw new Error("Purchase order is not fully received.");
  //   }
  // }

  private static async recalculateReceiptStatus(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<"open" | "partial_received" | "received"> {
    const result = await client.query<{
      total_lines: string;
      completed_lines: string;
      received_lines: string;
    }>(
      `
    SELECT
      COUNT(*)::text AS total_lines,

      COUNT(*) FILTER (
        WHERE
          COALESCE(received_quantity, 0) = quantity
      )::text AS completed_lines,

      COUNT(*) FILTER (
        WHERE COALESCE(received_quantity, 0) > 0
      )::text AS received_lines

    FROM purchase_order_lines
    WHERE company_id = $1
      AND purchase_order_id = $2
      AND COALESCE(is_deleted, false) = false
      AND (
        line_type = 'ITEM'
        OR (
          line_type IS NULL
          AND item_id IS NOT NULL
        )
      )
    `,
      [companyId, purchaseOrderId],
    );

    const summary = result.rows[0];

    const total = Number(summary?.total_lines ?? 0);
    const completed = Number(summary?.completed_lines ?? 0);
    const received = Number(summary?.received_lines ?? 0);

    const status: "open" | "partial_received" | "received" =
      total > 0 && completed === total
        ? "received"
        : received > 0
          ? "partial_received"
          : "open";

    await client.query(
      `
    UPDATE purchase_orders
    SET status = $1,
        updated_at = NOW()
    WHERE id = $2
      AND company_id = $3
    `,
      [status, purchaseOrderId, companyId],
    );

    return status;
  }

  /* ============================================================
     POSTED RECEIPT DELETION GUARD
  ============================================================ */

  /**
   * Kept for compatibility with the existing DELETE route.
   *
   * Posted receipt lines must not be deleted or
   * reversed by directly changing ledger layers.
   *
   * Use a purchase return / controlled reversal
   * service that also updates company-wide costing.
   */
  static async safeDeleteReceiptLine(
    companyId: string,
    purchaseReceiptLineId: string,
  ): Promise<never> {
    const result = await pool.query<{
      id: string;
      is_posted: boolean;
    }>(
      `
      SELECT
        prl.id,
        pr.is_posted
      FROM purchase_receipt_lines prl
      INNER JOIN purchase_receipts pr
        ON pr.id = prl.purchase_receipt_id
       AND pr.company_id = prl.company_id
      WHERE prl.id = $1
        AND prl.company_id = $2
      `,
      [purchaseReceiptLineId, companyId],
    );

    const receiptLine = result.rows[0];

    if (!receiptLine) {
      throw new Error("Purchase receipt line not found.");
    }

    if (receiptLine.is_posted) {
      throw new Error(
        "Posted purchase receipt lines cannot be deleted. " +
          "Create a purchase return or an approved " +
          "inventory reversal instead.",
      );
    }

    throw new Error(
      "Draft receipt deletion is not supported by the " +
        "full-receipt posting service.",
    );
  }
}

/* import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

export class PurchaseReceiptService {
  //  * Standalone creation entry point (Creates and manages its own client connection)

  static async create(companyId: string, payload: PurchaseReceiptPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const receipt = await this.createTransactional(
        client,
        companyId,
        payload,
      );
      await client.query("COMMIT");
      return receipt;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  //  * Transactional creation engine designed to be safely combined with other services (e.g. Allocation Engine)

  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: PurchaseReceiptPayload,
  ) {
    const receiptResult = await client.query(
      `
      INSERT INTO purchase_receipts (
        company_id,
        purchase_order_id,
        vendor_id,
        receipt_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', false)
      RETURNING *
      `,
      [
        companyId,
        payload.receipt.purchase_order_id,
        payload.receipt.vendor_id,
        payload.receipt.receipt_date,
        payload.receipt.posting_date,
        payload.receipt.reference_no || null,
        payload.receipt.notes || null,
      ],
    );

    const receipt = receiptResult.rows[0];

    const currencyId = payload.receipt.currency_id;
    const exchangeRate = payload.receipt.exchange_rate;
    const userId = payload.receipt.userId;

    const glLines: JournalLineInput[] = [];

    for (const line of payload.lines) {
      if (line.item_id && !line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for item ${line.item_id}`,
        );
      }

      const qtyReceived = Number(line.quantity);
      if (qtyReceived <= 0) {
        throw new Error("Receipt quantity must be greater than zero");
      }

      // 1. Prevent over-receiving on Purchase Order lines
      if (line.purchase_order_line_id) {
        const poLineResult = await client.query(
          `
          SELECT quantity, received_quantity 
          FROM purchase_order_lines 
          WHERE id = $1 FOR UPDATE
          `,
          [line.purchase_order_line_id],
        );

        if (!poLineResult.rows.length) {
          throw new Error(
            `Purchase Order line ${line.purchase_order_line_id} not found`,
          );
        }

        const poLine = poLineResult.rows[0];
        const remainingAllowed =
          Number(poLine.quantity) - Number(poLine.received_quantity || 0);

        if (qtyReceived > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Receipt quantity (${qtyReceived}) exceeds remaining open line quantity (${remainingAllowed})`,
          );
        }
      }

      // 2. Save Purchase Receipt Line Row
      const unitCost = Number(line.unit_cost);
      const totalCost = Number((qtyReceived * unitCost).toFixed(2));

      const lineResult = await client.query(
        `
        INSERT INTO purchase_receipt_lines (
          company_id, purchase_receipt_id, purchase_order_line_id,
          line_no, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, consignment_no, expiry_date,
          quantity, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        `,
        [
          companyId,
          receipt.id,
          line.purchase_order_line_id || null,
          line.line_no,
          line.item_id,
          line.warehouse_id,
          line.location_id || null,
          line.bin_code || null,
          line.batch_no || null,
          line.serial_no || null,
          line.consignment_no || null,
          line.expiry_date || null,
          qtyReceived,
          unitCost,
          totalCost,
        ],
      );

      const receiptLine = lineResult.rows[0];

      // 3. Delegate to Inventory Engine ONLY if physical item exists
      let inventoryValueToCapitalize = totalCost;
      let ppvAmount = 0;
      let ledgerEntryUnitCost = 0;

      if (line.item_id && line.warehouse_id) {
        const inboundRes =
          await UnifiedInventoryEngineService.processInboundStock(
            client,
            companyId,
            receipt.posting_date,
            "PURCHASE_RECEIPT",
            {
              item_id: line.item_id,
              warehouse_id: line.warehouse_id,
              location_id: line.location_id,
              bin_code: line.bin_code,
              batch_no: line.batch_no,
              serial_no: line.serial_no,
              expiry_date: line.expiry_date,
              quantity: qtyReceived,
              unit_cost: unitCost,
              reference_type: "PURCHASE_RECEIPT",
              reference_id: receipt.id,
              reference_line_id: receiptLine.id,
            },
          );
        inventoryValueToCapitalize = Number(inboundRes.ledgerEntry.total_cost);
        ledgerEntryUnitCost = Number(inboundRes.ledgerEntry.unit_cost);

        ppvAmount = inboundRes.ppvAmount;
      }

      // const inventoryValueToCapitalize = Number(ledgerEntry.total_cost);

      // 4. Create GRNI entry for invoice matching
      await client.query(
        `
        INSERT INTO grni_entries (
          company_id, purchase_order_line_id, purchase_receipt_line_id,
          warehouse_id, item_id, grn_id, amount, cleared_amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'OPEN')
        `,
        [
          companyId,
          line.purchase_order_line_id || null,
          receiptLine.id,
          line.warehouse_id || null,
          line.item_id || null,
          receipt.id,
          totalCost,
        ],
      );

      // 5. Update Purchase Order Line Received Quantities
      if (line.purchase_order_line_id) {
        await client.query(
          `
          UPDATE purchase_order_lines 
          SET received_quantity = COALESCE(received_quantity, 0) + $1, updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReceived, line.purchase_order_line_id],
        );
      }

      // 6. Build General Ledger Posting Entries
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      // Fetch Inventory System setting
      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      // Build General Ledger Posting Entries (ONLY for PERPETUAL mode)

      if (inventorySystem === "PERPETUAL") {
        // DR - Inventory Asset (Interim)
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: inventoryValueToCapitalize,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReceived,
          unit_cost: ledgerEntryUnitCost, //Number(inboundRes.ledgerEntry.unit_cost),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receipt.id,
          description: `Asset receipt for item ${line.item_id}`,
        });

        // Handle Purchase Price Variance (Standard Costing)
        if (ppvAmount !== 0) {
          const varianceAccountId =
            accounts.purchase_price_variance_account_id ||
            accounts.purchase_account_id;

          if (!varianceAccountId) {
            throw new Error(
              `Purchase variance/purchase GL account is missing for item ${line.item_id}.`,
            );
          }

          glLines.push({
            account_id: varianceAccountId,
            debit: ppvAmount > 0 ? ppvAmount : 0,
            credit: ppvAmount < 0 ? Math.abs(ppvAmount) : 0,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: qtyReceived,
            unit_cost: Math.abs(ppvAmount / qtyReceived),
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            description: `Purchase Price Variance for item ${line.item_id}`,
          });
        }

        // CR - GRNI Liability (Interim Clearing Acc)
        glLines.push({
          account_id: accounts.grni_account_id,
          debit: 0,
          credit: totalCost,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReceived,
          unit_cost: unitCost,
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receipt.id,
          description: `GRNI liability for item ${line.item_id}`,
        });
      }
    }

    // 7. Validate GL Balance & Post Journal
    GLValidationService.validateBalanced(glLines);

    await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: receipt.posting_date,
      source: "PURCHASE",
      journal_type: "PURCHASE_RECEIPT",
      reference: receipt.receipt_no,
      source_id: receipt.id,
      description: `Posted receipt tracking document: ${receipt.receipt_no}`,
      currency_id: currencyId,
      exchange_rate: exchangeRate,
      created_by: userId || null,
      lines: glLines,
    });

    // 8. Seal Receipt Posting Status
    await client.query(
      `
      UPDATE purchase_receipts 
      SET is_posted = true, posted_at = NOW() 
      WHERE id = $1
      `,
      [receipt.id],
    );

    // 9. Update Purchase Order Workflow Status
    await client.query(
      `
      UPDATE purchase_orders po
      SET status = CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
            AND COALESCE(pol.received_quantity, 0) < COALESCE(pol.quantity, 0)
            AND COALESCE(pol.is_deleted, false) = false
        ) THEN 'received'::purchase_order_status_enum
        ELSE 'partial_received'::purchase_order_status_enum
      END,
      updated_at = NOW()
      WHERE po.id = $1
      `,
      [payload.receipt.purchase_order_id],
    );

    return receipt;
  }

  //  * Safely reverses allocations, ledger layers, general ledger distributions, and drops a line element

  static async safeDeleteReceiptLine(
    companyId: string,
    purchaseReceiptLineId: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch current active record metrics safely using a Row Lock
      const lineRes = await client.query(
        `SELECT * FROM purchase_receipt_lines WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [purchaseReceiptLineId, companyId],
      );
      if (!lineRes.rows.length)
        throw new Error("Receipt line target item record not found.");
      const receiptLine = lineRes.rows[0];

      // 2. Validate if the associated inventory has already been issued outward
      const layerRes = await client.query(
        `SELECT id, quantity, remaining_quantity FROM inventory_ledger_entries 
         WHERE reference_line_id = $1 AND reference_type = 'PURCHASE_RECEIPT' FOR UPDATE`,
        [purchaseReceiptLineId],
      );

      let effectiveLedgerUnitCost = Number(receiptLine.unit_cost);

      if (layerRes.rows.length) {
        const layer = layerRes.rows[0];
        effectiveLedgerUnitCost = Number(layer.unit_cost);
        if (Number(layer.remaining_quantity) !== Number(layer.quantity)) {
          throw new Error(
            "Cannot modify line. Part of this inventory batch has already been consumed by downstream transactions.",
          );
        }
      }

      // 3. Remove downstream matching allocations tied directly to this item row
      await client.query(
        `DELETE FROM inventory_allocations WHERE inbound_entry_id = (
          SELECT id FROM inventory_ledger_entries WHERE reference_line_id = $1
         )`,
        [purchaseReceiptLineId],
      );

      // 4. Clean out GRNI entries
      await client.query(
        `DELETE FROM grni_entries WHERE purchase_receipt_line_id = $1`,
        [purchaseReceiptLineId],
      );

      // 5. Deduct received quantity figures from the original parent purchase contract sheet
      if (receiptLine.purchase_order_line_id) {
        await client.query(
          `UPDATE purchase_order_lines 
           SET received_quantity = GREATEST(0, COALESCE(received_quantity, 0) - $1), updated_at = NOW()
           WHERE id = $2`,
          [Number(receiptLine.quantity), receiptLine.purchase_order_line_id],
        );
      }

      // 6. Generate financial reversal vectors (Swap Credit/Debit locations to zero out interim states)
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        receiptLine.item_id,
      );

      const qty = Number(receiptLine.quantity);
      const totalPOValue = Number(receiptLine.total_cost);
      const inventoryReversalVal = Number(
        (qty * effectiveLedgerUnitCost).toFixed(2),
      );
      const ppvReversalVal = Number(
        (totalPOValue - inventoryReversalVal).toFixed(2),
      );

      const reversalGlLines: JournalLineInput[] = [
        {
          account_id: accounts.inventory_account_id,
          debit: 0,
          credit: inventoryReversalVal,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: effectiveLedgerUnitCost,
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of asset receipt line ${purchaseReceiptLineId}`,
        },
        {
          account_id: accounts.grni_account_id,
          debit: totalPOValue,
          credit: 0,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: Number(receiptLine.unit_cost),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of GRNI clearing line ${purchaseReceiptLineId}`,
        },
      ];

      if (ppvReversalVal !== 0) {
        const varianceAccountId =
          accounts.purchase_price_variance_account_id ||
          accounts.purchase_account_id;

        if (!varianceAccountId) {
          throw new Error(
            `Purchase variance/purchase GL account is missing for item ${receiptLine.item_id}.`,
          );
        }

        reversalGlLines.push({
          account_id: varianceAccountId,
          debit: ppvReversalVal < 0 ? Math.abs(ppvReversalVal) : 0,
          credit: ppvReversalVal > 0 ? ppvReversalVal : 0,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: Math.abs(ppvReversalVal / qty),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of Purchase Price Variance line ${purchaseReceiptLineId}`,
        });
      }

      GLValidationService.validateBalanced(reversalGlLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: new Date().toISOString().split("T")[0],
        source: "PURCHASE",
        journal_type: "PURCHASE_RECEIPT",
        reference: `REV-${purchaseReceiptLineId.substring(0, 8)}`,
        source_id: receiptLine.purchase_receipt_id,
        description: `Financial reversal entry for deleted receipt item: ${purchaseReceiptLineId}`,
        lines: reversalGlLines,
      });

      // 7. Nullify the inventory layer balance tracking record
      await client.query(
        `UPDATE inventory_ledger_entries SET remaining_quantity = 0, status = 'CLOSED' WHERE reference_line_id = $1`,
        [purchaseReceiptLineId],
      );

      // 8. Soft-delete the document line row
      await client.query(
        `UPDATE purchase_receipt_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
        [purchaseReceiptLineId],
      );

      // 9. Synchronize Global Purchase Order Status Pipeline State
      const poFetch = await client.query(
        `SELECT purchase_order_id FROM purchase_receipts WHERE id = $1`,
        [receiptLine.purchase_receipt_id],
      );

      if (poFetch.rows.length) {
        await client.query(
          `
          UPDATE purchase_orders po
          SET status = CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM purchase_order_lines pol
              WHERE pol.purchase_order_id = po.id
                AND COALESCE(pol.received_quantity, 0) < COALESCE(pol.quantity, 0)
                AND COALESCE(pol.is_deleted, false) = false
            ) THEN 'received'::purchase_order_status_enum
            WHEN EXISTS (
              SELECT 1 FROM purchase_order_lines pol
              WHERE pol.purchase_order_id = po.id AND COALESCE(pol.received_quantity, 0) > 0
            ) THEN 'partial_received'::purchase_order_status_enum
            ELSE 'open'::purchase_order_status_enum
          END,
          updated_at = NOW()
          WHERE po.id = $1
          `,
          [poFetch.rows[0].purchase_order_id],
        );
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
 */
