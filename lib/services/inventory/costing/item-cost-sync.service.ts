// lib/services/inventory/costing/item-cost-sync.service.ts

import type { PoolClient } from "pg";

import {
  InventoryCostingService,
  roundUnitCost,
  type CostingMethod,
  type InventoryCostBalance,
} from "./inventory-costing.service";

interface LayerValueRow {
  total_quantity: string;
  total_value: string;
}

interface ItemCostSyncResult {
  itemId: string;
  companyId: string;
  costingMethod: CostingMethod;
  currentCost: number;
  quantityOnHand: number;
  inventoryValue: number;
}

export class ItemCostSyncService {
  /**
   * Synchronizes items.standard_cost using the
   * company-wide inventory valuation balance.
   *
   * Caller must already hold the company-item
   * inventory_cost_balances FOR UPDATE lock.
   */
  static async syncItemCost(
    client: PoolClient,
    companyId: string,
    itemId: string,
    balance?: InventoryCostBalance,
  ): Promise<ItemCostSyncResult> {
    const profile = await InventoryCostingService.getItemCostingProfile(
      client,
      companyId,
      itemId,
    );

    const currentBalance =
      balance ??
      (await InventoryCostingService.lockBalance(client, companyId, itemId));

    let currentCost: number;

    if (profile.method === "STANDARD") {
      if (profile.fixedStandardCost === null) {
        throw new Error("Approved fixed standard cost is missing.");
      }

      currentCost = profile.fixedStandardCost;
    } else {
      // Current company-wide weighted inventory value per
      // remaining unit, including for FIFO and LIFO items.
      //
      // For FIFO/LIFO this is a display valuation average,
      // NOT necessarily the cost of the next outbound unit.
      currentCost =
        currentBalance.quantityOnHand > 0
          ? roundUnitCost(
              currentBalance.inventoryValue / currentBalance.quantityOnHand,
            )
          : 0;
    }

    await client.query(
      `
      UPDATE items
      SET
        standard_cost = $3,
        last_cost_calculated_at = NOW(),
        cost_version = cost_version + 1
      WHERE company_id = $1
        AND id = $2
      `,
      [companyId, itemId, currentCost],
    );

    return {
      itemId,
      companyId,
      costingMethod: profile.method,
      currentCost,
      quantityOnHand: currentBalance.quantityOnHand,
      inventoryValue: currentBalance.inventoryValue,
    };
  }

  /**
   * Diagnostic: compares the financial balance with
   * the remaining physical receipt-layer valuation.
   *
   * For FIFO/LIFO this should normally reconcile.
   *
   * For moving average and standard costing, physical
   * receipt-layer costs may differ from financial values.
   */
  static async getPhysicalLayerValuation(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<{
    quantity: number;
    value: number;
    averageCost: number;
  }> {
    const result = await client.query<LayerValueRow>(
      `
      SELECT
        COALESCE(
          SUM(remaining_quantity),
          0
        )::text AS total_quantity,

        COALESCE(
          SUM(
            COALESCE(
              remaining_value,
              remaining_quantity * unit_cost
            )
          ),
          0
        )::text AS total_value

      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND direction = 'IN'
        AND remaining_quantity > 0
      `,
      [companyId, itemId],
    );

    const row = result.rows[0];

    const quantity = Number(row?.total_quantity ?? 0);

    const value = Number(row?.total_value ?? 0);

    return {
      quantity,
      value,
      averageCost: quantity > 0 ? roundUnitCost(value / quantity) : 0,
    };
  }
}
