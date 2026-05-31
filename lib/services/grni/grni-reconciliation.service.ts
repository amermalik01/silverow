// lib/services/grni/grni-reconciliation.service.ts

import { pool } from "@/lib/db";

export class GRNIReconciliationService {
  //  * =========================================================
  //  * GET GRNI BALANCE BY ITEM
  //  * =========================================================

  static async getGRNIBalance(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        pol.item_id,
        SUM(pol.quantity * pol.unit_cost) AS received_value,

        COALESCE((
          SELECT SUM(pil.quantity * pil.unit_cost)
          FROM purchase_invoice_lines pil
          WHERE pil.item_id = pol.item_id
        ),0) AS invoiced_value

      FROM purchase_order_lines pol

      WHERE pol.company_id = $1

      GROUP BY pol.item_id
      `,
      [companyId],
    );

    return result.rows;
  }
}

export class GRNISummaryService {
  static async getOutstandingGRNI(companyId: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM grni_summary_view
      WHERE company_id = $1
      `,
      [companyId],
    );

    return result.rows;
  }
}
