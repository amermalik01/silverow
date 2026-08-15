// lib/services/gl/account-resolution.service.ts

import { PoolClient } from "pg";

export type AccountContext =
  | "PURCHASE_RECEIPT"
  | "PURCHASE_INVOICE"
  | "SALES_INVOICE"
  | "INVENTORY_ADJUSTMENT";

export interface ResolvedPurchaseAccounts {
  inventory_account_id: string;
  cogs_account_id: string;
  purchase_account_id: string;
  grni_account_id: string;
  payable_account_id: string;
  vat_account_id: string;
  purchase_price_variance_account_id: string; // <-- Add to interface
}

export class AccountResolutionService {
  /**
   * =========================================================
   * RESOLVE PURCHASE ACCOUNTS
   * =========================================================
   */
  static async resolvePurchaseAccounts(
    client: PoolClient,
    companyId: string,
    itemId?: string | null,
  ): Promise<ResolvedPurchaseAccounts> {
    // let item = null;

    let item: {
      id: string;
      inventory_posting_group_id?: string | null;
      inventory_gl_id?: string | null;
      cogs_gl_id?: string | null;
      sales_gl_id?: string | null;
      purchase_gl_id?: string | null;
    } | null = null;

    // 1. Fetch Item if itemId is provided
    if (itemId) {
      const itemResult = await client.query(
        `
        SELECT
          id,
          inventory_posting_group_id,
          inventory_gl_id,
          cogs_gl_id,
          sales_gl_id,
          purchase_gl_id
        FROM items
        WHERE id = $1 AND company_id = $2
        `,
        [itemId, companyId],
      );

      if (itemResult.rows.length) {
        item = itemResult.rows[0];
      }
    }

    // 2. Fetch primary purchase posting group for AP, Purchase, and GRNI accounts
    const ppgResult = await client.query(
      `
      SELECT 
        payable_account_id,
        purchase_account_id,
        grni_account_id,
        inventory_account_id,
        vat_account_id
      FROM purchase_posting_groups
      WHERE company_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [companyId],
    );

    if (!ppgResult.rows.length) {
      throw new Error(
        "Purchase posting group not configured for this company.",
      );
    }

    const ppg = ppgResult.rows[0];

    // 3. Fetch Inventory & COGS accounts
    // Priority: Specific assigned group -> Default fallback group (LIMIT 1)
    let ipg = null;

    if (item?.inventory_posting_group_id) {
      const specificIpgResult = await client.query(
        `
        SELECT inventory_account_id, cogs_account_id, adjustment_account_id
        FROM inventory_posting_groups
        WHERE id = $1 AND company_id = $2
        `,
        [item.inventory_posting_group_id, companyId],
      );
      ipg = specificIpgResult.rows[0];
    }

    // Fallback if item has no posting group or assigned group was deleted
    if (!ipg) {
      const defaultIpgResult = await client.query(
        `
        SELECT inventory_account_id, cogs_account_id, adjustment_account_id
        FROM inventory_posting_groups
        WHERE company_id = $1
        ORDER BY id ASC
        LIMIT 1
        `,
        [companyId],
      );
      ipg = defaultIpgResult.rows[0] || {};
    }

    // Resolution priority order: Direct Override -> Assigned Group -> PPG Fallback
    const inventoryAccountId =
      item?.inventory_gl_id ||
      ipg.inventory_account_id ||
      ppg.inventory_account_id;

    const cogsAccountId = item?.cogs_gl_id || ipg.cogs_account_id;
    const purchaseAccountId = item?.purchase_gl_id || ppg.purchase_account_id;

    const ppvAccountId = purchaseAccountId;

    if (!inventoryAccountId) {
      throw new Error(
        "Inventory account could not be resolved. Check inventory posting group setup.",
      );
    }

    if (!ppg.grni_account_id) {
      throw new Error("GRNI account is missing in purchase posting groups.");
    }

    return {
      inventory_account_id: inventoryAccountId,
      cogs_account_id: cogsAccountId,
      purchase_account_id: purchaseAccountId,
      grni_account_id: ppg.grni_account_id,
      payable_account_id: ppg.payable_account_id,
      vat_account_id: ppg.vat_account_id || null,
      purchase_price_variance_account_id: ppvAccountId,
    };
  }

  /**
   * =========================================================
   * RESOLVE SALES ACCOUNTS
   * =========================================================
   */
  static async resolveSalesAccounts(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ) {
    const itemResult = await client.query(
      `
      SELECT 
        id,
        inventory_posting_group_id,
        inventory_gl_id,
        cogs_gl_id,
        sales_gl_id
      FROM items
      WHERE id = $1 AND company_id = $2
      `,
      [itemId, companyId],
    );

    if (!itemResult.rows.length) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const item = itemResult.rows[0];

    // Fetch Inventory Posting Group (Assigned OR Fallback)
    let ipg = null;

    if (item?.inventory_posting_group_id) {
      const specificIpgResult = await client.query(
        `
        SELECT inventory_account_id, cogs_account_id
        FROM inventory_posting_groups
        WHERE id = $1 AND company_id = $2
        `,
        [item.inventory_posting_group_id, companyId],
      );
      ipg = specificIpgResult.rows[0];
    }

    if (!ipg) {
      const defaultIpgResult = await client.query(
        `
        SELECT inventory_account_id, cogs_account_id
        FROM inventory_posting_groups
        WHERE company_id = $1
        ORDER BY id ASC
        LIMIT 1
        `,
        [companyId],
      );
      ipg = defaultIpgResult.rows[0] || {};
    }

    const salesResult = await client.query(
      `
      SELECT sales_account_id, receivable_account_id, vat_account_id
      FROM sales_posting_groups
      WHERE company_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [companyId],
    );

    if (!salesResult.rows.length) {
      throw new Error("Sales posting group not configured for this company.");
    }

    const spg = salesResult.rows[0];

    return {
      inventory_account_id: item?.inventory_gl_id || ipg.inventory_account_id,
      cogs_account_id: item?.cogs_gl_id || ipg.cogs_account_id,
      sales_account_id: item?.sales_gl_id || spg.sales_account_id,
      receivable_account_id: spg.receivable_account_id,
      vat_account_id: spg.vat_account_id || null,
    };
  }

  /**
   * =========================================================
   * RESOLVE VAT ACCOUNTS
   * =========================================================
   */
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
      throw new Error("VAT posting setup record not found");
    }

    return result.rows[0];
  }
}
