// lib/services/grni/grni-clearing.service.ts

import { PoolClient } from "pg";
import { JournalLineInput } from "@/types/journal";
type GRNIStatus = "OPEN" | "PARTIAL" | "CLEARED";

export class GRNIClearingService {
  //  * =========================================================
  //  * BUILD GRNI CLEARING LINES
  //  * =========================================================

  static async buildLines(
    client: PoolClient,
    invoiceId: string,
  ): Promise<JournalLineInput[]> {
    //  LOAD INVOICE LINES

    const result = await client.query(
      `
      SELECT
        pil.id,
        pil.item_id,
        pil.quantity,
        pil.unit_cost,
        pil.purchase_receipt_line_id,

        ppg.grni_account_id

      FROM purchase_invoice_lines pil

      INNER JOIN items i
        ON i.id = pil.item_id

      INNER JOIN purchase_posting_groups ppg
        ON ppg.id = i.purchase_posting_group_id

      WHERE pil.purchase_invoice_id = $1
      `,
      [invoiceId],
    );

    if (!result.rows.length) {
      throw new Error("No invoice lines found");
    }

    const lines: JournalLineInput[] = [];

    for (const row of result.rows) {
      const amount = Number(row.quantity || 0) * Number(row.unit_cost || 0);

      const grniResult = await client.query(
        `
        SELECT *
        FROM grni_entries
        WHERE purchase_receipt_line_id = $1
        `,
        [row.purchase_receipt_line_id],
      );

      if (!grniResult.rows.length) {
        throw new Error(
          `GRNI entry not found for receipt line ${row.purchase_receipt_line_id}`,
        );
      }

      const grni = grniResult.rows[0];

      const alreadyCleared = Number(grni.cleared_amount || 0);

      const remainingGRNI = Number(grni.amount || 0) - alreadyCleared;

      if (amount > remainingGRNI) {
        throw new Error(`Invoice exceeds GRNI balance for item ${row.item_id}`);
      }

      const newCleared = alreadyCleared + amount;

      const remaining = Number(grni.amount || 0) - newCleared;

      let status: GRNIStatus = "PARTIAL";

      if (remaining <= 0) {
        status = "CLEARED";
      }

      await client.query(
        `
        UPDATE grni_entries
        SET
          cleared_amount = $1,
          status = $2
        WHERE id = $3
        `,
        [newCleared, status, grni.id],
      );

      lines.push({
        account_id: row.grni_account_id,
        debit: amount,
        credit: 0,
        item_id: row.item_id,
        quantity: Number(row.quantity),
        unit_cost: Number(row.unit_cost),
        reference_type: "PURCHASE_INVOICE",
        reference_id: invoiceId,
      });
    }

    return lines;
  }
}
