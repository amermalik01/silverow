// lib/services/payments/payment.service.ts
import { PoolClient } from "pg";
import { pool } from "@/lib/db";

import { JournalService } from "@/lib/services/journal.service";
import { JournalLineInput } from "@/types/journal";

export type PaymentType = "AP" | "AR";

export interface PaymentLine {
  invoice_id: string;
  amount: number;
}

export interface PaymentPayload {
  payment_date: string;
  payment_type: PaymentType;

  party_id: string;
  bank_account_id: string;

  currency_id?: string;
  reference?: string;
  description?: string;

  lines: PaymentLine[];
}

export class PaymentService {
  /**
   * =========================================================
   * CREATE PAYMENT
   * =========================================================
   */
  static async create(companyId: string, payload: PaymentPayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /**
       * -----------------------------------------------------
       * CREATE PAYMENT HEADER
       * -----------------------------------------------------
       */
      const paymentResult = await client.query(
        `
        INSERT INTO payments (
          company_id,
          payment_date,
          payment_type,
          party_id,
          bank_account_id,
          currency_id,
          reference,
          description
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          companyId,
          payload.payment_date,
          payload.payment_type,
          payload.party_id,
          payload.bank_account_id,
          payload.currency_id || null,
          payload.reference || null,
          payload.description || null,
        ],
      );

      const payment = paymentResult.rows[0];

      /**
       * -----------------------------------------------------
       * BUILD JOURNAL LINES
       * -----------------------------------------------------
       */
      const journalLines: JournalLineInput[] = [];

      let total = 0;

      const bankAccountId = await this.getBankAccount(
        client,
        payload.bank_account_id,
      );

      const controlAccount =
        payload.payment_type === "AP"
          ? await this.getAPAccount(client, companyId)
          : await this.getARAccount(client, companyId);

      for (const line of payload.lines) {
        total += line.amount;

        /**
         * CORE POSTING PER INVOICE LINE
         */
        if (payload.payment_type === "AP") {
          // DR AP (reduce liability)
          journalLines.push({
            account_id: controlAccount,
            debit: line.amount,
            credit: 0,
            reference_type: "AP_PAYMENT",
            reference_id: payment.id,
            item_id: line.invoice_id,
          });

          // CR BANK
          journalLines.push({
            account_id: bankAccountId,
            debit: 0,
            credit: line.amount,
            reference_type: "AP_PAYMENT",
            reference_id: payment.id,
          });
        } else {
          // DR BANK
          journalLines.push({
            account_id: bankAccountId,
            debit: line.amount,
            credit: 0,
            reference_type: "AR_PAYMENT",
            reference_id: payment.id,
          });

          // CR AR
          journalLines.push({
            account_id: controlAccount,
            debit: 0,
            credit: line.amount,
            reference_type: "AR_PAYMENT",
            reference_id: payment.id,
            item_id: line.invoice_id,
          });
        }
      }

      /**
       * -----------------------------------------------------
       * POST JOURNAL (FIXED)
       * -----------------------------------------------------
       */
      const journal = await JournalService.create(companyId, {
        entry_date: payload.payment_date,
        source: payload.payment_type === "AP" ? "PAYMENT" : "RECEIPT",
        reference: payment.id,
        description: payload.description,
        lines: journalLines,
      });

      /**
       * -----------------------------------------------------
       * LINK JOURNAL TO PAYMENT
       * -----------------------------------------------------
       */
      await client.query(
        `
        UPDATE payments
        SET is_posted = true,
            posted_at = now(),
            journal_id = $1
        WHERE id = $2
        `,
        [journal.id, payment.id],
      );

      await client.query("COMMIT");

      return payment;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * =========================================================
   * ACCOUNT RESOLVERS
   * =========================================================
   */

  private static async getAPAccount(client: PoolClient, companyId: string) {
    const res = await client.query(
      `
      SELECT payable_account_id
      FROM purchase_posting_groups
      WHERE company_id = $1
      LIMIT 1
      `,
      [companyId],
    );

    return res.rows[0]?.payable_account_id;
  }

  private static async getARAccount(client: PoolClient, companyId: string) {
    const res = await client.query(
      `
      SELECT receivable_account_id
      FROM sales_posting_groups
      WHERE company_id = $1
      LIMIT 1
      `,
      [companyId],
    );

    return res.rows[0]?.receivable_account_id;
  }

  private static async getBankAccount(
    client: PoolClient,
    bankAccountId: string,
  ) {
    const res = await client.query(
      `
      SELECT account_id
      FROM bank_accounts
      WHERE id = $1
      `,
      [bankAccountId],
    );

    return res.rows[0]?.account_id;
  }
}
