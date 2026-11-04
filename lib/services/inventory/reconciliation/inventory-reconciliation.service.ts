// lib/services/inventory/reconciliation/inventory-reconciliation.service.ts

import type { PoolClient } from "pg";

import {
  roundMoney,
  roundQuantity,
  roundUnitCost,
  type CostingMethod,
} from "../costing/inventory-costing.service";

export interface InventoryReconciliationRow {
  companyId: string;
  itemId: string;
  costingMethod: CostingMethod;
  physicalQuantity: number;
  financialQuantity: number;
  quantityDifference: number;
  financialValue: number;
  layerValue: number;
  valueDifference: number;
  financialAverageCost: number;
  itemCardCost: number;
  expectedItemCardCost: number;
  quantityMatched: boolean;
  valueMatched: boolean | null;
  itemCostMatched: boolean;
  issues: string[];
}

interface ReconciliationDbRow {
  company_id: string;
  item_id: string;
  costing_method: CostingMethod;
  physical_quantity: string;
  layer_value: string;
  financial_quantity: string | null;
  financial_value: string | null;
  financial_average_cost: string | null;
  standard_cost: string | null;
  fixed_standard_cost: string | null;
}

export class InventoryReconciliationService {
  static async reconcileItem(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<InventoryReconciliationRow> {
    const rows = await this.reconcileCompany(client, companyId, itemId);

    const row = rows[0];

    if (!row) {
      throw new Error(`Item ${itemId} not found.`);
    }

    return row;
  }

  static async reconcileCompany(
    client: PoolClient,
    companyId: string,
    itemId?: string,
  ): Promise<InventoryReconciliationRow[]> {
    const result = await client.query<ReconciliationDbRow>(
      `
      WITH physical AS (
        SELECT
          company_id,
          item_id,
          SUM(remaining_quantity) AS physical_quantity,
          SUM(
            COALESCE(
              remaining_value,
              ROUND(remaining_quantity * unit_cost, 2)
            )
          ) AS layer_value
        FROM inventory_ledger_entries
        WHERE company_id = $1
          AND direction = 'IN'
          AND remaining_quantity > 0
        GROUP BY company_id, item_id
      )
      SELECT
        i.company_id,
        i.id AS item_id,
        i.costing_method,
        COALESCE(p.physical_quantity, 0)::text
          AS physical_quantity,
        COALESCE(p.layer_value, 0)::text
          AS layer_value,
        b.quantity_on_hand::text
          AS financial_quantity,
        b.inventory_value::text
          AS financial_value,
        b.average_unit_cost::text
          AS financial_average_cost,
        i.standard_cost::text,
        i.fixed_standard_cost::text
      FROM items i
      LEFT JOIN physical p
        ON p.company_id = i.company_id
       AND p.item_id = i.id
      LEFT JOIN inventory_cost_balances b
        ON b.company_id = i.company_id
       AND b.item_id = i.id
      WHERE i.company_id = $1
        AND ($2::uuid IS NULL OR i.id = $2::uuid)
      ORDER BY i.id
      `,
      [companyId, itemId ?? null],
    );

    return result.rows.map((row) => {
      const physicalQuantity = Number(row.physical_quantity);

      const financialQuantity = Number(row.financial_quantity ?? 0);

      const financialValue = Number(row.financial_value ?? 0);

      const layerValue = Number(row.layer_value);

      const financialAverageCost = Number(row.financial_average_cost ?? 0);

      const itemCardCost = Number(row.standard_cost ?? 0);

      const fixedStandardCost = Number(row.fixed_standard_cost ?? 0);

      const quantityDifference = roundQuantity(
        physicalQuantity - financialQuantity,
      );

      const valueDifference = roundMoney(layerValue - financialValue);

      const quantityMatched = Math.abs(quantityDifference) < 0.000001;

      const expectedItemCardCost =
        row.costing_method === "STANDARD"
          ? fixedStandardCost
          : financialQuantity > 0
            ? roundUnitCost(financialValue / financialQuantity)
            : 0;

      const itemCostMatched =
        Math.abs(itemCardCost - expectedItemCardCost) < 0.000002;

      // FIFO/LIFO layer residual values should reconcile
      // with the financial balance.
      //
      // For moving average and standard costing,
      // physical receipt-layer costs may differ.
      const valueMatched =
        row.costing_method === "FIFO" || row.costing_method === "LIFO"
          ? Math.abs(valueDifference) <= 0.01
          : null;

      const issues: string[] = [];

      if (row.financial_quantity === null) {
        issues.push("COST_BALANCE_NOT_INITIALIZED");
      }

      if (!quantityMatched) {
        issues.push("PHYSICAL_FINANCIAL_QUANTITY_MISMATCH");
      }

      if (valueMatched === false) {
        issues.push("LAYER_FINANCIAL_VALUE_MISMATCH");
      }

      if (!itemCostMatched) {
        issues.push("ITEM_CARD_COST_MISMATCH");
      }

      if (
        row.costing_method === "STANDARD" &&
        row.fixed_standard_cost === null
      ) {
        issues.push("FIXED_STANDARD_COST_MISSING");
      }

      return {
        companyId: row.company_id,
        itemId: row.item_id,
        costingMethod: row.costing_method,
        physicalQuantity,
        financialQuantity,
        quantityDifference,
        financialValue,
        layerValue,
        valueDifference,
        financialAverageCost,
        itemCardCost,
        expectedItemCardCost,
        quantityMatched,
        valueMatched,
        itemCostMatched,
        issues,
      };
    });
  }

  static async getMovementAuditDifferences(
    client: PoolClient,
    companyId: string,
  ): Promise<
    Array<{
      itemId: string;
      balanceQuantity: number;
      auditedQuantity: number;
      balanceValue: number;
      auditedValue: number;
    }>
  > {
    const result = await client.query<{
      item_id: string;
      balance_quantity: string;
      audited_quantity: string;
      balance_value: string;
      audited_value: string;
    }>(
      `
      WITH latest AS (
        SELECT DISTINCT ON (item_id)
          item_id,
          quantity_after,
          value_after
        FROM inventory_cost_movements
        WHERE company_id = $1
        ORDER BY item_id, created_at DESC, id DESC
      )
      SELECT
        b.item_id,
        b.quantity_on_hand::text AS balance_quantity,
        l.quantity_after::text AS audited_quantity,
        b.inventory_value::text AS balance_value,
        l.value_after::text AS audited_value
      FROM inventory_cost_balances b
      JOIN latest l ON l.item_id = b.item_id
      WHERE b.company_id = $1
        AND (
          ABS(b.quantity_on_hand - l.quantity_after) > 0.000001
          OR ABS(b.inventory_value - l.value_after) > 0.01
        )
      `,
      [companyId],
    );

    return result.rows.map((row) => ({
      itemId: row.item_id,
      balanceQuantity: Number(row.balance_quantity),
      auditedQuantity: Number(row.audited_quantity),
      balanceValue: Number(row.balance_value),
      auditedValue: Number(row.audited_value),
    }));
  }
}
