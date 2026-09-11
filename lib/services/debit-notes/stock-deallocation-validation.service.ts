// lib/services/debit-notes/stock-deallocation-validation.service.ts

import { PoolClient } from "pg";

export type StockDeAllocationValidationInput = {
  debit_note_line_id?: string;
  purchase_invoice_line_id?: string;
  purchase_order_line_id?: string;

  required_quantity: number;

  allocations: Array<{
    id?: string;
    allocated_quantity: number | string;

    batch_no?: string;
    bin_code?: string;
    location_id?: string;
  }>;
};

type DebitNoteLineValidationRow = {
  id: string;
  debit_note_id: string;
  item_id: string | null;
  warehouse_id: string | null;
  quantity: number | string | null;
  returned_quantity: number | string | null;
};

type InventoryAllocationValidationRow = {
  id: string;
  company_id: string;

  item_id: string | null;
  warehouse_id: string | null;

  purchase_order_line_id: string | null;
  purchase_invoice_line_id: string | null;
  debit_note_line_id: string | null;

  warehouse_location_id: string | null;

  batch_no: string | null;
  bin_code: string | null;
  serial_no: string | null;
  expiry_date: string | Date | null;

  allocated_quantity: number | string | null;
  unit_cost: number | string | null;
};

export class StockDeAllocationValidationService {
  static async validate(
    client: PoolClient,
    companyId: string,
    input: StockDeAllocationValidationInput,
  ) {
    const requiredQuantity = Number(input.required_quantity || 0);

    if (requiredQuantity <= 0) {
      throw new Error(
        "Required allocation quantity must be greater than zero.",
      );
    }

    if (!input.allocations?.length) {
      throw new Error("At least one stock allocation is required.");
    }

    /*
     * -------------------------------------------------------
     * 1. Validate Debit Note Line
     * -------------------------------------------------------
     */

    let debitNoteLine: DebitNoteLineValidationRow | null = null;

    if (input.debit_note_line_id) {
      const dnLineResult = await client.query<DebitNoteLineValidationRow>(
        `
        SELECT
          dnl.id,
          dnl.debit_note_id,
          dnl.item_id,
          dnl.warehouse_id,
          dnl.quantity,
          COALESCE(dnl.returned_quantity, 0) AS returned_quantity

        FROM debit_note_lines dnl

        WHERE dnl.id = $1
          AND dnl.company_id = $2
          AND COALESCE(dnl.is_deleted, false) = false

        FOR UPDATE
        `,
        [input.debit_note_line_id, companyId],
      );

      if (!dnLineResult.rows.length) {
        throw new Error("Debit Note line not found.");
      }

      debitNoteLine = dnLineResult.rows[0];

      const debitNoteQuantity = Number(debitNoteLine.quantity || 0);

      const alreadyReturned = Number(debitNoteLine.returned_quantity || 0);

      const remainingDebitNoteQuantity = debitNoteQuantity - alreadyReturned;

      if (remainingDebitNoteQuantity <= 0) {
        throw new Error(
          "This Debit Note line has no remaining quantity available for stock deallocation.",
        );
      }

      if (requiredQuantity > Number(remainingDebitNoteQuantity.toFixed(6))) {
        throw new Error(
          `Requested deallocation quantity (${requiredQuantity}) exceeds remaining Debit Note quantity (${remainingDebitNoteQuantity}).`,
        );
      }
    }

    /*
     * -------------------------------------------------------
     * 2. Validate allocation IDs
     * -------------------------------------------------------
     */

    const allocationIds = input.allocations
      .map((allocation) => allocation.id)
      .filter((id): id is string => Boolean(id));

    if (!allocationIds.length) {
      throw new Error("Allocation record IDs are required.");
    }

    /*
     * -------------------------------------------------------
     * 3. Fetch actual allocation records
     * -------------------------------------------------------
     */

    const allocationResult =
      await client.query<InventoryAllocationValidationRow>(
        `
        SELECT
          ia.id,
          ia.company_id,

          ia.item_id,
          ia.warehouse_id,

          ia.purchase_order_line_id,
          ia.purchase_invoice_line_id,
          ia.debit_note_line_id,

          ia.warehouse_location_id,

          ia.batch_no,
          ia.bin_code,
          ia.serial_no,
          ia.expiry_date,

          ia.allocated_quantity,
          ia.unit_cost

        FROM inventory_allocations ia

        WHERE ia.company_id = $1
          AND ia.id = ANY($2::uuid[])

        FOR UPDATE
        `,
        [companyId, allocationIds],
      );

    if (allocationResult.rows.length !== allocationIds.length) {
      throw new Error(
        "One or more selected inventory allocation records are invalid or no longer available.",
      );
    }

    /*
     * -------------------------------------------------------
     * 4. Validate source relationships
     * -------------------------------------------------------
     */

    for (const allocation of allocationResult.rows) {
      /*
       * Purchase Invoice validation
       */
      if (input.purchase_invoice_line_id) {
        const belongsToInvoice =
          allocation.purchase_invoice_line_id ===
          input.purchase_invoice_line_id;

        const belongsToSamePO =
          Boolean(input.purchase_order_line_id) &&
          allocation.purchase_order_line_id === input.purchase_order_line_id;

        if (!belongsToInvoice && !belongsToSamePO) {
          throw new Error(
            `Allocation ${allocation.id} does not belong to the selected Purchase Invoice line.`,
          );
        }
      }

      /*
       * Purchase Order validation
       */
      if (input.purchase_order_line_id) {
        if (
          allocation.purchase_order_line_id !== input.purchase_order_line_id
        ) {
          throw new Error(
            `Allocation ${allocation.id} does not belong to the selected Purchase Order line.`,
          );
        }
      }

      /*
       * Debit Note item validation
       */
      if (
        debitNoteLine &&
        allocation.item_id &&
        allocation.item_id !== debitNoteLine.item_id
      ) {
        throw new Error(
          `Allocation ${allocation.id} belongs to a different item.`,
        );
      }

      /*
       * Debit Note warehouse validation
       */
      if (
        debitNoteLine &&
        allocation.warehouse_id &&
        allocation.warehouse_id !== debitNoteLine.warehouse_id
      ) {
        throw new Error(
          `Allocation ${allocation.id} belongs to a different warehouse.`,
        );
      }
    }

    /*
     * -------------------------------------------------------
     * 5. Validate requested quantities
     * -------------------------------------------------------
     */

    let requestedTotal = 0;

    for (const requested of input.allocations) {
      const requestedQuantity = Number(requested.allocated_quantity || 0);

      if (requestedQuantity <= 0) {
        throw new Error(
          `Allocation ${requested.id} quantity must be greater than zero.`,
        );
      }

      const actualAllocation = allocationResult.rows.find(
        (row) => row.id === requested.id,
      );

      if (!actualAllocation) {
        throw new Error(`Allocation ${requested.id} could not be found.`);
      }

      const availableQuantity = Number(
        actualAllocation.allocated_quantity || 0,
      );

      if (requestedQuantity > Number(availableQuantity.toFixed(6))) {
        throw new Error(
          `Requested quantity (${requestedQuantity}) exceeds available allocation quantity (${availableQuantity}) for allocation ${requested.id}.`,
        );
      }

      requestedTotal += requestedQuantity;
    }

    /*
     * -------------------------------------------------------
     * 6. Validate total quantity
     * -------------------------------------------------------
     */

    requestedTotal = Number(requestedTotal.toFixed(6));

    const normalizedRequired = Number(requiredQuantity.toFixed(6));

    if (requestedTotal !== normalizedRequired) {
      throw new Error(
        `Allocation total (${requestedTotal}) must equal required quantity (${normalizedRequired}).`,
      );
    }

    /*
     * -------------------------------------------------------
     * 7. Return trusted server-side data
     * -------------------------------------------------------
     */

    return {
      valid: true,

      requiredQuantity: normalizedRequired,

      allocatedQuantity: requestedTotal,

      remainingQuantity: Number(
        (normalizedRequired - requestedTotal).toFixed(6),
      ),

      allocations: allocationResult.rows,
    };
  }
}
