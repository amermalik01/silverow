// lib/services/item-journal.service.ts

import { pool } from "@/lib/db";
import { JournalService } from "./journal.service";
import {
  InventoryMovementService,
  InventoryMovementLineInput,
} from "./inventory/inventory-movement.service"; // Ensure this matches your directory path

export interface StockAllocationRecord {
  date_received: string;
  prod_date: string;
  expiry_date: string;
  batch_no: string;
  serial_no: string;
  quantity: number;
}

export interface ItemJournalLineInput {
  transaction_type: "Positive Entry" | "Negative Entry";
  item_id: string;
  item_code: string;
  item_description: string;
  warehouse_id: string;
  location_id: string;
  quantity: number;
  uom: string;
  cost_per_unit: number;
  amount: number;
  account_id: string;
  allocations: StockAllocationRecord[];
}

export interface ItemJournalPayload {
  entry_date: string;
  reference?: string;
  description?: string;
  lines: ItemJournalLineInput[];
}

export class ItemJournalService {
  /**
   * Helper to format UI matrix array straight into generic financial double ledger accounting paths
   */
  private static transformToJournalLines(lines: ItemJournalLineInput[]) {
    return lines.map((line) => {
      const isPositive = line.transaction_type === "Positive Entry";
      const debit = isPositive ? line.amount : 0;
      const credit = isPositive ? 0 : line.amount;

      return {
        account_id: line.account_id,
        debit,
        credit,
        item_id: line.item_id,
        item_code: line.item_code,
        item_description: line.item_description,
        warehouse_id: line.warehouse_id,
        location_id: line.location_id,
        quantity: line.quantity,
        uom: line.uom || "Pcs",
        cost_per_unit: line.cost_per_unit,
      };
    });
  }

  /**
   * Translates allocation arrays down into individual row elements matching InventoryMovementLineInput properties
   */
  private static transformToMovementLines(
    lines: ItemJournalLineInput[],
    defaultDate: string,
  ): InventoryMovementLineInput[] {
    const movementLines: InventoryMovementLineInput[] = [];

    for (const line of lines) {
      const isPositive = line.transaction_type === "Positive Entry";

      // Fallback structural initialization for lines without explicit tracking configurations
      const allocationsList =
        line.allocations && line.allocations.length > 0
          ? line.allocations
          : [
              {
                date_received: defaultDate,
                prod_date: null,
                expiry_date: null,
                batch_no: "",
                serial_no: "",
                quantity: line.quantity,
              },
            ];

      for (const alloc of allocationsList) {
        movementLines.push({
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          location_id: line.location_id || null,
          quantity: Number(alloc.quantity),
          unit_cost: Number(line.cost_per_unit || 0),
          movement_direction: isPositive ? "IN" : "OUT",
          batch_no: alloc.batch_no || null,
          serial_no: alloc.serial_no || null,
          expiry_date: alloc.expiry_date || null,
        });
      }
    }

    return movementLines;
  }

  /**
   * Creates Item Journal entry documents
   */
  static async create(companyId: string, payload: ItemJournalPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Submit core financial accounts posting mapping via JournalService
      const financialLines = this.transformToJournalLines(payload.lines);
      const balancedPayload = {
        entry_date: payload.entry_date,
        source: "ITEM_JOURNAL" as const,
        reference: payload.reference,
        description: payload.description,
        lines: financialLines,
      };

      const journalResult = await JournalService.create(
        companyId,
        balancedPayload,
      );
      const dbJournalId = journalResult.id;

      // 2. Generate unified document payload matching your service's PostInventoryTransactionInput mapping rules
      const movementLines = this.transformToMovementLines(
        payload.lines,
        payload.entry_date,
      );

      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,
        transaction_type: "ADJUSTMENT", // Corresponds to your system's InventoryTransactionType enum
        posting_date: payload.entry_date,
        reference_type: "ITEM_JOURNAL",
        reference_id: dbJournalId,
        lines: movementLines,
      });

      await client.query("COMMIT");
      return journalResult;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing unposted Item Journal safely
   */
  static async update(
    companyId: string,
    journalId: string,
    payload: ItemJournalPayload,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Clean historical movement rows using our new deletion rollback implementation
      await InventoryMovementService.deleteTransactionByReference(
        client,
        journalId,
        "ITEM_JOURNAL",
      );

      // 2. Sync general accounts ledger changes
      const financialLines = this.transformToJournalLines(payload.lines);
      const balancedPayload = {
        entry_date: payload.entry_date,
        source: "ITEM_JOURNAL" as const,
        reference: payload.reference,
        description: payload.description,
        lines: financialLines,
      };

      await JournalService.update(companyId, journalId, balancedPayload);

      // 3. Post replacement inventory records
      const movementLines = this.transformToMovementLines(
        payload.lines,
        payload.entry_date,
      );

      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,
        transaction_type: "ADJUSTMENT",
        posting_date: payload.entry_date,
        reference_type: "ITEM_JOURNAL",
        reference_id: journalId,
        lines: movementLines,
      });

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Finalizes an Item Journal entry, locking financial ledgers and updating inventory states.
   */
  static async post(companyId: string, journalId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lock the general ledger journal entry header
      await client.query(
        `
        UPDATE journal_entries
        SET is_posted = true, posted_at = now(), updated_at = now()
        WHERE id = $1 AND company_id = $2
        `,
        [journalId, companyId],
      );

      // 2. Flip the corresponding inventory transaction document status to 'posted'
      await client.query(
        `
        UPDATE inventory_transactions
        SET status = 'posted', updated_at = now()
        WHERE reference_id = $1 AND reference_type = 'ITEM_JOURNAL' AND company_id = $2
        `,
        [journalId, "ITEM_JOURNAL", companyId],
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
