// lib/services/inventory/valuation/inventory-valuation.service.ts

import type { PoolClient } from "pg";

import {
  roundMoney,
  roundUnitCost,
  type CostingMethod,
} from "../costing/inventory-costing.service";

export interface ItemInventoryValuation {
  companyId: string;
  itemId: string;
  costingMethod: CostingMethod;
  quantityOnHand: number;
  inventoryValue: number;
  averageUnitCost: number;
  currentItemCost: number;
  fixedStandardCost: number | null;
}

export interface WarehouseStockQuantity {
  warehouseId: string;
  quantityOnHand: number;
}

interface ValuationRow {
  company_id: string;
  item_id: string;
  costing_method: CostingMethod;
  quantity_on_hand: string;
  inventory_value: string;
  average_unit_cost: string;
  standard_cost: string | null;
  fixed_standard_cost: string | null;
}

export class InventoryValuationService {
  static async getItemValuation(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<ItemInventoryValuation> {
    const result = await client.query<ValuationRow>(
      `
      SELECT
        i.company_id,
        i.id AS item_id,
        i.costing_method,
        b.quantity_on_hand::text,
        b.inventory_value::text,
        b.average_unit_cost::text,
        i.standard_cost::text,
        i.fixed_standard_cost::text
      FROM items i
      JOIN inventory_cost_balances b
        ON b.company_id = i.company_id
       AND b.item_id = i.id
      WHERE i.company_id = $1
        AND i.id = $2
      `,
      [companyId, itemId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error(
        `Inventory valuation is not initialized for item ${itemId}.`,
      );
    }

    return {
      companyId: row.company_id,
      itemId: row.item_id,
      costingMethod: row.costing_method,
      quantityOnHand: Number(row.quantity_on_hand),
      inventoryValue: Number(row.inventory_value),
      averageUnitCost: Number(row.average_unit_cost),
      currentItemCost: Number(row.standard_cost ?? 0),
      fixedStandardCost:
        row.fixed_standard_cost === null
          ? null
          : Number(row.fixed_standard_cost),
    };
  }

  static async getWarehouseQuantities(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<WarehouseStockQuantity[]> {
    const result = await client.query<{
      warehouse_id: string;
      quantity_on_hand: string;
    }>(
      `
      SELECT
        warehouse_id,
        SUM(remaining_quantity)::text AS quantity_on_hand
      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND direction = 'IN'
        AND remaining_quantity > 0
      GROUP BY warehouse_id
      ORDER BY warehouse_id
      `,
      [companyId, itemId],
    );

    return result.rows.map((row) => ({
      warehouseId: row.warehouse_id,
      quantityOnHand: Number(row.quantity_on_hand),
    }));
  }

  static async getCompanyInventoryValue(
    client: PoolClient,
    companyId: string,
  ): Promise<{
    inventoryValue: number;
    totalQuantity: number;
    itemCount: number;
  }> {
    const result = await client.query<{
      inventory_value: string;
      total_quantity: string;
      item_count: string;
    }>(
      `
      SELECT
        COALESCE(SUM(inventory_value), 0)::text
          AS inventory_value,
        COALESCE(SUM(quantity_on_hand), 0)::text
          AS total_quantity,
        COUNT(*)::text AS item_count
      FROM inventory_cost_balances
      WHERE company_id = $1
      `,
      [companyId],
    );

    const row = result.rows[0];

    return {
      inventoryValue: roundMoney(Number(row?.inventory_value ?? 0)),
      totalQuantity: Number(row?.total_quantity ?? 0),
      itemCount: Number(row?.item_count ?? 0),
    };
  }

  static async getNextIssueCost(
    client: PoolClient,
    companyId: string,
    itemId: string,
    warehouseId: string,
  ): Promise<number> {
    const valuation = await this.getItemValuation(client, companyId, itemId);

    if (valuation.costingMethod === "STANDARD") {
      if (valuation.fixedStandardCost === null) {
        throw new Error("Fixed standard cost is missing.");
      }

      return valuation.fixedStandardCost;
    }

    if (valuation.costingMethod === "WEIGHTED_AVERAGE") {
      return valuation.averageUnitCost;
    }

    const order = valuation.costingMethod === "LIFO" ? "DESC" : "ASC";

    const result = await client.query<{
      unit_cost: string;
    }>(
      `
      SELECT unit_cost::text
      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND direction = 'IN'
        AND remaining_quantity > 0
      ORDER BY posting_date ${order},
               created_at ${order},
               id ${order}
      LIMIT 1
      `,
      [companyId, itemId, warehouseId],
    );

    return roundUnitCost(Number(result.rows[0]?.unit_cost ?? 0));
  }
}
