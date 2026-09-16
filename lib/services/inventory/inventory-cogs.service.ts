// lib/services/inventory/inventory-cogs.service.ts

import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";

export class InventoryCOGSService {
  /**
   * =========================================================
   * POST COGS FOR SHIPMENT
   * =========================================================
   */
  static async postCOGS(
    client: PoolClient,
    companyId: string,
    shipmentId: string,
    userId?: string,
  ): Promise<void> {
    /**
     * -----------------------------------------------------
     * LOAD SHIPMENT
     * -----------------------------------------------------
     */
    const shipmentResult = await client.query(
      `
      SELECT *
      FROM inventory_shipments
      WHERE id = $1
      `,
      [shipmentId],
    );

    if (!shipmentResult.rows.length) {
      throw new Error("Shipment not found");
    }

    const shipment = shipmentResult.rows[0];

    /**
     * -----------------------------------------------------
     * LOAD SHIPMENT LINES
     * -----------------------------------------------------
     */
    const linesResult = await client.query(
      `
      SELECT *
      FROM inventory_shipment_lines
      WHERE shipment_id = $1
      `,
      [shipmentId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No shipment lines found");
    }

    /**
     * -----------------------------------------------------
     * BUILD GL LINES
     * -----------------------------------------------------
     */
    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      /**
       * GET ITEM ACCOUNTS
       */
      const accounts = await AccountResolutionService.resolveSalesAccounts(
        client,
        companyId,
        line.item_id,
      );

      const cost = Number(line.quantity) * Number(line.unit_cost || 0);

      /**
       * -----------------------------------------------------
       * DR: COGS EXPENSE
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.cogs_account_id,

        debit: cost,

        credit: 0,

        item_id: line.item_id,

        warehouse_id: shipment.warehouse_id,

        quantity: line.quantity,

        unit_cost: line.unit_cost,

        reference_type: "SHIPMENT",

        reference_id: shipment.id,
      });

      /**
       * -----------------------------------------------------
       * CR: INVENTORY REDUCTION
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.inventory_account_id,

        debit: 0,

        credit: cost,

        item_id: line.item_id,

        warehouse_id: shipment.warehouse_id,

        quantity: line.quantity,

        unit_cost: line.unit_cost,

        reference_type: "SHIPMENT",

        reference_id: shipment.id,
      });
    }

    /**
     * -----------------------------------------------------
     * VALIDATE
     * -----------------------------------------------------
     */
    GLValidationService.validateBalanced(glLines);

    /**
     * -----------------------------------------------------
     * POST TO GL
     * -----------------------------------------------------
     */
    await GLPostingService.postJournal(client, {
      company_id: companyId,

      entry_date: shipment.shipment_date,

      source: "INVENTORY",

      journal_type: "COGS_POSTING",

      reference: shipment.shipment_no,

      source_id: shipment.id,

      description: "Inventory COGS posting",

      created_by: userId || null,

      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * MARK POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_shipments
      SET is_posted = true,
          posted_at = now()
      WHERE id = $1
      `,
      [shipmentId],
    );
  }
}
