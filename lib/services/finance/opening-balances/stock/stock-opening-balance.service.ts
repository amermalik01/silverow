// lib/services/finance/opening-balances/stock/stock-opening-balance.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLJournalSource } from "@/lib/services/gl/gl-posting.service";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

export interface StockOpeningBalanceInput {
  id?: string;
  posting_date: string;
  item_id: string;
  item_no: string;
  item_description: string;
  uom?: string | null;

  production_date?: string | null;
  date_received?: string | null;
  use_by_date?: string | null;

  consignment_no?: string | null;
  ref_no?: string | null;
  batch_no?: string | null;

  warehouse_id: string;
  warehouse_code?: string | null;
  warehouse_name: string;
  location_id?: string | null;
  location_name?: string | null;

  quantity: number;
  unit_price: number;
}

export interface StockOpeningBalancePayload {
  lines: StockOpeningBalanceInput[];
}

type DbRow = Record<string, unknown>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nullableString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim() || null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function nullableDate(value: unknown, field: string): string | null {
  const date = nullableString(value);

  if (!date) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${field} must be a valid date.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${field} must be a valid date.`);
  }

  return date;
}

function validateInput(input: StockOpeningBalanceInput, index: number): void {
  const row = index + 1;

  if (input.id && !UUID_REGEX.test(input.id)) {
    throw new Error(`Invalid opening balance ID on row ${row}.`);
  }

  for (const [field, value] of [
    ["item_id", input.item_id],
    ["warehouse_id", input.warehouse_id],
  ] as const) {
    if (!UUID_REGEX.test(value)) {
      throw new Error(`Invalid ${field} on row ${row}.`);
    }
  }

  if (input.location_id && !UUID_REGEX.test(input.location_id)) {
    throw new Error(`Invalid location on row ${row}.`);
  }

  nullableDate(input.posting_date, `Posting date on row ${row}`);

  nullableDate(input.production_date, `Production date on row ${row}`);
  nullableDate(input.date_received, `Date received on row ${row}`);
  nullableDate(input.use_by_date, `Use by date on row ${row}`);

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error(`Quantity must be greater than zero on row ${row}.`);
  }

  if (!Number.isFinite(input.unit_price) || input.unit_price < 0) {
    throw new Error(`Unit cost cannot be negative on row ${row}.`);
  }

  if (input.quantity > 1e14 || input.unit_price > 1e14) {
    throw new Error(`Numeric value exceeds the allowed range on row ${row}.`);
  }

  requiredString(input.posting_date, `Posting date on row ${row}`);
  requiredString(input.item_no, `Item number on row ${row}`);
  requiredString(input.item_description, `Item description on row ${row}`);
  requiredString(input.warehouse_name, `Warehouse name on row ${row}`);
}

export class StockOpeningBalanceService {
  /**
   * LIST
   */
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        id,
        posting_date,
        item_id,
        item_no,
        item_description,
        uom,
        production_date,
        date_received,
        use_by_date,
        consignment_no,
        ref_no,
        batch_no,
        warehouse_id,
        warehouse_code,
        warehouse_name,
        location_id,
        location_name,
        quantity,
        unit_price,
        amount,
        status,
        posted_at,
        posted_by,
        inventory_ledger_entry_id,
        general_ledger_document_no,
        created_at,
        updated_at
      FROM stock_opening_balances
      WHERE company_id = $1
      ORDER BY posting_date, created_at, id
      `,
      [companyId],
    );

    return {
      data: result.rows.map((row: DbRow) => ({
        ...row,
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        amount: Number(row.amount),
        posted: row.status === "Posted",
      })),
    };
  }

  /**
   * SAVE
   *
   * Existing IDs are updated only if they belong to this company
   * and remain Open. New rows are inserted as Open.
   */
  static async save(companyId: string, payload: StockOpeningBalancePayload) {
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new Error("Please provide at least one opening balance line.");
    }

    if (payload.lines.length > 500) {
      throw new Error("You can save a maximum of 500 lines at a time.");
    }

    const itemIds = new Set<string>();
    const recordIds = new Set<string>();

    payload.lines.forEach((line, index) => {
      validateInput(line, index);

      if (itemIds.has(line.item_id)) {
        throw new Error(`Duplicate item found on row ${index + 1}.`);
      }

      itemIds.add(line.item_id);

      if (line.id) {
        if (recordIds.has(line.id)) {
          throw new Error("Duplicate opening balance ID in request.");
        }

        recordIds.add(line.id);
      }
    });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const savedRows: DbRow[] = [];

      for (const [index, line] of payload.lines.entries()) {
        const postingDate = nullableDate(
          line.posting_date,
          `Posting date on row ${index + 1}`,
        );

        const productionDate = nullableDate(
          line.production_date,
          "Production date",
        );
        const receivedDate = nullableDate(line.date_received, "Date received");
        const useByDate = nullableDate(line.use_by_date, "Use by date");

        const values = [
          postingDate,
          line.item_id,
          line.item_no.trim(),
          line.item_description.trim(),
          nullableString(line.uom),
          productionDate,
          receivedDate,
          useByDate,
          nullableString(line.consignment_no),
          nullableString(line.ref_no),
          nullableString(line.batch_no),
          line.warehouse_id,
          nullableString(line.warehouse_code),
          line.warehouse_name.trim(),
          line.location_id || null,
          nullableString(line.location_name),
          line.quantity,
          line.unit_price,
        ];

        if (line.id) {
          const updated = await client.query(
            `
            UPDATE stock_opening_balances
            SET
              posting_date = $1,
              item_id = $2,
              item_no = $3,
              item_description = $4,
              uom = $5,
              production_date = $6,
              date_received = $7,
              use_by_date = $8,
              consignment_no = $9,
              ref_no = $10,
              batch_no = $11,
              warehouse_id = $12,
              warehouse_code = $13,
              warehouse_name = $14,
              location_id = $15,
              location_name = $16,
              quantity = $17,
              unit_price = $18,
              updated_at = NOW()
            WHERE id = $19
              AND company_id = $20
              AND status = 'Open'
            RETURNING *
            `,
            [...values, line.id, companyId],
          );

          if (!updated.rowCount) {
            const exists = await client.query(
              `
              SELECT status
              FROM stock_opening_balances
              WHERE id = $1 AND company_id = $2
              `,
              [line.id, companyId],
            );

            if (!exists.rowCount) {
              throw new Error("Opening balance not found.");
            }

            throw new Error("Posted opening balances cannot be modified.");
          }

          savedRows.push(updated.rows[0]);
        } else {
          const inserted = await client.query(
            `
            INSERT INTO stock_opening_balances (
              company_id,
              posting_date,
              item_id,
              item_no,
              item_description,
              uom,
              production_date,
              date_received,
              use_by_date,
              consignment_no,
              ref_no,
              batch_no,
              warehouse_id,
              warehouse_code,
              warehouse_name,
              location_id,
              location_name,
              quantity,
              unit_price,
              status
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, 'Open'
            )
            RETURNING *
            `,
            [companyId, ...values],
          );

          savedRows.push(inserted.rows[0]);
        }
      }

      await client.query("COMMIT");

      return {
        message: "Stock opening balances saved successfully.",
        data: savedRows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * DELETE DRAFT
   */
  static async delete(companyId: string, id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new Error("Invalid opening balance ID.");
    }

    const result = await pool.query(
      `
      DELETE FROM stock_opening_balances
      WHERE id = $1
        AND company_id = $2
        AND status = 'Open'
      RETURNING id
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      const existing = await pool.query(
        `
        SELECT status
        FROM stock_opening_balances
        WHERE id = $1 AND company_id = $2
        `,
        [id, companyId],
      );

      if (!existing.rowCount) {
        throw new Error("Opening balance not found.");
      }

      throw new Error(
        "Posted opening balances cannot be deleted. Use the reversal process.",
      );
    }
  }

  // Implement post() after connecting the inventory and GL
  // posting logic to your existing ledger schema.

  /**
   * Post Stock Opening Balances to Inventory and General Ledger.
   */

  static async post(companyId: string, ids: string[], userId?: string) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("No stock opening balance lines specified for posting.");
    }

    if (ids.length > 500) {
      throw new Error(
        "You can post a maximum of 500 stock opening balance lines at a time.",
      );
    }

    if (ids.some((id) => typeof id !== "string" || !UUID_REGEX.test(id))) {
      throw new Error("One or more opening balance IDs are invalid.");
    }

    if (new Set(ids).size !== ids.length) {
      throw new Error("Duplicate opening balance IDs are not allowed.");
    }

    if (userId && !UUID_REGEX.test(userId)) {
      throw new Error("Invalid posting user ID.");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // ---------------------------------------------------------
      // 1. Lock and validate the requested opening balance rows.
      // ---------------------------------------------------------

      const rowsResult = await client.query(
        `
        SELECT
          id,
          company_id,
          posting_date,
          item_id,
          item_no,
          item_description,
          uom,
          production_date,
          date_received,
          use_by_date,
          consignment_no,
          ref_no,
          batch_no,
          warehouse_id,
          warehouse_code,
          warehouse_name,
          location_id,
          location_name,
          quantity,
          unit_price,
          amount,
          status
        FROM stock_opening_balances
        WHERE company_id = $1
          AND id = ANY($2::uuid[])
        ORDER BY posting_date, created_at, id
        FOR UPDATE
        `,
        [companyId, ids],
      );

      const rows = rowsResult.rows;

      if (rows.length !== ids.length) {
        throw new Error(
          "One or more stock opening balance records were not found.",
        );
      }

      const rowsById = new Map(rows.map((row) => [String(row.id), row]));

      // Preserve the caller's ID order.
      const orderedRows = ids.map((id) => rowsById.get(id)!);

      for (const row of orderedRows) {
        if (row.status !== "Open") {
          throw new Error(
            `Stock opening balance for item ${row.item_no} has already been posted or is not open.`,
          );
        }
      }

      // ---------------------------------------------------------
      // 2. Validate posting date.
      // ---------------------------------------------------------

      const postingDate = this.formatPostingDate(orderedRows[0].posting_date);

      for (const row of orderedRows) {
        const rowDate = this.formatPostingDate(row.posting_date);

        if (rowDate !== postingDate) {
          throw new Error(
            "All stock opening balance lines in a posting batch must have the same posting date.",
          );
        }
      }

      const gateCheck = await validateLedgerPostingDate(companyId, postingDate);

      if (!gateCheck.allowed) {
        throw new Error(
          gateCheck.reason ||
            "The stock opening balance posting date is locked.",
        );
      }

      // ---------------------------------------------------------
      // 3. Load the company's configured GL accounts.
      // ---------------------------------------------------------

      const setupResult = await client.query(
        `
        SELECT
          opening_balance_stock_account_id,
          opening_balance_equity_account_id
        FROM company_finance_setup
        WHERE company_id = $1
        `,
        [companyId],
      );

      const setup = setupResult.rows[0];

      if (
        !setup?.opening_balance_stock_account_id ||
        !setup?.opening_balance_equity_account_id
      ) {
        throw new Error(
          "Stock Account and Opening Balance Equity Account must be configured in Finance Setup before posting.",
        );
      }

      const stockAccountId = String(setup.opening_balance_stock_account_id);

      const equityAccountId = String(setup.opening_balance_equity_account_id);

      if (stockAccountId === equityAccountId) {
        throw new Error(
          "Stock Account and Opening Balance Equity Account must be different accounts.",
        );
      }

      // ---------------------------------------------------------
      // 4. Create an unposted GL journal header.
      //
      // The header and its ledger entries are finalized before
      // the transaction commits.
      // ---------------------------------------------------------
      

      const seqResult = await client.query(
        `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
        [companyId, "opening_balance"],
      );
      const entryNo = seqResult.rows[0].sequence_code;

      const journalResult = await client.query(
        `
        INSERT INTO journal_entries (
          company_id,
          entry_no,
          entry_date,
          source,
          reference,
          journal_type,
          is_posted,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'STOCK_OPENING_BALANCE',
          'Stock Opening Balance',
          'Stock Opening Balance',
          FALSE,
          NOW()
        )
        RETURNING *
        `,
        [companyId, entryNo, postingDate],
      );

      const journal = journalResult.rows[0];

      const journalId = String(journal.id);

      // Use the application's generated journal number when present.
      // Fall back to the journal UUID if entry_no is not generated.
      // const entryNo = String(journal.entry_no || journal.id);

      const currencyId: string | null = journal.currency_id ?? null;

      const exchangeRate = Number(journal.exchange_rate || 1);

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new Error("The journal exchange rate is invalid.");
      }

      // ---------------------------------------------------------
      // 5. Post every stock movement through the unified engine.
      // ---------------------------------------------------------

      let totalInventoryValue = 0;

      const postedInventoryEntries: Array<{
        openingBalanceId: string;
        inventoryLedgerEntryId: string;
        inventoryValue: number;
      }> = [];

      for (const row of orderedRows) {
        const quantity = Number(row.quantity);
        const unitPrice = Number(row.unit_price);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(
            `Quantity must be greater than zero for item ${row.item_no}.`,
          );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(
            `Unit cost cannot be negative for item ${row.item_no}.`,
          );
        }

        const stockLine = {
          item_id: String(row.item_id),
          warehouse_id: String(row.warehouse_id),

          location_id: row.location_id ? String(row.location_id) : null,

          batch_no: row.batch_no || null,

          // ref_no is not necessarily a serial number.
          serial_no: null,

          expiry_date: row.use_by_date
            ? this.formatPostingDate(row.use_by_date)
            : null,

          date_received: row.date_received
            ? this.formatPostingDate(row.date_received)
            : null,

          prod_date: row.production_date
            ? this.formatPostingDate(row.production_date)
            : null,

          quantity,
          unit_cost: unitPrice,

          reference_type: "STOCK_OPENING_BALANCE",
          reference_id: String(row.id),
        };

        const inventoryResult =
          await UnifiedInventoryEngineService.processInboundStock(
            client,
            companyId,
            postingDate,
            "OPENING_BALANCE",
            stockLine,
          );

        const ledgerEntry = inventoryResult.ledgerEntry;

        if (!ledgerEntry?.id) {
          throw new Error(
            `Inventory ledger entry was not created for item ${row.item_no}.`,
          );
        }

        const inventoryValue = Number(ledgerEntry.total_cost);

        if (!Number.isFinite(inventoryValue) || inventoryValue < 0) {
          throw new Error(
            `Invalid inventory valuation for item ${row.item_no}.`,
          );
        }

        // The inventory ledger is the source of the actual posted value.
        totalInventoryValue += inventoryValue;

        postedInventoryEntries.push({
          openingBalanceId: String(row.id),
          inventoryLedgerEntryId: String(ledgerEntry.id),
          inventoryValue,
        });
      }

      totalInventoryValue = Number(totalInventoryValue.toFixed(2));

      // ---------------------------------------------------------
      // 6. Create the journal's double-entry lines.
      // ---------------------------------------------------------

      await client.query(
        `
        INSERT INTO journal_entry_lines (
          journal_id,
          company_id,
          account_id,
          debit,
          credit,
          description,
          line_no
        )
        VALUES
          ($1, $2, $3, $4, 0,
           'Stock Opening Balance - Inventory Asset', 1),
          ($1, $2, $5, 0, $4,
           'Stock Opening Balance - Opening Equity', 2)
        `,
        [
          journalId,
          companyId,
          stockAccountId,
          totalInventoryValue,
          equityAccountId,
        ],
      );

      // ---------------------------------------------------------
      // 7. Insert the corresponding GL ledger entries.
      //
      // Follow the same gl_ledger_entries conventions as the
      // ItemJournalPostingService.
      // ---------------------------------------------------------

      const totalFcy =
        exchangeRate === 0
          ? totalInventoryValue
          : Number((totalInventoryValue / exchangeRate).toFixed(2));

      const glEntries = [
        {
          accountId: stockAccountId,
          debit: totalInventoryValue,
          credit: 0,
          debitFcy: totalFcy,
          creditFcy: 0,
          description: "Stock Opening Balance - Inventory Asset",
        },
        {
          accountId: equityAccountId,
          debit: 0,
          credit: totalInventoryValue,
          debitFcy: 0,
          creditFcy: totalFcy,
          description: "Stock Opening Balance - Opening Equity",
        },
      ];

      for (const glEntry of glEntries) {
        await client.query(
          `
          INSERT INTO gl_ledger_entries (
            company_id,
            account_id,
            source_journal_id,
            entry_no,
            posting_date,
            source_type,
            reference,
            description,
            debit,
            credit,
            currency_id,
            exchange_rate,
            debit_fcy,
            credit_fcy,
            source_document_id,
            source_document_no,
            party_type,
            party_id,
            document_no,
            posted_by,
            posted_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18,
            $19, $20, NOW()
          )
          `,
          [
            companyId,
            glEntry.accountId,
            journalId,
            entryNo,
            postingDate,
            "INVENTORY" as GLJournalSource,
            "Stock Opening Balance",
            glEntry.description,
            glEntry.debit,
            glEntry.credit,
            currencyId,
            exchangeRate,
            glEntry.debitFcy,
            glEntry.creditFcy,
            journalId,
            entryNo,
            null,
            null,
            entryNo,
            userId ?? null,
          ],
        );
      }

      // ---------------------------------------------------------
      // 8. Mark the source opening balance records as posted.
      // ---------------------------------------------------------

      for (const entry of postedInventoryEntries) {
        const updateResult = await client.query(
          `
          UPDATE stock_opening_balances
          SET
            status = 'Posted',
            posted_at = NOW(),
            posted_by = $3,
            inventory_ledger_entry_id = $4,
            general_ledger_document_no = $5,
            updated_at = NOW()
          WHERE id = $1
            AND company_id = $2
            AND status = 'Open'
          RETURNING id
          `,
          [
            entry.openingBalanceId,
            companyId,
            userId ?? null,
            entry.inventoryLedgerEntryId,
            entryNo,
          ],
        );

        if (!updateResult.rowCount) {
          throw new Error(
            `Could not finalize stock opening balance ${entry.openingBalanceId}.`,
          );
        }
      }

      // ---------------------------------------------------------
      // 9. Finalize the journal header.
      // ---------------------------------------------------------

      const finalizedJournal = await client.query(
        `
        UPDATE journal_entries
        SET
          is_posted = TRUE,
          posted_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND company_id = $2
          AND source = 'STOCK_OPENING_BALANCE'
          AND is_posted = FALSE
        RETURNING id
        `,
        [journalId, companyId],
      );

      if (!finalizedJournal.rowCount) {
        throw new Error(
          "The stock opening balance journal could not be finalized.",
        );
      }

      // ---------------------------------------------------------
      // 10. Commit all changes atomically.
      // ---------------------------------------------------------

      await client.query("COMMIT");

      return {
        success: true,
        journalId,
        documentNo: entryNo,
        postedLines: rows.length,
        totalInventoryValue,
        message:
          `Successfully posted ${rows.length} stock opening balance line(s) ` +
          "to inventory and the general ledger.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Format a PostgreSQL DATE or date-like value without
   * accidentally shifting a date across time zones.
   */
  private static formatPostingDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const stringValue = String(value ?? "").trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    const date = new Date(stringValue);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid stock opening balance posting date.");
    }

    return date.toISOString().slice(0, 10);
  }
}
