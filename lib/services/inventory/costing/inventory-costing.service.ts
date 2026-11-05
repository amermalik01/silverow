// lib/services/inventory/costing/inventory-costing.service.ts

import type { PoolClient } from "pg";

export type CostingMethod = "FIFO" | "LIFO" | "WEIGHTED_AVERAGE" | "STANDARD";

export type CostDirection = "IN" | "OUT" | "REVALUE";

export interface ItemCostingProfile {
  itemId: string;
  companyId: string;
  method: CostingMethod;
  fixedStandardCost: number | null;
  currentCost: number;
}

export interface InventoryCostBalance {
  companyId: string;
  itemId: string;
  quantityOnHand: number;
  inventoryValue: number;
  averageUnitCost: number;
}

export interface InventoryCostMovementInput {
  companyId: string;
  itemId: string;
  warehouseId?: string | null;
  ledgerEntryId?: string | null;
  postingDate: string;
  transactionType: string;
  direction: CostDirection;
  quantity: number;
  totalCost: number;
  costingMethod: CostingMethod;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceLineId?: string | null;
}

export interface InventoryCostMovementResult {
  quantityBefore: number;
  valueBefore: number;
  quantityAfter: number;
  valueAfter: number;
  unitCost: number;
  totalCost: number;
  averageUnitCost: number;
}

interface ItemCostRow {
  costing_method: string;
  fixed_standard_cost: string | null;
  standard_cost: string | null;
}

interface CostBalanceRow {
  quantity_on_hand: string;
  inventory_value: string;
  average_unit_cost: string;
}

export const COST_EPSILON = 0.000001;

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e6) / 1e6;
}

export function roundUnitCost(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e6) / 1e6;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function assertPositiveQuantity(quantity: number): void {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    Math.abs(quantity - roundQuantity(quantity)) > 1e-9
  ) {
    throw new Error("Quantity must be positive with at most 6 decimal places.");
  }
}

export function assertNonNegativeCost(cost: number): void {
  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    Math.abs(cost - roundUnitCost(cost)) > 1e-9
  ) {
    throw new Error(
      "Unit cost must be nonnegative with at most 6 decimal places.",
    );
  }
}

