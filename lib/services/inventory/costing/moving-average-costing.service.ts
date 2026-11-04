// lib/services/inventory/costing/moving-average-costing.service.ts

import {
  assertPositiveQuantity,
  roundMoney,
  roundUnitCost,
  roundQuantity,
  type InventoryCostBalance,
} from "./inventory-costing.service";

export interface MovingAverageInboundResult {
  quantity: number;
  purchaseUnitCost: number;
  receiptValue: number;
  quantityAfter: number;
  valueAfter: number;
  averageCostAfter: number;
}

export interface MovingAverageOutboundResult {
  quantity: number;
  unitCost: number;
  totalCost: number;
  quantityAfter: number;
  valueAfter: number;
  averageCostAfter: number;
}

export class MovingAverageCostingService {
  static calculateInbound(
    balance: InventoryCostBalance,
    quantity: number,
    purchaseUnitCost: number,
  ): MovingAverageInboundResult {
    assertPositiveQuantity(quantity);

    if (!Number.isFinite(purchaseUnitCost) || purchaseUnitCost < 0) {
      throw new Error("Invalid purchase unit cost.");
    }

    const receiptUnitCost = roundUnitCost(purchaseUnitCost);

    const receiptValue = roundMoney(quantity * receiptUnitCost);

    const quantityAfter = roundQuantity(balance.quantityOnHand + quantity);

    const valueAfter = roundMoney(balance.inventoryValue + receiptValue);

    const averageCostAfter = roundUnitCost(valueAfter / quantityAfter);

    return {
      quantity,
      purchaseUnitCost: receiptUnitCost,
      receiptValue,
      quantityAfter,
      valueAfter,
      averageCostAfter,
    };
  }

  static calculateOutbound(
    balance: InventoryCostBalance,
    quantity: number,
  ): MovingAverageOutboundResult {
    assertPositiveQuantity(quantity);

    if (quantity > balance.quantityOnHand) {
      throw new Error(
        "Insufficient company-wide stock for moving average issue.",
      );
    }

    const quantityAfter = roundQuantity(balance.quantityOnHand - quantity);

    // When the entire balance is issued, consume its exact
    // remaining monetary value to eliminate rounding residue.
    const totalCost =
      quantityAfter === 0
        ? roundMoney(balance.inventoryValue)
        : roundMoney(quantity * balance.averageUnitCost);

    const valueAfter =
      quantityAfter === 0 ? 0 : roundMoney(balance.inventoryValue - totalCost);

    const averageCostAfter =
      quantityAfter === 0 ? 0 : roundUnitCost(valueAfter / quantityAfter);

    return {
      quantity,
      unitCost: roundUnitCost(totalCost / quantity),
      totalCost,
      quantityAfter,
      valueAfter,
      averageCostAfter,
    };
  }
}
