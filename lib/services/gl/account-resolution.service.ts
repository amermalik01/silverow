// lib/services/gl/account-resolution.service.ts

import { PoolClient } from "pg";

export type AccountContext =
  | "PURCHASE_RECEIPT"
  | "PURCHASE_INVOICE"
  | "SALES_INVOICE"
  | "INVENTORY_ADJUSTMENT";

export class AccountResolutionService {
  //  * =========================================================
  //  * RESOLVE PURCHASE ACCOUNTS
  //  * =========================================================

  static async resolvePurchaseAccounts(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ) {
    const itemResult = await client.query(
      `
        SELECT
        inventory_posting_group_id,
        vat_product_posting_group_id
        FROM items
        WHERE id = $1
        AND company_id = $2
        `,
      [itemId, companyId],
    );

    if (!itemResult.rows.length) {
      throw new Error("Item not found");
    }

    const item = itemResult.rows[0];

    const inventoryGroupResult = await client.query(
      `
        SELECT
        inventory_account_id,
        cogs_account_id,
        purchase_account_id,
        grni_account_id
        FROM inventory_posting_groups
        WHERE id = $1
        `,
      [item.inventory_posting_group_id],
    );

    if (!inventoryGroupResult.rows.length) {
      throw new Error("Inventory posting group not configured");
    }

    const inventoryGroup = inventoryGroupResult.rows[0];

    const apResult = await client.query(
      `
        SELECT payable_account_id
        FROM purchase_posting_groups
        WHERE company_id = $1
        LIMIT 1
        `,
      [companyId],
    );

    if (!apResult.rows.length) {
      throw new Error("Purchase posting group not configured");
    }

    const ap = apResult.rows[0];

    let vatAccountId: string | null = null;

    if (item.vat_product_posting_group_id) {
      const vatResult = await client.query(
        `
      SELECT purchase_vat_account_id
      FROM vat_posting_setup
      WHERE company_id = $1
      AND vat_product_group_id = $2
      LIMIT 1
      `,
        [companyId, item.vat_product_posting_group_id],
      );

      if (vatResult.rows.length) {
        vatAccountId = vatResult.rows[0].purchase_vat_account_id;
      }
    }

    return {
      inventory_account_id: inventoryGroup.inventory_account_id,
      cogs_account_id: inventoryGroup.cogs_account_id,
      purchase_account_id: inventoryGroup.purchase_account_id,
      grni_account_id: inventoryGroup.grni_account_id,
      payable_account_id: ap.payable_account_id,
      vat_account_id: vatAccountId,
    };
  }

  //  * =========================================================
  //  * RESOLVE VAT ACCOUNTS (PHASE READY)
  //  * =========================================================

  static async resolveVatAccounts(
    client: PoolClient,
    companyId: string,
    vatBusinessGroupId: string,
    vatProductGroupId: string,
  ) {
    const result = await client.query(
      `
      SELECT
        sales_vat_account_id,
        purchase_vat_account_id,
        vat_rate
      FROM vat_posting_setup
      WHERE company_id = $1
      AND vat_business_group_id = $2
      AND vat_product_group_id = $3
      `,
      [companyId, vatBusinessGroupId, vatProductGroupId],
    );

    if (!result.rows.length) {
      throw new Error("VAT posting setup not found");
    }

    return result.rows[0];
  }

  //  * =========================================================
  //  * RESOLVE Sales ACCOUNTS
  //  * =========================================================

  static async resolveSalesAccounts(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ) {
    const itemResult = await client.query(
      `
        SELECT inventory_posting_group_id
        FROM items
        WHERE id = $1
    `,
      [itemId],
    );

    if (!itemResult.rows.length) {
      throw new Error("Item not found");
    }

    const postingGroupId = itemResult.rows[0].inventory_posting_group_id;

    const inventoryResult = await client.query(
      `
        SELECT inventory_account_id, cogs_account_id
        FROM inventory_posting_groups
        WHERE id = $1
    `,
      [postingGroupId],
    );

    if (!inventoryResult.rows.length) {
      throw new Error("Inventory posting group not found");
    }

    const salesResult = await client.query(
      `
        SELECT sales_account_id, receivable_account_id, vat_account_id
        FROM sales_posting_groups
        WHERE company_id = $1
        LIMIT 1
    `,
      [companyId],
    );

    if (!salesResult.rows.length) {
      throw new Error("Sales posting group not configured");
    }

    return {
      inventory_account_id: inventoryResult.rows[0].inventory_account_id,
      cogs_account_id: inventoryResult.rows[0].cogs_account_id,
      sales_account_id: salesResult.rows[0].sales_account_id,
      receivable_account_id: salesResult.rows[0].receivable_account_id,
      vat_account_id: salesResult.rows[0].vat_account_id,
    };
  }
}