export class InventoryCostingService {
  static async getItemCostingProfile(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<ItemCostingProfile> {
    const result = await client.query<ItemCostRow>(
      `
      SELECT
        costing_method,
        fixed_standard_cost,
        standard_cost
      FROM items
      WHERE company_id = $1
        AND id = $2
      `,
      [companyId, itemId],
    );

    const item = result.rows[0];

    if (!item) {
      throw new Error(`Item ${itemId} not found for company.`);
    }

    const validMethods: CostingMethod[] = [
      "FIFO",
      "LIFO",
      "WEIGHTED_AVERAGE",
      "STANDARD",
    ];

    if (!validMethods.includes(item.costing_method as CostingMethod)) {
      throw new Error(`Unsupported costing method: ${item.costing_method}`);
    }

    const method = item.costing_method as CostingMethod;

    const fixedStandardCost =
      item.fixed_standard_cost === null
        ? null
        : Number(item.fixed_standard_cost);

    if (method === "STANDARD") {
      if (
        fixedStandardCost === null ||
        !Number.isFinite(fixedStandardCost) ||
        fixedStandardCost < 0
      ) {
        throw new Error(
          `Item ${itemId} requires an approved fixed standard cost.`,
        );
      }
    }

    return {
      itemId,
      companyId,
      method,
      fixedStandardCost,
      currentCost: Number(item.standard_cost ?? 0),
    };
  }

  /**
   * Creates the company-wide balance row when absent, then
   * locks it until the caller's transaction commits.
   *
   * All inventory writers MUST acquire this lock before
   * selecting receipt layers or calculating issue costs.
   */
  static async lockBalance(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<InventoryCostBalance> {
    await client.query(
      `
      INSERT INTO inventory_cost_balances (
        company_id,
        item_id,
        quantity_on_hand,
        inventory_value,
        average_unit_cost
      )
      VALUES ($1, $2, 0, 0, 0)
      ON CONFLICT (company_id, item_id)
      DO NOTHING
      `,
      [companyId, itemId],
    );

    const result = await client.query<CostBalanceRow>(
      `
      SELECT
        quantity_on_hand,
        inventory_value,
        average_unit_cost
      FROM inventory_cost_balances
      WHERE company_id = $1
        AND item_id = $2
      FOR UPDATE
      `,
      [companyId, itemId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Inventory cost balance not found.");
    }

    return {
      companyId,
      itemId,
      quantityOnHand: Number(row.quantity_on_hand),
      inventoryValue: Number(row.inventory_value),
      averageUnitCost: Number(row.average_unit_cost),
    };
  }

  static calculateAverageCost(quantity: number, value: number): number {
    if (quantity <= 0) return 0;

    return roundUnitCost(value / quantity);
  }

  /**
   * Persists a movement against an ALREADY LOCKED balance.
   *
   * Do not call lockBalance a second time between cost
   * calculation and this operation.
   */

  static async applyMovement(
    client: PoolClient,
    balance: InventoryCostBalance,
    input: InventoryCostMovementInput,
  ): Promise<InventoryCostMovementResult> {
    if (
      balance.companyId !== input.companyId ||
      balance.itemId !== input.itemId
    ) {
      throw new Error("Inventory balance identity mismatch.");
    }

    if (!Number.isFinite(input.totalCost)) {
      throw new Error("Invalid inventory movement value.");
    }

    if (input.direction === "IN" || input.direction === "OUT") {
      assertPositiveQuantity(input.quantity);
      assertNonNegativeCost(input.totalCost);
    } else if (input.quantity !== 0) {
      throw new Error("Revaluation quantity must be zero.");
    }

    const quantityBefore = balance.quantityOnHand;
    const valueBefore = balance.inventoryValue;

    const quantityDelta =
      input.direction === "IN"
        ? input.quantity
        : input.direction === "OUT"
          ? -input.quantity
          : 0;

    const valueDelta =
      input.direction === "IN"
        ? input.totalCost
        : input.direction === "OUT"
          ? -input.totalCost
          : input.totalCost;

    const quantityAfter = roundQuantity(quantityBefore + quantityDelta);

    let valueAfter = roundMoney(valueBefore + valueDelta);

    if (quantityAfter < -COST_EPSILON) {
      throw new Error(
        `Insufficient company-wide stock for item ${input.itemId}.`,
      );
    }

    if (valueAfter < -0.01) {
      throw new Error(
        `Inventory value would become negative for item ${input.itemId}.`,
      );
    }

    // Clear residual rounding pennies when stock reaches zero.
    if (quantityAfter === 0) {
      if (input.direction === "OUT") {
        valueAfter = 0;
      } else if (Math.abs(valueAfter) > 0.01) {
        throw new Error(
          "Zero-quantity inventory cannot retain material value.",
        );
      } else {
        valueAfter = 0;
      }
    }

    const averageUnitCost = this.calculateAverageCost(
      quantityAfter,
      valueAfter,
    );

    const totalCost = roundMoney(input.totalCost);

    const unitCost =
      input.direction === "REVALUE"
        ? 0
        : roundUnitCost(totalCost / input.quantity);

    const updated = await client.query(
      `
      UPDATE inventory_cost_balances
      SET
        quantity_on_hand = $3,
        inventory_value = $4,
        average_unit_cost = $5,
        last_movement_date = $6::date,
        updated_at = NOW()
      WHERE company_id = $1
        AND item_id = $2
      `,
      [
        input.companyId,
        input.itemId,
        quantityAfter,
        valueAfter,
        averageUnitCost,
        input.postingDate,
      ],
    );

    if (updated.rowCount !== 1) {
      throw new Error("Failed to update inventory cost balance.");
    }

    await client.query(
      `
      INSERT INTO inventory_cost_movements (
        company_id,
        item_id,
        warehouse_id,
        ledger_entry_id,
        posting_date,
        transaction_type,
        direction,
        quantity,
        unit_cost,
        total_cost,
        quantity_before,
        value_before,
        quantity_after,
        value_after,
        costing_method,
        reference_type,
        reference_id,
        reference_line_id
      )
      VALUES (
        $1, $2, $3, $4, $5::date, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18
      )
      `,
      [
        input.companyId,
        input.itemId,
        input.warehouseId ?? null,
        input.ledgerEntryId ?? null,
        input.postingDate,
        input.transactionType,
        input.direction,
        input.quantity,
        unitCost,
        totalCost,
        quantityBefore,
        valueBefore,
        quantityAfter,
        valueAfter,
        input.costingMethod,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.referenceLineId ?? null,
      ],
    );

    // Keep the in-memory locked balance synchronized.
    balance.quantityOnHand = quantityAfter;
    balance.inventoryValue = valueAfter;
    balance.averageUnitCost = averageUnitCost;

    return {
      quantityBefore,
      valueBefore,
      quantityAfter,
      valueAfter,
      unitCost,
      totalCost,
      averageUnitCost,
    };
  }
}
/* static async applyMovement(
    client: PoolClient,
    balance: InventoryCostBalance,
    input: InventoryCostMovementInput,
  ): Promise<InventoryCostMovementResult> {
    if (
      balance.companyId !== input.companyId ||
      balance.itemId !== input.itemId
    ) {
      throw new Error("Inventory balance identity mismatch.");
    }

    if (!Number.isFinite(input.totalCost)) {
      throw new Error("Invalid inventory movement value.");
    }

    if (input.direction !== "REVALUE") {
      assertPositiveQuantity(input.quantity);
    } else if (input.quantity !== 0) {
      throw new Error("Revaluation quantity must be zero.");
    }

    const quantityBefore = balance.quantityOnHand;
    const valueBefore = balance.inventoryValue;

    const quantityDelta =
      input.direction === "IN"
        ? input.quantity
        : input.direction === "OUT"
          ? -input.quantity
          : 0;

    const valueDelta =
      input.direction === "IN"
        ? input.totalCost
        : input.direction === "OUT"
          ? -input.totalCost
          : input.totalCost;

    const quantityAfter = roundQuantity(quantityBefore + quantityDelta);

    let valueAfter = roundMoney(valueBefore + valueDelta);

    if (quantityAfter < -COST_EPSILON) {
      throw new Error(
        `Insufficient company-wide stock for item ${input.itemId}.`,
      );
    }

    if (valueAfter < -0.01) {
      throw new Error(
        `Inventory value would become negative for item ${input.itemId}.`,
      );
    }

    // Clear residual rounding pennies when stock reaches zero.
    if (quantityAfter === 0) {
      if (input.direction === "OUT") {
        valueAfter = 0;
      } else if (Math.abs(valueAfter) > 0.01) {
        throw new Error(
          "Zero-quantity inventory cannot retain material value.",
        );
      } else {
        valueAfter = 0;
      }
    }

    const averageUnitCost = this.calculateAverageCost(
      quantityAfter,
      valueAfter,
    );

    const totalCost = roundMoney(input.totalCost);

    const unitCost =
      input.direction === "REVALUE"
        ? 0
        : roundUnitCost(totalCost / input.quantity);

    await client.query(
      `
      UPDATE inventory_cost_balances
      SET
        quantity_on_hand = $3,
        inventory_value = $4,
        average_unit_cost = $5,
        last_movement_date = $6::date,
        updated_at = NOW()
      WHERE company_id = $1
        AND item_id = $2
      `,
      [
        input.companyId,
        input.itemId,
        quantityAfter,
        valueAfter,
        averageUnitCost,
        input.postingDate,
      ],
    );

    await client.query(
      `
      INSERT INTO inventory_cost_movements (
        company_id,
        item_id,
        warehouse_id,
        ledger_entry_id,
        posting_date,
        transaction_type,
        direction,
        quantity,
        unit_cost,
        total_cost,
        quantity_before,
        value_before,
        quantity_after,
        value_after,
        costing_method,
        reference_type,
        reference_id,
        reference_line_id
      )
      VALUES (
        $1, $2, $3, $4, $5::date, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18
      )
      `,
      [
        input.companyId,
        input.itemId,
        input.warehouseId ?? null,
        input.ledgerEntryId ?? null,
        input.postingDate,
        input.transactionType,
        input.direction,
        input.quantity,
        unitCost,
        totalCost,
        quantityBefore,
        valueBefore,
        quantityAfter,
        valueAfter,
        input.costingMethod,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.referenceLineId ?? null,
      ],
    );

    // Keep the in-memory locked balance synchronized.
    balance.quantityOnHand = quantityAfter;
    balance.inventoryValue = valueAfter;
    balance.averageUnitCost = averageUnitCost;

    return {
      quantityBefore,
      valueBefore,
      quantityAfter,
      valueAfter,
      unitCost,
      totalCost,
      averageUnitCost,
    };
  } */
