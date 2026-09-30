// lib/services/item-journal/item-journal.service.ts

import { PoolClient } from "pg";

import { pool } from "@/lib/db";

import { ItemJournalValidationService } from "./item-journal-validation.service";
import type {
  ItemJournalLineInput,
  ItemJournalPayload,
} from "./item-journal-validation.service";

export type { ItemJournalLineInput, ItemJournalPayload };

interface ItemJournalAllocationRow {
  id: string;
  journal_line_id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string | null;
  batch_no: string | null;
  serial_no: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
}

export interface ColumnFilter {
  value?: string | number | boolean | null;
  matchMode?: string;
}

export type TableColumnFilters = Record<
  string,
  ColumnFilter | string | number | undefined
>;

export interface ItemJournalListFilters {
  status?: "posted" | "unposted";
  source: string;
  page?: number;
  limit?: number;
  filters?: TableColumnFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class ItemJournalService {
  static async list(companyId: string, filters: ItemJournalListFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const values: (string | number)[] = [companyId, filters.source];
    let whereConditions = `WHERE j.company_id = $1 AND j.source = $2`;

    if (filters.status === "posted") {
      whereConditions += ` AND j.is_posted = true`;
    } else if (filters.status === "unposted") {
      whereConditions += ` AND j.is_posted = false`;
    }

    // Dynamic Column Filtering support safely typed without 'any'
    if (filters.filters) {
      // Allowed column whitelist to prevent SQL injection via keys
      const allowedColumns = new Set([
        "entry_no",
        "entry_date",
        "posted_at",
        "reference",
        "description",
        "posted_by",
      ]);

      Object.entries(filters.filters).forEach(([colKey, filterVal]) => {
        if (
          !allowedColumns.has(colKey) ||
          filterVal === undefined ||
          filterVal === null
        ) {
          return;
        }

        // Handle both simple primitive values and { value: "..." } objects from PrimeReact/DataTables
        const extractedValue =
          typeof filterVal === "object" && "value" in filterVal
            ? filterVal.value
            : filterVal;

        if (
          extractedValue !== undefined &&
          extractedValue !== null &&
          extractedValue !== ""
        ) {
          values.push(`%${String(extractedValue)}%`);
          whereConditions += ` AND j.${colKey}::text ILIKE $${values.length}`;
        }
      });
    }

    // Dynamic Sorting safely guarded
    const validSortColumns: Record<string, string> = {
      entry_no: "j.entry_no",
      entry_date: "j.entry_date",
      posted_at: "j.posted_at",
    };
    const sortColumn = validSortColumns[filters.sortBy || ""] || "j.entry_no";
    const orderDirection =
      filters.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // 1. Fetch total count matching active filters
    const countQuery = `SELECT COUNT(*)::int AS total FROM journal_entries j ${whereConditions}`;
    const countResult = await pool.query<{ total: number }>(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    // 2. Fetch paginated data
    values.push(limit, offset);
    const dataQuery = `
        SELECT 
          j.id,
          j.entry_no,
          j.entry_date,
          j.posted_at,
          j.reference,
          j.description,
          j.is_posted,
          j.posted_by
        FROM journal_entries j
        ${whereConditions}
        ORDER BY ${sortColumn} ${orderDirection}
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `;

    // console.log("dataQuery ==== ", dataQuery);
    // console.log("values ==== ", values);

    const result = await pool.query(dataQuery, values);

    return {
      rows: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Create a new Item Journal draft.
   *
   * IMPORTANT:
   * This method does NOT modify inventory.
   */
  static async create(companyId: string, payload: ItemJournalPayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const seqResult = await client.query(
        `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
        [companyId, "item_journal"],
      );
      const sequenceCode = seqResult.rows[0].sequence_code;

      const normalized = ItemJournalValidationService.normalizePayload(payload);

      /**
       * create() is for creating a journal.
       * If the caller wants posting, posting is performed
       * separately by ItemJournalPostingService.
       */
      normalized.is_posted = false;

      ItemJournalValidationService.validatePayload(normalized, {
        requireAllocations: false,
      });

      const journal = await this.createJournalHeader(
        client,
        companyId,
        sequenceCode,
        normalized,
      );

      for (let index = 0; index < normalized.lines.length; index++) {
        const line = normalized.lines[index];

        const journalLine = await this.insertItemJournalLine(
          client,
          companyId,
          journal.id,
          line,
          index + 1,
        );

        await this.saveItemJournalAllocations(
          client,
          companyId,
          journal.id,
          journalLine.id,
          line,
        );
      }

      await client.query("COMMIT");

      return await this.getById(companyId, journal.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing unposted Item Journal.
   *
   * Posted journals cannot be modified.
   */
  static async update(
    companyId: string,
    journalId: string,
    payload: ItemJournalPayload,
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `
        SELECT
          id,
          is_posted,
          source
        FROM journal_entries
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [journalId, companyId],
      );

      if (!existing.rows.length) {
        throw new Error("Item journal not found");
      }

      const journal = existing.rows[0];

      if (journal.source !== "ITEM_JOURNAL") {
        throw new Error("Target journal is not an item journal");
      }

      if (journal.is_posted) {
        throw new Error("Posted item journal cannot be modified");
      }

      const normalized = ItemJournalValidationService.normalizePayload(payload);

      normalized.is_posted = false;

      ItemJournalValidationService.validatePayload(normalized, {
        requireAllocations: false,
      });

      /**
       * Delete old allocations first.
       */
      await client.query(
        `
        DELETE FROM inventory_allocations
        WHERE journal_line_id IN (
          SELECT id 
          FROM journal_entry_lines 
          WHERE journal_id = $1 AND company_id = $2)
          AND company_id = $2
        `,
        [journalId, companyId],
      );

      /**
       * Delete old journal lines.
       */
      await client.query(
        `
        DELETE FROM journal_entry_lines
        WHERE journal_id = $1
          AND company_id = $2
        `,
        [journalId, companyId],
      );

      /**
       * Update header.
       */
      await client.query(
        `
        UPDATE journal_entries
        SET
          entry_date = $1,
          reference = $2,
          description = $3,
          updated_at = NOW()
        WHERE id = $4
          AND company_id = $5
          AND source = 'ITEM_JOURNAL'
        `,
        [
          normalized.entry_date,
          normalized.reference || null,
          normalized.description || null,
          journalId,
          companyId,
        ],
      );

      /**
       * Insert replacement lines.
       */
      for (let index = 0; index < normalized.lines.length; index++) {
        const line = normalized.lines[index];

        const journalLine = await this.insertItemJournalLine(
          client,
          companyId,
          journalId,
          line,
          index + 1,
        );

        await this.saveItemJournalAllocations(
          client,
          companyId,
          journalId,
          journalLine.id,
          line,
        );
      }

      await client.query("COMMIT");

      return await this.getById(companyId, journalId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get one Item Journal with lines and allocations.
   */
  static async getById(companyId: string, journalId: string) {
    const client = await pool.connect();

    try {
      return await this.getByIdWithClient(client, companyId, journalId);
    } finally {
      client.release();
    }
  }

  /**
   * Internal version that can participate in an existing transaction.
   */
  static async getByIdWithClient(
    client: PoolClient,
    companyId: string,
    journalId: string,
  ) {
    const headerResult = await client.query(
      `
      SELECT *
      FROM journal_entries
      WHERE id = $1
        AND company_id = $2
        AND source = 'ITEM_JOURNAL'
      `,
      [journalId, companyId],
    );

    if (!headerResult.rows.length) {
      throw new Error("Item journal not found");
    }

    const linesResult = await client.query(
      `
      SELECT
        l.*,
        i.item_code,
        i.name AS item_name,
        a.code AS account_code,
        a.name AS account_name
      FROM journal_entry_lines l
      LEFT JOIN items i ON i.id = l.item_id
      LEFT JOIN chart_of_accounts a
        ON a.id = l.account_id
      WHERE l.journal_id = $1
        AND l.company_id = $2
      ORDER BY
        l.line_no ASC,
        l.created_at ASC
      `,
      [journalId, companyId],
    );

    const allocationsResult = await client.query(
      `
      SELECT
        ia.id,
        ia.journal_line_id,
        ia.item_id,
        ia.warehouse_id,
        ia.warehouse_location_id AS location_id,
        wl.title AS location_name,
        ia.batch_no,
        ia.bin_code AS serial_no,
        -- ia.expiry_date,
        ia.allocated_quantity AS quantity,
        ia.unit_cost,
        ia.total_cost,
        ia.status,
        TO_CHAR(ia.expiry_date,'YYYY-MM-DD') AS expiry_date,
        TO_CHAR(ia.created_at,'YYYY-MM-DD') AS date_shipped
      FROM inventory_allocations ia
      LEFT JOIN warehouse_locations wl ON wl.id = ia.warehouse_location_id
      INNER JOIN journal_entry_lines jel ON ia.journal_line_id = jel.id
      WHERE ia.company_id = $1
        AND jel.journal_id = $2
      ORDER BY ia.created_at ASC
      `,
      [companyId, journalId],
    );

    const allocations: ItemJournalAllocationRow[] = allocationsResult.rows.map(
      (row) => ({
        id: String(row.id),
        journal_line_id: String(row.journal_line_id),
        item_id: String(row.item_id),
        warehouse_id: String(row.warehouse_id),
        location_id: row.location_id ? String(row.location_id) : null,
        batch_no: row.batch_no ? String(row.batch_no) : null,
        serial_no: row.serial_no ? String(row.serial_no) : null,
        // expiry_date: row.expiry_date ? String(row.expiry_date) : null,
        date_shipped: row.date_shipped || "",
        prod_date: "",
        expiry_date: row.expiry_date || "",

        quantity: Number(row.quantity || 0),
        unit_cost: Number(row.unit_cost || 0),
        total_cost: Number(row.total_cost || 0),
        status: String(row.status),
      }),
    );

    const allocationMap = new Map<string, ItemJournalAllocationRow[]>();

    for (const allocation of allocations) {
      const key = allocation.journal_line_id;

      if (!allocationMap.has(key)) {
        allocationMap.set(key, []);
      }

      allocationMap.get(key)!.push(allocation);
    }

    const lines = linesResult.rows.map((line) => ({
      ...line,

      allocations: allocationMap.get(String(line.id)) || [],
    }));

    return {
      journal: headerResult.rows[0],
      lines,
    };
  }

  /**
   * Create journal header.
   */
  private static async createJournalHeader(
    client: PoolClient,
    companyId: string,
    entryNo: string,
    payload: ItemJournalPayload,
  ) {
    const result = await client.query(
      `
      INSERT INTO journal_entries (
        company_id,
        entry_no,
        entry_date,
        reference,
        description,
        journal_type,
        source,
        is_posted,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'ITEM_JOURNAL',
        'ITEM_JOURNAL',
        false,
        NOW(),
        NOW()
      )
      RETURNING *
      `,
      [
        companyId,
        entryNo,
        payload.entry_date,
        payload.reference || null,
        payload.description || null,
      ],
    );

    return result.rows[0];
  }

  /**
   * Insert generic journal-entry line.
   *
   * The Item Journal transaction type is represented by
   * debit/credit direction:
   *
   * Positive Entry -> debit balancing account
   * Negative Entry -> credit balancing account
   */
  private static async insertItemJournalLine(
    client: PoolClient,
    companyId: string,
    journalId: string,
    line: ItemJournalLineInput,
    lineNo: number,
  ) {
    const isPositive = line.transaction_type === "Positive Entry";

    const debit = isPositive ? Number(line.amount || 0) : 0;

    const credit = isPositive ? 0 : Number(line.amount || 0);

    const result = await client.query(
      `
      INSERT INTO journal_entry_lines (
        company_id,
        journal_id,
        line_no,
        account_id,

        debit,
        credit,

        item_id,
        description,

        warehouse_id,
        location_id,

        quantity,
        uom,
        unit_cost,

        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,

        $5,
        $6,

        $7,
        $8,
        $9,

        $10,
        $11,

        $12,
        $13,

        NOW()
      )
      RETURNING *
      `,
      [
        companyId,
        journalId,
        lineNo,
        line.balancing_account_id,

        debit,
        credit,

        line.item_id,
        line.item_description,

        line.warehouse_id,
        line.location_id,

        Number(line.quantity || 0),
        line.uom || "Pcs",
        Number(line.cost_per_unit || 0),
      ],
    );

    return result.rows[0];
  }

  /**
   * Save stock allocations.
   *
   * IMPORTANT:
   * This only creates allocation records.
   * It does NOT change inventory balances.
   */
  private static async saveItemJournalAllocations(
    client: PoolClient,
    companyId: string,
    journalId: string,
    journalLineId: string,
    line: ItemJournalLineInput,
  ) {
    const allocations = line.allocations || [];

    for (const allocation of allocations) {
      const quantity = Number(allocation.quantity || 0);

      if (quantity <= 0) {
        continue;
      }

      const unitCost = Number(line.cost_per_unit || 0);

      const totalCost = quantity * unitCost;

      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          inbound_entry_id,
          journal_line_id,

          item_id,
          warehouse_id,
          warehouse_location_id,

          batch_no,
          bin_code,
          expiry_date,

          allocated_quantity,
          unit_cost,
          total_cost,

          status,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,

          $5,
          $6,
          $7,

          $8,
          $9,
          $10,

          $11,
          $12,
          $13,

          'ALLOCATED',
          NOW()
        )
        `,
        [
          companyId,
          null,
          null, // journalId,
          journalLineId,

          line.item_id,
          line.warehouse_id,
          allocation.location_id || line.location_id || null,

          allocation.batch_no || null,

          allocation.serial_no || null,

          allocation.expiry_date || null,

          quantity,
          unitCost,
          totalCost,
        ],
      );
    }
  }
}
