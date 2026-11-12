// lib/services/inventory/price-list-history.service.ts


import type { PoolClient } from "pg";

export type PriceListSnapshot = {
  price_list: Record<string, unknown>;
  price_list_item: Record<string, unknown>;
  volume_discounts: Record<string, unknown>[];
};

export type PriceListHistoryAction = "CREATE" | "UPDATE" | "DELETE";

interface SnapshotInput {
  companyId: string;
  itemId: string;
  priceListId: string | null;
  priceListItemId: string | null;
}

interface HistoryInput {
  companyId: string;
  itemId: string;
  priceListId: string | null;
  priceListItemId: string | null;
  action: PriceListHistoryAction;
  oldSnapshot: PriceListSnapshot | null;
  newSnapshot: PriceListSnapshot | null;
  changedBy: string | null;
}

export class PriceListHistoryService {
  static async getSnapshot(
    client: PoolClient,
    input: SnapshotInput,
  ): Promise<PriceListSnapshot | null> {
    const headerResult = await client.query(
      `
        SELECT
          id,
          name,
          list_type,
          party_id,
          salesperson_id,
          offer_method,
          start_date,
          end_date,
          currency_id,
          status
        FROM price_lists
        WHERE id = $1
          AND company_id = $2
      `,
      [input.priceListId, input.companyId],
    );

    if (!headerResult.rows[0]) {
      return null;
    }

    const itemResult = await client.query(
      `
        SELECT
          id,
          item_id,
          uom_id,
          standard_price,
          offered_price,
          min_order_qty,
          max_order_qty,
          has_volume_discount
        FROM price_list_items
        WHERE id = $1
          AND price_list_id = $2
          AND item_id = $3
      `,
      [input.priceListItemId, input.priceListId, input.itemId],
    );

    if (!itemResult.rows[0]) {
      return null;
    }

    // Do not include tier IDs. The current save logic recreates tier rows.
    const discountResult = await client.query(
      `
        SELECT
          min_order_qty,
          discount_type,
          discount_value,
          discounted_price
        FROM price_list_volume_discounts
        WHERE price_list_item_id = $1
        ORDER BY
          min_order_qty ASC,
          discount_type ASC,
          discount_value ASC,
          discounted_price ASC
      `,
      [input.priceListItemId],
    );

    return {
      price_list: headerResult.rows[0],
      price_list_item: itemResult.rows[0],
      volume_discounts: discountResult.rows,
    };
  }

  static getChangedFields(
    oldSnapshot: PriceListSnapshot | null,
    newSnapshot: PriceListSnapshot | null,
  ): string[] {
    if (!oldSnapshot && newSnapshot) {
      return [
        "price_list",
        "price_list_item",
        ...(newSnapshot.volume_discounts.length > 0
          ? ["volume_discounts"]
          : []),
      ];
    }

    if (oldSnapshot && !newSnapshot) {
      return [
        "price_list",
        "price_list_item",
        ...(oldSnapshot.volume_discounts.length > 0
          ? ["volume_discounts"]
          : []),
      ];
    }

    if (!oldSnapshot || !newSnapshot) {
      return [];
    }

    const changedFields: string[] = [];

    const compareSection = (
      section: string,
      oldData: Record<string, unknown>,
      newData: Record<string, unknown>,
    ) => {
      const keys = new Set([
        ...Object.keys(oldData),
        ...Object.keys(newData),
      ]);

      for (const key of keys) {
        const oldValue = oldData[key] ?? null;
        const newValue = newData[key] ?? null;

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedFields.push(`${section}.${key}`);
        }
      }
    };

    compareSection(
      "price_list",
      oldSnapshot.price_list,
      newSnapshot.price_list,
    );

    compareSection(
      "price_list_item",
      oldSnapshot.price_list_item,
      newSnapshot.price_list_item,
    );

    if (
      JSON.stringify(oldSnapshot.volume_discounts) !==
      JSON.stringify(newSnapshot.volume_discounts)
    ) {
      changedFields.push("volume_discounts");
    }

    return changedFields;
  }

  static async record(
    client: PoolClient,
    input: HistoryInput,
  ): Promise<void> {
    const changedFields = this.getChangedFields(
      input.oldSnapshot,
      input.newSnapshot,
    );

    if (changedFields.length === 0) {
      return;
    }

    await client.query(
      `
        INSERT INTO price_list_history (
          company_id,
          item_id,
          price_list_id,
          price_list_item_id,
          action,
          old_snapshot,
          new_snapshot,
          changed_fields,
          changed_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb,
          $7::jsonb,
          $8::jsonb,
          $9
        )
      `,
      [
        input.companyId,
        input.itemId,
        input.priceListId,
        input.priceListItemId,
        input.action,
        input.oldSnapshot
          ? JSON.stringify(input.oldSnapshot)
          : null,
        input.newSnapshot
          ? JSON.stringify(input.newSnapshot)
          : null,
        JSON.stringify(changedFields),
        input.changedBy,
      ],
    );
  }
}


