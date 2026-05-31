// lib/services/gl/purchase-gl-posting.service.ts

import { JournalService } from "@/lib/services/journal.service";
import { JournalLineInput } from "@/types/journal";

export class PurchaseGLPostingService {
  //  POST GRNI ENTRY ON RECEIPT

  static async postGRNI(
    companyId: string,
    receiptId: string,
    lines: {
      item_id: string;
      amount: number;
    }[],
  ) {
    const journalLines: JournalLineInput[] = [];

    for (const line of lines) {
      // DR Inventory (or GRNI)

      journalLines.push({
        account_id: "INVENTORY_ACCOUNT",
        debit: line.amount,
        credit: 0,
        reference_type: "GRNI",
        reference_id: receiptId,
        item_id: line.item_id,
      });

      // CR GRNI Liability

      journalLines.push({
        account_id: "GRNI_ACCOUNT",
        debit: 0,
        credit: line.amount,
        reference_type: "GRNI",
        reference_id: receiptId,
        item_id: line.item_id,
      });
    }

    await JournalService.create(companyId, {
      entry_date: new Date().toISOString(),
      source: "PURCHASE",
      reference: receiptId,
      description: "GRNI Posting from Purchase Receipt",
      lines: journalLines,
    });
  }
}
