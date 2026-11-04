// lib/services/inventory/valuation/inventory-revaluation.service.ts

import type { PoolClient } from "pg";

import {
  InventoryCostingService,
  roundMoney,
  roundUnitCost,
} from "../costing/inventory-costing.service";

import { StandardCostingService } from "../costing/standard-costing.service";

import { ItemCostSyncService } from "../costing/item-cost-sync.service";

export interface StandardCostRevaluationInput {
  companyId: string;
  itemId: string;
  newStandardCost: number;
  effectiveDate: string;
  reason: string;
  createdBy?: string | null;
  journalEntryId?: string | null;
}

export interface StandardCostRevaluationResult {
  itemId: string;
  previousStandardCost: number;
  newStandardCost: number;
  quantityOnHand: number;
  previousInventoryValue: number;
  newInventoryValue: number;
  adjustmentAmount: number;
}

export class InventoryRevaluationService {
  /**
   * Must be called within a transaction.
   * The caller is responsible for GL posting and COMMIT.
   */
  static async revalueStandardCost(
    client: PoolClient,
    input: StandardCostRevaluationInput,
  ): Promise<StandardCostRevaluationResult> {
    if (!input.reason.trim()) {
      throw new Error("Revaluation reason is required.");
    }

    if (!Number.isFinite(input.newStandardCost) || input.newStandardCost < 0) {
      throw new Error("Invalid new standard cost.");
    }

    const balance = await InventoryCostingService.lockBalance(
      client,
      input.companyId,
      input.itemId,
    );

    const profile = await InventoryCostingService.getItemCostingProfile(
      client,
      input.companyId,
      input.itemId,
    );

    if (profile.method !== "STANDARD") {
      throw new Error("Standard-cost revaluation requires STANDARD costing.");
    }

    if (profile.fixedStandardCost === null) {
      throw new Error("Previous approved standard cost is missing.");
    }

    const newCost = roundUnitCost(input.newStandardCost);

    const valuation = StandardCostingService.calculateRevaluation(
      balance.quantityOnHand,
      balance.inventoryValue,
      newCost,
    );

    await client.query(
      `
      UPDATE items
      SET fixed_standard_cost = $3
      WHERE company_id = $1
        AND id = $2
      `,
      [input.companyId, input.itemId, newCost],
    );

    await InventoryCostingService.applyMovement(client, balance, {
      companyId: input.companyId,
      itemId: input.itemId,
      postingDate: input.effectiveDate,
      transactionType: "STANDARD_COST_REVALUATION",
      direction: "REVALUE",
      quantity: 0,
      totalCost: valuation.adjustmentAmount,
      costingMethod: "STANDARD",
      referenceType: "STANDARD_COST_REVALUATION",
    });

    await client.query(
      `
      INSERT INTO item_standard_cost_history (
        company_id,
        item_id,
        previous_cost,
        new_cost,
        effective_date,
        quantity_on_hand,
        previous_inventory_value,
        new_inventory_value,
        adjustment_amount,
        reason,
        journal_entry_id,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      `,
      [
        input.companyId,
        input.itemId,
        profile.fixedStandardCost,
        newCost,
        input.effectiveDate,
        balance.quantityOnHand,
        valuation.previousValue,
        valuation.newValue,
        valuation.adjustmentAmount,
        input.reason,
        input.journalEntryId ?? null,
        input.createdBy ?? null,
      ],
    );

    await ItemCostSyncService.syncItemCost(
      client,
      input.companyId,
      input.itemId,
      balance,
    );

    return {
      itemId: input.itemId,
      previousStandardCost: profile.fixedStandardCost,
      newStandardCost: newCost,
      quantityOnHand: balance.quantityOnHand,
      previousInventoryValue: valuation.previousValue,
      newInventoryValue: valuation.newValue,
      adjustmentAmount: roundMoney(valuation.adjustmentAmount),
    };
  }
}
