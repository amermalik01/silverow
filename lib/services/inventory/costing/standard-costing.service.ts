// lib/services/inventory/costing/standard-costing.service.ts

import {
  assertPositiveQuantity,
  roundMoney,
  roundUnitCost,
} from "./inventory-costing.service";

export interface StandardCostInboundResult {
  quantity: number;
  standardUnitCost: number;
  purchaseUnitCost: number;
  inventoryValue: number;
  purchaseValue: number;
  ppvAmount: number;
}

export interface StandardCostOutboundResult {
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export class StandardCostingService {
  static calculateInbound(
    quantity: number,
    purchaseUnitCost: number,
    fixedStandardCost: number,
  ): StandardCostInboundResult {
    assertPositiveQuantity(quantity);

    this.validateCost(purchaseUnitCost);
    this.validateCost(fixedStandardCost);

    const standardUnitCost = roundUnitCost(fixedStandardCost);

    const actualUnitCost = roundUnitCost(purchaseUnitCost);

    const inventoryValue = roundMoney(quantity * standardUnitCost);

    const purchaseValue = roundMoney(quantity * actualUnitCost);

    // Positive PPV = purchase cost exceeds standard cost.
    const ppvAmount = roundMoney(purchaseValue - inventoryValue);

    return {
      quantity,
      standardUnitCost,
      purchaseUnitCost: actualUnitCost,
      inventoryValue,
      purchaseValue,
      ppvAmount,
    };
  }

  static calculateOutbound(
    quantity: number,
    fixedStandardCost: number,
  ): StandardCostOutboundResult {
    assertPositiveQuantity(quantity);
    this.validateCost(fixedStandardCost);

    const unitCost = roundUnitCost(fixedStandardCost);

    return {
      quantity,
      unitCost,
      totalCost: roundMoney(quantity * unitCost),
    };
  }

  static calculateRevaluation(
    quantityOnHand: number,
    previousInventoryValue: number,
    newStandardCost: number,
  ): {
    previousValue: number;
    newValue: number;
    adjustmentAmount: number;
  } {
    if (!Number.isFinite(quantityOnHand) || quantityOnHand < 0) {
      throw new Error("Invalid inventory quantity.");
    }

    this.validateCost(newStandardCost);

    const newValue = roundMoney(quantityOnHand * newStandardCost);

    const previousValue = roundMoney(previousInventoryValue);

    return {
      previousValue,
      newValue,
      adjustmentAmount: roundMoney(newValue - previousValue),
    };
  }

  private static validateCost(cost: number): void {
    if (!Number.isFinite(cost) || cost < 0) {
      throw new Error("Standard costing requires a nonnegative cost.");
    }
  }
}
