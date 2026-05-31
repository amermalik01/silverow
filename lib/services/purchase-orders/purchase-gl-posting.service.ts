// lib/services/purchase-orders/purchase-gl-posting.service.ts
import { PoolClient } from "pg";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
export class PurchaseGLPostingService {
  //  * =========================================================
  //  * POST PURCHASE RECEIPT
  //  * =========================================================

  static async postPurchaseReceipt(
    client: PoolClient,
    companyId: string,
    receiptId: string,
    userId?: string,
  ): Promise<void> {
    const receiptResult = await client.query(
      `
      SELECT *
      FROM purchase_receipts
      WHERE id = $1
      `,
      [receiptId],
    );

    if (!receiptResult.rows.length) {
      throw new Error("Purchase receipt not found");
    }

    const receipt = receiptResult.rows[0];

    const linesResult = await client.query(
      `
      SELECT
        prl.*,

        pol.purchase_order_id,
        pol.line_type,
        pol.unit_cost,

        i.inventory_posting_group_id,

        ppg.inventory_account_id,
        ppg.grni_account_id

      FROM purchase_receipt_lines prl

      INNER JOIN purchase_order_lines pol
        ON pol.id = prl.purchase_order_line_id

      INNER JOIN items i
        ON i.id = prl.item_id

      INNER JOIN inventory_posting_groups ipg
        ON ipg.id = i.inventory_posting_group_id

      INNER JOIN purchase_posting_groups ppg
        ON ppg.company_id = pol.company_id

      WHERE prl.purchase_receipt_id = $1
      `,
      [receiptId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No receipt lines found");
    }

    const glLines = [];

    for (const line of lines) {
      if (line.line_type !== "ITEM") {
        continue;
      }

      const amount = Number(line.quantity) * Number(line.unit_cost || 0);

      // DR INVENTORY

      glLines.push({
        account_id: line.inventory_account_id,
        debit: amount,
        credit: 0,
        item_id: line.item_id,
        warehouse_id: receipt.warehouse_id,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        description: "Purchase receipt inventory",
        reference_type: "PURCHASE_RECEIPT",
        reference_id: receipt.id,
      });

      // CR GRNI

      glLines.push({
        account_id: line.grni_account_id,
        debit: 0,
        credit: amount,
        item_id: line.item_id,
        warehouse_id: receipt.warehouse_id,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        description: "Goods received not invoiced",
        reference_type: "PURCHASE_RECEIPT",
        reference_id: receipt.id,
      });
    }

    //  * -------------------------------------------------------
    //  * POST GL
    //  * -------------------------------------------------------

    await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: receipt.receipt_date,
      source: "PURCHASE",
      journal_type: "PURCHASE_RECEIPT",
      reference: receipt.receipt_no,
      source_id: receipt.id,
      description: "Purchase receipt posting",
      created_by: userId || null,
      lines: glLines,
    });
  }
}
