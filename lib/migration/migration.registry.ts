// lib/migration/migration.registry.ts

import { MigrationModule, MigrationHandler } from "./migration.types";
import { purchaseOrderLineHandler } from "./handlers/purchase-order-line.handler";

export const migrationRegistry: Record<MigrationModule, MigrationHandler> = {
  PURCHASE_ORDER_LINES: purchaseOrderLineHandler,
};
