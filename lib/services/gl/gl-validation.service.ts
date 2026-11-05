// lib/services/gl/gl-validation.service.ts

import type { PoolClient } from "pg";

interface BalancedJournalLine {
  debit?: number | string | null;
  credit?: number | string | null;
}

export class GLValidationService {
  // =========================================================
  // VALIDATE ACCOUNT
  // =========================================================

  static async validateAccount(
    client: PoolClient,
    accountId: string,
  ): Promise<void> {
    const result = await client.query<{
      is_active: boolean;
      is_posting: boolean;
    }>(
      `
      SELECT is_active, is_posting
      FROM chart_of_accounts
      WHERE id = $1
      `,
      [accountId],
    );

    if (!result.rows.length) {
      throw new Error("GL account not found");
    }

    const account = result.rows[0];

    if (!account.is_active) {
      throw new Error("GL account is inactive");
    }

    if (!account.is_posting) {
      throw new Error("Account is not a posting account");
    }
  }

  // =========================================================
  // FINANCIAL ROUNDING
  // =========================================================

  private static toCents(value: number | string | null | undefined): number {
    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid journal amount: ${String(value)}`);
    }

    return Math.round((amount + Number.EPSILON) * 100);
  }

  private static formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  // =========================================================
  // VALIDATE BALANCED JOURNAL
  // =========================================================

  static validateBalanced(lines: BalancedJournalLine[]): void {
    if (!lines.length) {
      throw new Error("Cannot post an empty journal");
    }

    let debitCents = 0;
    let creditCents = 0;

    for (const [index, line] of lines.entries()) {
      const debit = this.toCents(line.debit);
      const credit = this.toCents(line.credit);

      if (debit < 0 || credit < 0) {
        throw new Error(
          `Journal line ${index + 1} contains a negative debit or credit`,
        );
      }

      if (debit > 0 && credit > 0) {
        throw new Error(
          `Journal line ${index + 1} cannot contain both debit and credit`,
        );
      }

      debitCents += debit;
      creditCents += credit;
    }

    if (debitCents !== creditCents) {
      const difference = Math.abs(debitCents - creditCents);

      throw new Error(
        [
          "Journal not balanced:",
          `Debit=${this.formatCents(debitCents)},`,
          `Credit=${this.formatCents(creditCents)},`,
          `Difference=${this.formatCents(difference)}`,
        ].join(" "),
      );
    }
  }

  // =========================================================
  // VALIDATE POSITIVE AMOUNT
  // =========================================================

  static validatePositiveAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
  }
}
/* import { PoolClient } from "pg";
import { JournalLineInput } from "@/types/journal";

export class GLValidationService {
  //  * =========================================================
  //  * VALIDATE ACCOUNT
  //  * =========================================================

  static async validateAccount(client: PoolClient, accountId: string) {
    const result = await client.query(
      `
      SELECT is_active, is_posting
      FROM chart_of_accounts
      WHERE id = $1
      `,
      [accountId],
    );

    if (!result.rows.length) {
      throw new Error("GL account not found");
    }

    const acc = result.rows[0];

    if (!acc.is_active) {
      throw new Error("GL account is inactive");
    }

    if (!acc.is_posting) {
      throw new Error("Account is not a posting account");
    }
  }

  static validateBalanced(lines: Array<{ debit?: number | null; credit?: number | null }>) {
    const debit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const credit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);

    if (Number(debit.toFixed(2)) !== Number(credit.toFixed(2))) {
      throw new Error(`Journal not balanced: Debit=${debit}, Credit=${credit}`);
    }
  }

  //  * =========================================================
  //  * VALIDATE POSITIVE AMOUNT
  //  * =========================================================

  static validatePositiveAmount(amount: number) {
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
  }
} */


  //  * =========================================================
  //  * VALIDATE JOURNAL BALANCE
  //  * =========================================================

  // static validateBalanced(lines: JournalLineInput[]) {
  //   const debit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);

  //   const credit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);

  //   if (Number(debit.toFixed(2)) !== Number(credit.toFixed(2))) {
  //     throw new Error(`Journal not balanced: Debit=${debit}, Credit=${credit}`);
  //   }
  // }