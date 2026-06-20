// lib/services/gl/purchase-gl-posting.service.ts 

import { JournalService } from "@/lib/services/journal.service";
import { JournalLineInput } from "@/types/journal";

export class PurchaseGLPostingService {
 
  static async postGRNI(
    companyId: string,
    receiptId: string,
    inventoryAccountId: string,
    grniAccountId: string,
    lines: {
      item_id: string;
      amount: number;
      warehouse_id?: string;
    }[],
  ) {

    const journalLines: JournalLineInput[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (const line of lines) {
      if (Number(line.amount || 0) <= 0) continue; 

      // DR Inventory Asset
      journalLines.push({
        posting_date: todayStr,
        transaction_type: "item", // 🟢 Safe value matching interface options
        account_id: inventoryAccountId,
        debit: Number(line.amount),
        credit: 0,
        description: `DR Inventory Asset - Item Ref: ${line.item_id.slice(0, 8)}`,
        reference_type: "GRNI",
        reference_id: receiptId,
        item_id: line.item_id,
        warehouse_id: line.warehouse_id || '',
        exchange_rate: 1.0,
        currency_amount: Number(line.amount),
        party_id: '',
        balancing_account_id: ''
      });

      // CR GRNI Liability Accrual
      journalLines.push({
        posting_date: todayStr,
        transaction_type: "gl_no", // 🟢 Maps to dbPartyType null down the chain
        account_id: grniAccountId,
        debit: 0,
        credit: Number(line.amount),
        description: `CR GRNI Liability Accrual - Receipt: ${receiptId.slice(0, 8)}`,
        reference_type: "GRNI",
        reference_id: receiptId,
        item_id: line.item_id,
        warehouse_id: line.warehouse_id || '',
        exchange_rate: 1.0,
        currency_amount: Number(line.amount),
        party_id: '',
        balancing_account_id: ''
      });
    }

    if (journalLines.length === 0) return;

    await JournalService.create(companyId, {
      entry_date: todayStr,
      source: "PURCHASE",
      reference: receiptId,
      description: "GRNI Posting from Purchase Receipt Matching Loop",
      lines: journalLines,
    });
  }
}

/* import { JournalService } from "@/lib/services/journal.service";
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
} */