/* import type { PoolClient } from "pg";

export type PriceListSnapshot = {
  price_list: Record<string, unknown>;
  price_list_item: Record<string, unknown>;
  volume_discounts: Record<string, unknown>[];
};

export type PriceListHistoryAction = "CREATE" | "UPDATE" | "DELETE";

interface SnapshotInput {
  companyId: string;
  priceListId: string;
  priceListItemId: string;
}

interface HistoryInput {
  companyId: string;
  itemId: string;
  priceListId: string;
  priceListItemId: string;
  action: PriceListHistoryAction;
  oldSnapshot: PriceListSnapshot | null;
  newSnapshot: PriceListSnapshot | null;
  changedBy: string | null;
}

export class PriceListHistoryService {
  static async getSnapshot(
    client: PoolClient,
    input: SnapshotInput,
  ): Promise<PriceListSnapshot | null> {
    const headerResult = await client.query(
      `
        SELECT
          id,
          name,
          list_type,
          party_id,
          offer_method,
          start_date,
          end_date,
          currency_id,
          status
        FROM price_lists
        WHERE id = $1
          AND company_id = $2
      `,
      [input.priceListId, input.companyId],
    );

    if (!headerResult.rows[0]) {
      return null;
    }

    const itemResult = await client.query(
      `
        SELECT
          id,
          item_id,
          uom_id,
          standard_price,
          offered_price,
          min_order_qty,
          max_order_qty,
          has_volume_discount
        FROM price_list_items
        WHERE id = $1
          AND price_list_id = $2
      `,
      [input.priceListItemId, input.priceListId],
    );

    if (!itemResult.rows[0]) {
      return null;
    }

    const discountResult = await client.query(
      `
        SELECT
          id,
          min_order_qty,
          discount_type,
          discount_value,
          discounted_price
        FROM price_list_volume_discounts
        WHERE price_list_item_id = $1
        ORDER BY min_order_qty ASC, id ASC
      `,
      [input.priceListItemId],
    );

    return {
      price_list: headerResult.rows[0],
      price_list_item: itemResult.rows[0],
      volume_discounts: discountResult.rows,
    };
  }

  static getChangedFields(
    oldSnapshot: PriceListSnapshot | null,
    newSnapshot: PriceListSnapshot | null,
  ): string[] {
    if (!oldSnapshot && newSnapshot) {
      return ["configuration"];
    }

    if (oldSnapshot && !newSnapshot) {
      return ["configuration"];
    }

    if (!oldSnapshot || !newSnapshot) {
      return [];
    }

    const changedFields: string[] = [];

    const compareSection = (
      section: string,
      oldData: Record<string, unknown>,
      newData: Record<string, unknown>,
    ) => {
      const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

      for (const key of keys) {
        if (
          JSON.stringify(oldData[key] ?? null) !==
          JSON.stringify(newData[key] ?? null)
        ) {
          changedFields.push(`${section}.${key}`);
        }
      }
    };

    compareSection(
      "price_list",
      oldSnapshot.price_list,
      newSnapshot.price_list,
    );

    compareSection(
      "price_list_item",
      oldSnapshot.price_list_item,
      newSnapshot.price_list_item,
    );

    if (
      JSON.stringify(oldSnapshot.volume_discounts) !==
      JSON.stringify(newSnapshot.volume_discounts)
    ) {
      changedFields.push("volume_discounts");
    }

    return changedFields;
  }

  static async record(client: PoolClient, input: HistoryInput): Promise<void> {
    const changedFields = this.getChangedFields(
      input.oldSnapshot,
      input.newSnapshot,
    );

    if (changedFields.length === 0) {
      return;
    }

    await client.query(
      `
        INSERT INTO price_list_history (
          company_id,
          item_id,
          price_list_id,
          price_list_item_id,
          action,
          old_snapshot,
          new_snapshot,
          changed_fields,
          changed_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb, $7::jsonb, $8::jsonb, $9
        )
      `,
      [
        input.companyId,
        input.itemId,
        input.priceListId,
        input.priceListItemId,
        input.action,
        input.oldSnapshot ? JSON.stringify(input.oldSnapshot) : null,
        input.newSnapshot ? JSON.stringify(input.newSnapshot) : null,
        JSON.stringify(changedFields),
        input.changedBy,
      ],
    );
  }
} */
