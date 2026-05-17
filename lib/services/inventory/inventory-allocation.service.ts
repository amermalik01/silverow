//  lib/services/inventory/inventory-allocation.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";

export type InventoryReservationStatus =
  | "OPEN"
  | "PARTIAL"
  | "ALLOCATED"
  | "CONSUMED"
  | "CANCELLED";

export type InventoryReferenceType =
  | "PURCHASE_ORDER"
  | "SALES_ORDER"
  | "TRANSFER_ORDER"
  | "PRODUCTION_ORDER";

export class InventoryAllocationService {
  /**
   * =========================================================
   * CREATE INVENTORY RESERVATION
   * =========================================================
   */
  static async createReservation(
    client: PoolClient,
    params: {
      companyId: string;

      itemId: string;

      warehouseId: string;

      quantity: number;

      referenceType: InventoryReferenceType;

      referenceId: string;

      lineReferenceId?: string;

      locationId?: string | null;
    },
  ): Promise<void> {
    /**
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */
    if (params.quantity <= 0) {
      throw new Error("Reservation quantity must be greater than zero");
    }

    /**
     * -------------------------------------------------------
     * LOAD INVENTORY STOCK
     * -------------------------------------------------------
     */
    const stockResult = await client.query<{
      quantity_on_hand: string | number | null;

      reserved_quantity: string | number | null;
    }>(
      `
      SELECT
        quantity_on_hand,
        reserved_quantity
      FROM inventory_stock
      WHERE company_id = $1
      AND item_id = $2
      AND warehouse_id = $3
      LIMIT 1
      `,
      [params.companyId, params.itemId, params.warehouseId],
    );

    const stock = stockResult.rows[0];

    const quantityOnHand = Number(stock?.quantity_on_hand || 0);

    const reservedQuantity = Number(stock?.reserved_quantity || 0);

    const availableQuantity = quantityOnHand - reservedQuantity;

    /**
     * -------------------------------------------------------
     * DETERMINE RESERVATION STATUS
     * -------------------------------------------------------
     */
    let status: InventoryReservationStatus = "OPEN";

    if (availableQuantity >= params.quantity) {
      status = "ALLOCATED";
    } else if (availableQuantity > 0) {
      status = "PARTIAL";
    }

    /**
     * -------------------------------------------------------
     * INSERT RESERVATION
     * -------------------------------------------------------
     */
    await client.query(
      `
      INSERT INTO inventory_reservations (
        company_id,
        item_id,
        warehouse_id,
        location_id,

        reference_type,
        reference_id,
        line_reference_id,

        reserved_quantity,
        allocated_quantity,

        status
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,
        $10
      )
      `,
      [
        params.companyId,
        params.itemId,
        params.warehouseId,
        params.locationId || null,

        params.referenceType,
        params.referenceId,
        params.lineReferenceId || null,

        params.quantity,

        Math.min(
          availableQuantity > 0 ? availableQuantity : 0,
          params.quantity,
        ),

        status,
      ],
    );

    /**
     * -------------------------------------------------------
     * UPDATE INVENTORY STOCK RESERVATION
     * -------------------------------------------------------
     */
    await client.query(
      `
      INSERT INTO inventory_stock (
        company_id,
        item_id,
        warehouse_id,
        quantity_on_hand,
        reserved_quantity
      )
      VALUES (
        $1,$2,$3,
        0,
        $4
      )

      ON CONFLICT (
        company_id,
        item_id,
        warehouse_id
      )

      DO UPDATE SET
        reserved_quantity =
          inventory_stock.reserved_quantity + EXCLUDED.reserved_quantity,
        updated_at = now()
      `,
      [params.companyId, params.itemId, params.warehouseId, params.quantity],
    );
  }

