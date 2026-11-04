// lib/services/inventory/costing/fifo-costing.service.ts

import {
  assertPositiveQuantity,
  roundMoney,
  roundQuantity,
  roundUnitCost,
} from "./inventory-costing.service";

export interface CostingStockLayer {
  id: string;
  postingDate: string;
  createdAt: string;
  remainingQuantity: number;
  remainingValue: number;
  unitCost: number;
}

export interface CostingLayerAllocation {
  inboundEntryId: string;
  quantity: number;
  physicalUnitCost: number;
  physicalValue: number;
}

export interface LayerCostingResult {
  allocations: CostingLayerAllocation[];
  totalQuantity: number;
  totalCost: number;
  unitCost: number;
}

export class FifoCostingService {
  static calculateOutbound(
    layers: CostingStockLayer[],
    quantity: number,
  ): LayerCostingResult {
    assertPositiveQuantity(quantity);

    const sortedLayers = [...layers].sort((a, b) => {
      const dateCompare = a.postingDate.localeCompare(b.postingDate);

      if (dateCompare !== 0) return dateCompare;

      const createdCompare = a.createdAt.localeCompare(b.createdAt);

      if (createdCompare !== 0) return createdCompare;

      return a.id.localeCompare(b.id);
    });

    const allocations: CostingLayerAllocation[] = [];

    let remaining = quantity;
    let totalCost = 0;

    for (const layer of sortedLayers) {
      if (remaining <= 0) break;

      const available = roundQuantity(layer.remainingQuantity);

      if (available <= 0) continue;

      const allocatedQuantity = roundQuantity(Math.min(available, remaining));

      const physicalValue =
        allocatedQuantity === available
          ? roundMoney(layer.remainingValue)
          : roundMoney(allocatedQuantity * layer.unitCost);

      allocations.push({
        inboundEntryId: layer.id,
        quantity: allocatedQuantity,
        physicalUnitCost: roundUnitCost(layer.unitCost),
        physicalValue,
      });

      remaining = roundQuantity(remaining - allocatedQuantity);

      totalCost = roundMoney(totalCost + physicalValue);
    }

    if (remaining > 0) {
      throw new Error(
        `Insufficient FIFO stock. Missing quantity: ${remaining}`,
      );
    }

    return {
      allocations,
      totalQuantity: quantity,
      totalCost,
      unitCost: roundUnitCost(totalCost / quantity),
    };
  }

  static calculateInbound(
    quantity: number,
    purchaseUnitCost: number,
  ): {
    quantity: number;
    unitCost: number;
    totalCost: number;
  } {
    assertPositiveQuantity(quantity);

    if (!Number.isFinite(purchaseUnitCost) || purchaseUnitCost < 0) {
      throw new Error("Invalid FIFO purchase cost.");
    }

    const unitCost = roundUnitCost(purchaseUnitCost);

    return {
      quantity,
      unitCost,
      totalCost: roundMoney(quantity * unitCost),
    };
  }
}
