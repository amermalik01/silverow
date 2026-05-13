// lib/services/inventory/inventory-reservation.service.ts

import { PoolClient } from "pg";

export class InventoryReservationService {
  /**
   * =========================================================
   * CREATE RESERVATION
   * =========================================================
   */
  static async create(
    client: PoolClient,
    data: {
      company_id: string;

      item_id: string;

      warehouse_id: string;

      location_id?: string | null;

      quantity: number;

      reference_type: string;

      reference_id: string;

      line_reference_id?: string | null;

      notes?: string | null;
    },
  ) {
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
        quantity,
        reserved_quantity,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      `,
      [
        data.company_id,
        data.item_id,
        data.warehouse_id,
        data.location_id || null,
        data.reference_type,
        data.reference_id,
        data.line_reference_id || null,
        data.quantity,
        data.quantity,
        data.notes || null,
      ],
    );
  }

  /**
   * =========================================================
   * CONSUME RESERVATION
   * =========================================================
   */
  static async consume(
    client: PoolClient,
    reservationId: string,
    quantity: number,
  ) {
    const res = await client.query(
      `
      SELECT *
      FROM inventory_reservations
      WHERE id = $1
      `,
      [reservationId],
    );

    if (!res.rows.length) {
      throw new Error("Reservation not found");
    }

    const row = res.rows[0];

    const consumed = Number(row.consumed_quantity || 0) + Number(quantity);

    const remaining = Number(row.reserved_quantity || 0) - consumed;

    let status = "PARTIAL";

    if (remaining <= 0) {
      status = "CONSUMED";
    }

    await client.query(
      `
      UPDATE inventory_reservations
      SET
        consumed_quantity = $1,
        status = $2,
        updated_at = now()
      WHERE id = $3
      `,
      [consumed, status, reservationId],
    );
  }

  /**
   * =========================================================
   * CANCEL
   * =========================================================
   */
  static async cancel(client: PoolClient, reservationId: string) {
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
}
