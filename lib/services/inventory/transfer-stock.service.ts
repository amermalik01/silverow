// app/services/inventory/transfer-stock.service.ts

import { pool } from "@/lib/db";
import { InventoryAllocationEngineService } from "./inventory-allocation-engine.service";
import {
  InventoryMovementService,
  PostInventoryTransactionInput,
} from "./inventory-movement.service";
import { InventoryAllocationService } from "./inventory-allocation.service";

type InventoryMovementLineInput = {
  item_id: string;
  warehouse_id: string;
  location_id?: string | null;
  uom_id?: string | null;
  quantity: number;
  unit_cost?: number;
  movement_direction: "IN" | "OUT";
  batch_no?: string | null;
  serial_no?: string | null;
  expiry_date?: string | null;
};

export interface CreateTransferDTO {
  transferNo?: string;
  transferDate: string | Date;
  warehouseFromId: string;
  warehouseToId: string;
  inTransitCode: string;
  poNo?: string;
  shippingAgent?: string;
  shippingCharge?: number;
  lines: Array<{
    itemId: string;
    itemCode: string;
    qty: number;
    uom: string;
    fromLocationId: string;
    toLocationId: string;
  }>;
}

export interface TransferListFilterOptions {
  status: "all" | "posted" | "unposted";
  page: number;
  limit: number;
}

export interface TransferHeaderRow {
  id: string;
  transfer_no: string;
  transfer_date: string | Date;
  warehouse_from_id: string;
  warehouse_to_id: string;
  in_transit_code: string | null;
  shipping_charge: number | string;
  is_posted: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  posted_at?: string | Date | null;
}

