// lib/services/item-journal/item-journal-posting.service.ts

import { PoolClient } from "pg";

import { pool } from "@/lib/db";

import { InventoryMovementService } from "@/lib/services/inventory/inventory-movement.service";

import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

import {
  ItemJournalLineInput,
  ItemJournalValidationService,
} from "./item-journal-validation.service";

type ItemJournalDbLine = {
  id: string;
  journal_id: string;

  account_id: string | null;

  debit: number | string | null;
  credit: number | string | null;

  item_id: string;
  item_code: string | null;
  item_description: string | null;

  warehouse_id: string;
  location_id: string | null;

  quantity: number | string | null;
  uom: string | null;
  cost_per_unit: number | string | null;

  line_no: number | string;
  created_at: Date | string;
};

type ItemJournalAllocationDbRow = {
  id: string;
  journal_id: string;
  journal_line_id: string;

  item_id: string;

  warehouse_id: string;
  warehouse_location_id: string | null;
  location_id: string | null;

  allocated_quantity: number | string | null;

  unit_cost: number | string | null;
  total_cost: number | string | null;

  date_received: Date | string | null;
  prod_date: Date | string | null;
  expiry_date: Date | string | null;

  batch_no: string | null;
  serial_no: string | null;

  status: string | null;

  created_at: Date | string;
};

type ItemJournalAllocationInput = NonNullable<
  ItemJournalLineInput["allocations"]
>[number];