  /**
   * =========================================================
   * RELEASE RESERVATION
   * =========================================================
   */
  static async releaseReservation(
    client: PoolClient,
    reservationId: string,
  ): Promise<void> {
    /**
     * -------------------------------------------------------
     * LOAD RESERVATION
     * -------------------------------------------------------
     */
    const reservationResult = await client.query<{
      id: string;

      company_id: string;

      item_id: string;

      warehouse_id: string;

      reserved_quantity: string | number;

      status: InventoryReservationStatus;
    }>(
      `
      SELECT *
      FROM inventory_reservations
      WHERE id = $1
      `,
      [reservationId],
    );

    if (!reservationResult.rows.length) {
      throw new Error("Reservation not found");
    }

    const reservation = reservationResult.rows[0];

    /**
     * -------------------------------------------------------
     * ALREADY CANCELLED
     * -------------------------------------------------------
     */
    if (reservation.status === "CANCELLED") {
      return;
    }

    const quantity = Number(reservation.reserved_quantity || 0);

    /**
     * -------------------------------------------------------
     * RELEASE INVENTORY STOCK
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_stock
      SET
        reserved_quantity =
          GREATEST(
            0,
            COALESCE(reserved_quantity,0) - $1
          ),

        updated_at = now()

      WHERE company_id = $2
      AND item_id = $3
      AND warehouse_id = $4
      `,
      [
        quantity,
        reservation.company_id,
        reservation.item_id,
        reservation.warehouse_id,
      ],
    );

    /**
     * -------------------------------------------------------
     * CLOSE RESERVATION
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_reservations
      SET
        status = 'CANCELLED',
        updated_at = now()
      WHERE id = $1
      `,
      [reservationId],
    );
  }

  /**
   * =========================================================
   * CONSUME RESERVATION
   * =========================================================
   * Used during shipment / dispatch posting
   * =========================================================
   */
  static async consumeReservation(
    client: PoolClient,
    reservationId: string,
    quantity: number,
  ): Promise<void> {
    /**
     * -------------------------------------------------------
     * LOAD RESERVATION
     * -------------------------------------------------------
     */
    const reservationResult = await client.query<{
      reserved_quantity: string | number;

      allocated_quantity: string | number;

      consumed_quantity: string | number;

      status: InventoryReservationStatus;
    }>(
      `
      SELECT *
      FROM inventory_reservations
      WHERE id = $1
      `,
      [reservationId],
    );

    if (!reservationResult.rows.length) {
      throw new Error("Reservation not found");
    }

    const reservation = reservationResult.rows[0];

    if (reservation.status === "CANCELLED") {
      throw new Error("Cancelled reservation cannot be consumed");
    }

    const reservedQty = Number(reservation.reserved_quantity || 0);

    const consumedQty = Number(reservation.consumed_quantity || 0);

    const newConsumed = consumedQty + quantity;

    if (newConsumed > reservedQty) {
      throw new Error("Consumption exceeds reserved quantity");
    }

    let status: InventoryReservationStatus = "PARTIAL";

    if (newConsumed >= reservedQty) {
      status = "CONSUMED";
    }

    /**
     * -------------------------------------------------------
     * UPDATE RESERVATION
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_reservations
      SET
        consumed_quantity = $1,
        status = $2,
        updated_at = now()
      WHERE id = $3
      `,
      [newConsumed, status, reservationId],
    );
  }

  /**
   * =========================================================
   * RELEASE ALL BY DOCUMENT
   * =========================================================
   */
  static async releaseByReference(
    client: PoolClient,
    referenceType: InventoryReferenceType,
    referenceId: string,
  ): Promise<void> {
    const reservationsResult = await client.query<{
      id: string;
    }>(
      `
      SELECT id
      FROM inventory_reservations
      WHERE reference_type = $1
      AND reference_id = $2
      AND status != 'CANCELLED'
      `,
      [referenceType, referenceId],
    );

    for (const row of reservationsResult.rows) {
      await this.releaseReservation(client, row.id);
    }
  }

  /**
   * =========================================================
   * BACKWARD COMPATIBILITY
   * =========================================================
   */
  static async releaseBySource(
    client: PoolClient,
    sourceType: InventoryReferenceType,
    sourceId: string,
  ): Promise<void> {
    await this.releaseByReference(client, sourceType, sourceId);
  }

  /**
   * =========================================================
   * AUTO RESERVE SALES ORDER STOCK
   * =========================================================
   */
  static async reserveSalesOrderStock(
    client: PoolClient,
    params: {
      companyId: string;

      salesOrderId: string;

      salesOrderLineId: string;

      itemId: string;

      warehouseId: string;

      quantity: number;
    },
  ): Promise<void> {
    await this.createReservation(client, {
      companyId: params.companyId,

      itemId: params.itemId,

      warehouseId: params.warehouseId,

      quantity: params.quantity,

      referenceType: "SALES_ORDER",

      referenceId: params.salesOrderId,

      lineReferenceId: params.salesOrderLineId,
    });

    /**
     * -------------------------------------------------------
     * UPDATE SALES ORDER LINE
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_order_lines
      SET
        reserved_quantity =
          COALESCE(reserved_quantity,0) + $1
      WHERE id = $2
      `,
      [params.quantity, params.salesOrderLineId],
    );
  }

  /**
   * =========================================================
   * BACKWARD COMPATIBILITY
   * =========================================================
   */
  static async allocate(params: {
    client: PoolClient;

    company_id: string;

    source_type: InventoryReferenceType;

    source_id: string;

    source_line_id?: string;

    warehouse_id: string;

    item_id: string;

    quantity: number;
  }): Promise<void> {
    const {
      client,
      company_id,
      source_type,
      source_id,
      source_line_id,
      warehouse_id,
      item_id,
      quantity,
    } = params;

    await this.createReservation(client, {
      companyId: company_id,

      itemId: item_id,

      warehouseId: warehouse_id,

      quantity,

      referenceType: source_type,

      referenceId: source_id,

      lineReferenceId: source_line_id,
    });
  }

  /**
   * =========================================================
   * RELEASE SALES ORDER RESERVATION
   * =========================================================
   */
  static async releaseSalesOrderReservation(
    client: PoolClient,
    salesOrderLineId: string,
  ): Promise<void> {
    const reservationResult = await client.query<{
      id: string;
    }>(
      `
      SELECT id
      FROM inventory_reservations
      WHERE line_reference_id = $1
      AND reference_type = 'SALES_ORDER'
      AND status != 'CANCELLED'
      `,
      [salesOrderLineId],
    );

    for (const reservation of reservationResult.rows) {
      await this.releaseReservation(client, reservation.id);
    }

    /**
     * -------------------------------------------------------
     * RESET RESERVED QUANTITY
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_order_lines
      SET
        reserved_quantity = 0
      WHERE id = $1
      `,
      [salesOrderLineId],
    );
  }

  /**
   * RESERVE STOCK FOR PURCHASE ORDER
   */
  static async reservePOStock(
    companyId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    poLineId: string,
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // insert reservation entry (soft allocation)

      await client.query(
        `
            INSERT INTO inventory_reservations (
            company_id,
            item_id,
            warehouse_id,
            location_id,
            reference_type,
            reference_id,
            line_reference_id,
            reserved_quantity,
            status
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'OPEN')
        `,
        [
          companyId,
          itemId,
          warehouseId,
          null,
          "PURCHASE_ORDER",
          poLineId,
          poLineId,
          quantity,
        ],
      );
      //   await client.query(
      //     `
      //     INSERT INTO inventory_reservations (
      //       company_id,
      //       item_id,
      //       warehouse_id,
      //       quantity,
      //       reference_type,
      //       reference_id
      //     )
      //     VALUES ($1,$2,$3,$4,'PURCHASE_ORDER',$5)
      //     `,
      //     [companyId, itemId, warehouseId, quantity, poLineId],
      //   );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
