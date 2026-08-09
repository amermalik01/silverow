//  lib/services/gl/gl-validation.service.ts
import { PoolClient } from "pg";
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
}


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