export interface PaginatedTransfersResult {
  rows: TransferHeaderRow[];
  pagination: {
    totalRows: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TransferStockService {
  /**
   * Fetch paginated list records with conditional criteria filters
   */
  static async getPaginatedTransfers(
    companyId: string,
    options: TransferListFilterOptions,
  ): Promise<PaginatedTransfersResult> {
    const { status, page, limit } = options;
    const offset = (page - 1) * limit;

    const queryParams: (string | number | boolean)[] = [companyId];
    let whereClause = `WHERE h.company_id = $1`;

    // Append relational filter state flags dynamically
    if (status === "posted") {
      whereClause += ` AND h.is_posted = true`;
    } else if (status === "unposted") {
      whereClause += ` AND h.is_posted = false`;
    }

    // Calculate baseline total row limits matching criteria parameters
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM public.transfer_headers h
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRows = parseInt(countResult.rows[0]?.total || "0", 10);

    // Fetch primary line values utilizing sorting structures
    const dataArgs = [...queryParams, limit, offset];
    const dataQuery = `
      SELECT 
        h.id,
        h.transfer_no,
        h.transfer_date,
        h.warehouse_from_id,
        h.warehouse_to_id,
        h.in_transit_code,
        h.shipping_charge,
        h.is_posted
      FROM public.transfer_headers h
      ${whereClause}
      ORDER BY h.transfer_date DESC, h.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataResult = await pool.query(dataQuery, dataArgs);
    const totalPages = Math.ceil(totalRows / limit) || 1;

    return {
      rows: dataResult.rows,
      pagination: {
        totalRows,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getTransferById(companyId: string, id: string) {
    const headerResult = await pool.query(
      `SELECT * FROM public.transfer_headers WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!headerResult.rows.length) return null;

    const linesResult = await pool.query(
      `SELECT * FROM public.transfer_lines WHERE transfer_id = $1 ORDER BY id ASC`,
      [id],
    );

    return {
      transfer: headerResult.rows[0],
      lines: linesResult.rows,
    };
  }

  /**
   * Phase 1: Create a simple Draft Transfer document (Unposted)
   */
  static async createDraftTransfer(companyId: string, data: CreateTransferDTO) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const seqResult = await client.query(
        `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
        [companyId, "transfer_stock"],
      );
      const sequenceCode = data.transferNo || seqResult.rows[0].sequence_code;

      const headerResult = await client.query(
        `
        INSERT INTO public.transfer_headers (
          company_id, transfer_no, transfer_date, warehouse_from_id, 
          warehouse_to_id, in_transit_code, po_no, shipping_agent, 
          shipping_charge, is_posted
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
        RETURNING *
        `,
        [
          companyId,
          sequenceCode,
          data.transferDate,
          data.warehouseFromId,
          data.warehouseToId,
          data.inTransitCode,
          data.poNo || null,
          data.shippingAgent || null,
          data.shippingCharge || 0,
        ],
      );
      const header = headerResult.rows[0];

      for (const line of data.lines) {
        await client.query(
          `
          INSERT INTO public.transfer_lines (
            company_id, transfer_id, item_id, item_code, qty, uom, from_location_id, to_location_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            companyId,
            header.id,
            line.itemId,
            line.itemCode,
            line.qty,
            line.uom,
            line.fromLocationId,
            line.toLocationId,
          ],
        );
      }

      await client.query("COMMIT");
      return header;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Phase 2: Execute Posting Transaction (Locks layers and moves actual stock)
   */
  static async postTransfer(companyId: string, id: string, userId?: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check current state row using pessimistic locking
      const transferCheck = await client.query(
        `SELECT * FROM public.transfer_headers WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      const transfer = transferCheck.rows[0];

      if (!transfer) throw new Error("Transfer document record not found.");
      if (transfer.is_posted)
        throw new Error("This stock transfer order has already been posted.");

      const linesResult = await client.query(
        `SELECT * FROM public.transfer_lines WHERE transfer_id = $1`,
        [id],
      );

      const movementLines: InventoryMovementLineInput[] = [];

      for (const line of linesResult.rows) {
        // Reserve inventory temporarily
        await InventoryAllocationService.createReservation(client, {
          companyId,
          itemId: line.item_id,
          warehouseId: transfer.warehouse_from_id,
          locationId: line.from_location_id,
          quantity: Number(line.qty),
          referenceType: "TRANSFER_ORDER",
          referenceId: transfer.id,
          lineReferenceId: line.id,
        });

        // Pull active stock layers matching remaining quantities via FIFO/FEFO
        const engineAllocations =
          await InventoryAllocationEngineService.allocate(
            client,
            companyId,
            line.item_id,
            transfer.warehouse_from_id,
            Number(line.qty),
            transfer.id,
            line.id,
            "FIFO",
          );

        for (const allocation of engineAllocations) {
          movementLines.push({
            item_id: line.item_id,
            warehouse_id: transfer.warehouse_from_id,
            location_id: line.from_location_id,
            uom_id: line.uom || null,
            quantity: allocation.quantity,
            unit_cost: allocation.unit_cost,
            movement_direction: "OUT",
            batch_no: allocation.batch_no,
            serial_no: allocation.batch_no,
            expiry_date: allocation.expiry_date,
          });

          movementLines.push({
            item_id: line.item_id,
            warehouse_id: transfer.warehouse_to_id,
            location_id: line.to_location_id,
            uom_id: line.uom || null,
            quantity: allocation.quantity,
            unit_cost: allocation.unit_cost,
            movement_direction: "IN",
            batch_no: allocation.batch_no,
            serial_no: allocation.batch_no,
            expiry_date: allocation.expiry_date,
          });
        }
      }

      // Finalize ledger updates inside the transaction ecosystem wrapper
      const movementPayload: PostInventoryTransactionInput = {
        company_id: companyId,
        transaction_type: "TRANSFER",
        posting_date: new Date(transfer.transfer_date)
          .toISOString()
          .split("T")[0],
        reference_type: "TRANSFER_ORDER",
        reference_id: transfer.id,
        created_by: userId || null,
        lines: movementLines,
      };

      await InventoryMovementService.postTransaction(client, movementPayload);

      // Free reservations and flip posted flags permanently
      await InventoryAllocationService.releaseByReference(
        client,
        "TRANSFER_ORDER",
        transfer.id,
      );

      await client.query(
        `UPDATE public.transfer_headers SET is_posted = true, posted_at = now(), updated_at = now() WHERE id = $1`,
        [id],
      );

      await client.query("COMMIT");
      return { id, transfer_no: transfer.transfer_no, status: "POSTED" };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Add this inside the TransferStockService class in app/services/inventory/transfer-stock.service.ts

  /**
   * Phase 1.5: Update an existing Unposted Draft Transfer document and overwrite lines cleanly
   */
  static async updateDraftTransfer(
    companyId: string,
    id: string,
    data: CreateTransferDTO,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Pessimistically check validation permissions on target header draft row
      const checkResult = await client.query(
        `SELECT is_posted FROM public.transfer_headers WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );

      if (!checkResult.rows.length) {
        throw new Error("Target transfer order document was not found.");
      }
      if (checkResult.rows[0].is_posted) {
        throw new Error(
          "Cannot modify this transfer order because it has already been locked and posted.",
        );
      }

      // 2. Update Header configurations
      const headerUpdateQuery = `
      UPDATE public.transfer_headers
      SET 
        transfer_date = $1,
        warehouse_from_id = $2,
        warehouse_to_id = $3,
        in_transit_code = $4,
        po_no = $5,
        shipping_agent = $6,
        shipping_charge = $7,
        updated_at = NOW()
      WHERE id = $8 AND company_id = $9
      RETURNING *
    `;
      const headerResult = await client.query(headerUpdateQuery, [
        data.transferDate,
        data.warehouseFromId,
        data.warehouseToId,
        data.inTransitCode,
        data.poNo || null,
        data.shippingAgent || null,
        data.shippingCharge || 0,
        id,
        companyId,
      ]);

      // 3. Atomically drop the old stale line items before re-mapping
      await client.query(
        `DELETE FROM public.transfer_lines WHERE transfer_id = $1 AND company_id = $2`,
        [id, companyId],
      );

      // 4. Batch append the fresh modified form array configurations
      for (const line of data.lines) {
        await client.query(
          `
        INSERT INTO public.transfer_lines (
          company_id, transfer_id, item_id, item_code, qty, uom, from_location_id, to_location_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            companyId,
            id,
            line.itemId,
            line.itemCode,
            line.qty,
            line.uom,
            line.fromLocationId,
            line.toLocationId,
          ],
        );
      }

      await client.query("COMMIT");
      return headerResult.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