export class ItemJournalPostingService {
  /**
   * Post an Item Journal.
   *
   * This is the ONLY service in this group that changes inventory.
   *
   * Transaction:
   *
   * BEGIN
   *   lock journal
   *   validate journal
   *   validate posting date
   *   load lines
   *   load allocations
   *   validate allocations
   *   create inventory movement
   *   mark allocations POSTED
   *   mark journal POSTED
   * COMMIT
   *
   * If anything fails, everything is rolled back.
   */
  static async post(companyId: string, journalId: string, userId?: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /**
       * 1. Lock the journal.
       */
      const journalResult = await client.query(
        `
        SELECT
          *
        FROM journal_entries
        WHERE id = $1
          AND company_id = $2
          AND source = 'ITEM_JOURNAL'
        FOR UPDATE
        `,
        [journalId, companyId],
      );

      if (!journalResult.rows.length) {
        throw new Error("Item journal not found");
      }

      const journal = journalResult.rows[0];

      if (journal.is_posted) {
        throw new Error("Item journal has already been posted");
      }

      const postingDate = this.formatDate(journal.entry_date);

      const gateCheck = await validateLedgerPostingDate(companyId, postingDate);

      if (!gateCheck.allowed) {
        throw new Error(
          gateCheck.reason || "The journal date is locked for posting.",
        );
      }

      const linesResult = await client.query<ItemJournalDbLine>(
        `
          SELECT
            l.id,
            l.journal_id,
            l.account_id,
            l.debit,
            l.credit,
            l.item_id,
            i.item_code,
            l.description AS item_description,
            l.warehouse_id,
            l.location_id,
            l.quantity,
            l.uom,
            l.unit_cost AS cost_per_unit,
            l.line_no,
            l.created_at
          FROM journal_entry_lines l
          LEFT JOIN items i ON i.id = l.item_id
          WHERE l.journal_id = $1
            AND l.company_id = $2
          ORDER BY
            l.line_no ASC,
            l.created_at ASC
          `,
        [journalId, companyId],
      );

      if (!linesResult.rows.length) {
        throw new Error("Item journal contains no lines");
      }

      /**
       * -----------------------------------------------------
       * 5. Load allocations.
       * -----------------------------------------------------
       */

      const allocationsResult = await client.query<ItemJournalAllocationDbRow>(
        `
          SELECT
            ia.id,
            -- ia.journal_id,
            ia.journal_line_id,
            ia.item_id,
            ia.warehouse_id,
            ia.warehouse_location_id,
            ia.allocated_quantity,
            ia.unit_cost,
            ia.total_cost,
            -- ia.date_received,
            -- ia.prod_date,
            ia.expiry_date,
            ia.batch_no,
            ia.bin_code AS serial_no,
            ia.status,
            ia.created_at
          FROM inventory_allocations ia
          WHERE ia.journal_line_id IN (
                SELECT id 
                FROM journal_entry_lines 
                WHERE journal_id = $1 AND company_id = $2)
            AND ia.company_id = $2
          ORDER BY
            ia.created_at ASC
          `,
        [journalId, companyId],
      );

      /**
       * 6. Convert DB rows into posting lines.
       */
      const postingLines = this.buildPostingLines(
        linesResult.rows,
        allocationsResult.rows,
      );

      /**
       * 7. Validate the complete posting payload.
       */
      const payload = {
        entry_date: postingDate,
        is_posted: true,
        lines: postingLines,
      };

      ItemJournalValidationService.validateForPosting(payload);

      /**
       * 8. Convert to inventory movements.
       */
      const movementLines = this.transformToMovementLines(postingLines);

      if (!movementLines.length) {
        throw new Error("No valid inventory movements were generated.");
      }

      /**
       * 9. Post inventory transaction.
       *
       * InventoryMovementService is expected to:
       *
       * - update inventory balances
       * - validate stock availability for OUT movements
       * - create inventory transaction header
       * - create inventory transaction lines
       *
       * Everything is using the SAME pg transaction.
       */
      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,

        transaction_type: "ITEM_JOURNAL",

        posting_date: postingDate,

        reference_type: "ITEM_JOURNAL",

        reference_id: journalId,

        created_by: userId || null,

        lines: movementLines,
      });

      /**
       * 10. Mark allocations as posted.
       *
       * If your inventory_allocations table uses another
       * status convention, change these values here.
       */
      await client.query(
        `
        UPDATE inventory_allocations
        SET
          status = 'POSTED',
          updated_at = NOW()
        WHERE journal_line_id IN (
          SELECT id 
          FROM journal_entry_lines 
          WHERE journal_id = $1 AND company_id = $2)
          AND company_id = $2
        `,
        [journalId, companyId],
      );

      /**
       * 11. Finalize the financial journal.
       *
       * The WHERE is_posted = false condition protects
       * against an unexpected concurrent update.
       */
      const updateResult = await client.query(
        `
          UPDATE journal_entries
          SET
            is_posted = true,
            posted_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
            AND company_id = $2
            AND source = 'ITEM_JOURNAL'
            AND is_posted = false
          RETURNING *
          `,
        [journalId, companyId],
      );

      if (!updateResult.rows.length) {
        throw new Error(
          "Item journal could not be finalized because it was already posted.",
        );
      }

      await client.query("COMMIT");

      return {
        success: true,
        id: journalId,
        journal: updateResult.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert DB journal lines + allocation rows into
   * ItemJournalLineInput objects.
   */
  private static buildPostingLines(
    dbLines: ItemJournalDbLine[],
    dbAllocations: ItemJournalAllocationDbRow[],
  ): ItemJournalLineInput[] {
    const allocationMap = new Map<string, ItemJournalAllocationDbRow[]>();

    for (const allocation of dbAllocations) {
      const key = String(allocation.journal_line_id);

      const existing = allocationMap.get(key);

      if (existing) {
        existing.push(allocation);
      } else {
        allocationMap.set(key, [allocation]);
      }
    }

    return dbLines.map((line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      /**
       * Positive Entry was stored as debit.
       * Negative Entry was stored as credit.
       */
      const isPositive = debit > credit;

      const amount = isPositive ? debit : credit;

      const quantity = Number(line.quantity || 0);

      const costPerUnit = Number(line.cost_per_unit || 0);

      const allocations = allocationMap.get(String(line.id)) || [];

      /**
       * ItemJournalLineInput requires location_id to be a string.
       *
       * Do not convert a missing location to undefined here.
       * Posting an inventory line without a location should fail
       * explicitly rather than creating invalid posting data.
       */
      const locationId = line.location_id;

      if (!locationId) {
        throw new Error(`Item journal line ${line.id} is missing a location.`);
      }

      const balancingAccountId = line.account_id;

      if (!balancingAccountId) {
        throw new Error(
          `Item journal line ${line.id} is missing a balancing account.`,
        );
      }

      return {
        posting_date: undefined,

        transaction_type: isPositive ? "Positive Entry" : "Negative Entry",

        item_id: line.item_id,

        item_no: line.item_code || "",

        item_description: line.item_description || "",

        warehouse_id: line.warehouse_id,

        /**
         * ItemJournalLineInput requires string.
         */
        location_id: locationId,

        quantity,

        uom: line.uom || "Pcs",

        cost_per_unit: costPerUnit,

        amount,

        balancing_account_id: balancingAccountId,

        allocations: allocations.map(
          (allocation): ItemJournalAllocationInput => {
            const allocationLocationId =
              allocation.warehouse_location_id ??
              allocation.location_id ??
              locationId;

            if (!allocationLocationId) {
              throw new Error(
                `Item journal allocation ${allocation.id} is missing a location.`,
              );
            }

            return {
              location_id: allocationLocationId,

              date_received: this.formatOptionalDate(allocation.date_received),

              prod_date: this.formatOptionalDate(allocation.prod_date),

              expiry_date: this.formatOptionalDate(allocation.expiry_date),

              batch_no: allocation.batch_no ?? undefined,

              serial_no: allocation.serial_no ?? undefined,

              quantity: Number(allocation.allocated_quantity || 0),
            };
          },
        ),
      };
    });
  }

  /**
   * =========================================================
   * TRANSFORM TO INVENTORY MOVEMENTS
   * =========================================================
   */
  private static transformToMovementLines(lines: ItemJournalLineInput[]) {
    const movementLines: Array<{
      item_id: string;
      warehouse_id: string;
      location_id: string | null;
      quantity: number;
      unit_cost: number;
      movement_direction: "IN" | "OUT";
      batch_no: string | null;
      serial_no: string | null;
      expiry_date: string | null;
    }> = [];

    for (const line of lines) {
      const isPositive = line.transaction_type === "Positive Entry";

      const allocations = line.allocations || [];

      for (const allocation of allocations) {
        const quantity = Number(allocation.quantity || 0);

        if (quantity <= 0) {
          continue;
        }

        movementLines.push({
          item_id: line.item_id,

          warehouse_id: line.warehouse_id,

          location_id: allocation.location_id || line.location_id || null,

          quantity,

          unit_cost: Number(line.cost_per_unit || 0),

          movement_direction: isPositive ? "IN" : "OUT",

          batch_no: allocation.batch_no || null,

          serial_no: allocation.serial_no || null,

          expiry_date: allocation.expiry_date || null,
        });
      }
    }

    return movementLines;
  }

  private static formatOptionalDate(
    value: Date | string | null | undefined,
  ): string | undefined {
    if (value == null) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    const stringValue = String(value).trim();

    if (!stringValue) {
      return undefined;
    }

    /**
     * Already YYYY-MM-DD.
     */
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    const date = new Date(stringValue);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid inventory allocation date: ${stringValue}`);
    }

    return date.toISOString().split("T")[0];
  }

  /**
   * =========================================================
   * FORMAT POSTING DATE
   * =========================================================
   */
  private static formatDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    const stringValue = String(value || "");

    /**
     * PostgreSQL DATE normally arrives as YYYY-MM-DD.
     */
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    const date = new Date(stringValue);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid Item Journal posting date.");
    }

    return date.toISOString().split("T")[0];
  }
}

/**
 * Convert Item Journal lines into InventoryMovementService lines.
 */
/* private static transformToMovementLines(lines: ItemJournalLineInput[]) {
    const movementLines: Array<{
      item_id: string;
      warehouse_id: string;
      location_id: string | null;
      quantity: number;
      unit_cost: number;
      movement_direction: "IN" | "OUT";
      batch_no: string | null;
      serial_no: string | null;
      expiry_date: string | null;
    }> = [];

    for (const line of lines) {
      const isPositive = line.transaction_type === "Positive Entry";

      const allocations = line.allocations || [];

      for (const allocation of allocations) {
        const quantity = Number(allocation.quantity || 0);

        if (quantity <= 0) {
          continue;
        }

        movementLines.push({
          item_id: line.item_id,

          warehouse_id: line.warehouse_id,

          location_id: allocation.location_id || line.location_id || null,

          quantity,

          unit_cost: Number(line.cost_per_unit || 0),

          movement_direction: isPositive ? "IN" : "OUT",

          batch_no: allocation.batch_no || null,

          serial_no: allocation.serial_no || null,

          expiry_date: allocation.expiry_date || null,
        });
      }
    }

    return movementLines;
  } */

/**
 * Normalize a PostgreSQL date/timestamp into YYYY-MM-DD.
 */
/* private static formatDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    const stringValue = String(value || "");

    
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    const date = new Date(stringValue);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid Item Journal posting date.");
    }

    return date.toISOString().split("T")[0];
  } 
}*/
