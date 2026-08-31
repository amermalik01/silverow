// lib/services/purchase-invoices/purchase-invoice-posting.service.ts

import { pool } from "@/lib/db";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { VendorLedgerService } from "../ledger/vendor-ledger.service";

export interface PostInvoiceInput {
  companyId: string;
  purchaseOrderId: string;
  userId?: string;
  invoiceData: {
    supplier_invoice_no: string;
    invoice_date?: string;
    due_date?: string;
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

export class PurchaseInvoicePostingService {
  static async postInvoice(input: PostInvoiceInput) {
    const client = await pool.connect();
    const { companyId, purchaseOrderId, userId, invoiceData, financials } =
      input;

    try {
      await client.query("BEGIN");

      // 1. Fetch & lock Purchase Order record
      const poResult = await client.query(
        `SELECT id, supplier_id, status, currency_id, exchange_rate
         FROM purchase_orders 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [purchaseOrderId, companyId],
      );

      if (!poResult.rows.length) {
        throw new Error("Target Purchase Order document not found.");
      }

      const po = poResult.rows[0];

      // 2. Load active order lines
      const linesResult = await client.query(
        `SELECT id, item_id, line_type, warehouse_id, quantity, received_quantity, unit_cost, discount_amount, description, tax_percent, tax_amount, net_amount, gross_amount
         FROM purchase_order_lines 
         WHERE purchase_order_id = $1 AND company_id = $2 AND is_deleted = false`,
        [purchaseOrderId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post invoice for an order without lines.");
      }

      // 2. 🌟 ENFORCE 3-WAY MATCHING (Scenario A: Goods-First Workflow)
      const stockLines = lines.filter(
        (line) =>
          line.line_type === "ITEM" || (!line.line_type && !!line.item_id),
      );

      const unreceivedLines = stockLines.filter(
        (line) => Number(line.received_quantity) < Number(line.quantity),
      );

      if (unreceivedLines.length > 0) {
        throw new Error(
          "3-Way Match Failed: Cannot post invoice. Stock must be physically received before posting a purchase invoice.",
        );
      }

      // 3. Auto-generate sequence for invoice_no
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "purchase_invoice"],
      );
      const invoiceNo = seqResult.rows[0]?.code || `PINV-${Date.now()}`;

      const invoiceDate =
        invoiceData.invoice_date || new Date().toISOString().split("T")[0];
      const dueDate = invoiceData.due_date || invoiceDate;

      // Currency resolution: Request body override -> PO header fallback
      const currencyId = invoiceData.currency_id || po.currency_id || null;
      const exchangeRate = Number(
        invoiceData.exchange_rate || po.exchange_rate || 1,
      );

      // Calculate total GRNI subtotal directly from order lines
      // const grniSubtotal = lines.reduce(
      //   (sum, line) =>
      //     sum + Number(line.quantity) * Number(line.unit_cost || 0),
      //   0,
      // );

      // Calculate GRNI subtotal using Net Amount (or Quantity * Unit Cost - Discount)
      const grniSubtotal = lines.reduce((sum, line) => {
        const lineNet =
          line.net_amount !== undefined && line.net_amount !== null
            ? Number(line.net_amount)
            : Number(line.quantity) * Number(line.unit_cost || 0) -
              Number(line.discount_amount || 0);
        return sum + lineNet;
      }, 0);

      const vatAmount = Number(financials.vat || 0);

      // Ensure Total Amount = GRNI Subtotal + VAT Amount
      const grossTotal = grniSubtotal + vatAmount;

      // 4. Insert Purchase Invoice record
      const invResult = await client.query(
        `INSERT INTO purchase_invoices (
          company_id, 
          purchase_order_id, 
          supplier_id, 
          invoice_no,
          supplier_invoice_no,
          invoice_date,
          due_date,
          currency_id,
          exchange_rate,
          subtotal, 
          tax_amount, 
          total_amount, 
          status, 
          is_posted,
          posted_at,
          approved_at,
          notes,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
          'POSTED', true, NOW(), NOW(), $13, $14
        )
        RETURNING id, invoice_no`,
        [
          companyId,
          purchaseOrderId,
          po.supplier_id,
          invoiceNo,
          invoiceData.supplier_invoice_no,
          invoiceDate,
          dueDate,
          currencyId,
          exchangeRate,
          grniSubtotal,
          vatAmount,
          grossTotal,
          invoiceData.notes || null,
          userId || null,
        ],
      );

      const createdInvoice = invResult.rows[0];
      const glLines: GLLineInput[] = [];

      let fallbackApAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let lineNo = 10000;

      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      // 5. Create Purchase Invoice Lines, resolve Accounts & build GRNI clearing lines
      for (const line of lines) {
        const lineGross = Number(line.quantity) * Number(line.unit_cost || 0);
        const lineDiscount = Number(line.discount_amount || 0);

        // Net line amount after discount
        const lineNet =
          line.net_amount !== undefined && line.net_amount !== null
            ? Number(line.net_amount)
            : lineGross - lineDiscount;

        await client.query(
          `INSERT INTO purchase_invoice_lines (
            company_id,
            purchase_invoice_id,
            line_no,
            purchase_order_line_id,
            item_id,
            warehouse_id,
            description,
            quantity,
            unit_cost,
            line_amount,
            discount_amount,
            tax_percent,
            tax_amount,
            net_amount,
            gross_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            companyId,
            createdInvoice.id,
            lineNo,
            line.id,
            line.item_id || null,
            line.warehouse_id || null,
            line.description || null,
            line.quantity,
            line.unit_cost,
            lineGross, // line_amount
            lineDiscount, // discount_amount
            line.tax_percent || 0,
            line.tax_amount || 0,
            lineNet,// net_amount
            line.gross_amount || lineNet,// gross_amount
          ],
        );
        lineNo += 10000;

        const accounts = await AccountResolutionService.resolvePurchaseAccounts(
          client,
          companyId,
          line.item_id,
        );

        if (!fallbackApAccountId && accounts.payable_account_id) {
          fallbackApAccountId = accounts.payable_account_id;
        }
        if (!fallbackVatAccountId && accounts.vat_account_id) {
          fallbackVatAccountId = accounts.vat_account_id;
        }

        const isStockItem =
          line.line_type === "ITEM" || (!line.line_type && !!line.item_id);

        if (inventorySystem === "PERPETUAL" && isStockItem) {
          // DEBIT: Clear GRNI Liability
          glLines.push({
            account_id: accounts.grni_account_id,
            debit: lineNet,
            credit: 0,
            party_id: po.supplier_id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: Number(line.quantity),
            reference_type: "PURCHASE_INVOICE",
            reference_id: createdInvoice.id,
            description: `GRNI clearing for invoice ${createdInvoice.invoice_no}`,
          });
        } else {
          // --- PERIODIC: Post directly to Purchase Expense / Direct Costs Account ---
          glLines.push({
            account_id: accounts.purchase_account_id, // e.g. 4000 Purchases / Direct Cost
            debit: lineNet,
            credit: 0,
            party_id: po.supplier_id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: Number(line.quantity),
            reference_type: "PURCHASE_INVOICE",
            reference_id: createdInvoice.id,
            description: `Purchase expense for invoice ${createdInvoice.invoice_no}`,
          });
        }

        await client.query(
          `UPDATE purchase_order_lines 
           SET invoiced_quantity = quantity, updated_at = NOW() 
           WHERE id = $1`,
          [line.id],
        );
      }

      // 6. DEBIT: Input Tax / VAT (if applicable)
      if (vatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Purchase VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: vatAmount,
          credit: 0,
          party_id: po.supplier_id,
          reference_type: "PURCHASE_INVOICE",
          reference_id: createdInvoice.id,
          description: `Input VAT for invoice ${createdInvoice.invoice_no}`,
        });
      }

      // 7. CREDIT: Accounts Payable (Vendor Total)
      if (!fallbackApAccountId) {
        throw new Error(
          "Accounts Payable account not configured in purchase posting groups.",
        );
      }

      // Make sure AP liability matches the computed total of (Line Debits + VAT Debit)
      const totalDebitLinesAmount = glLines.reduce(
        (sum, l) => sum + (l.debit || 0),
        0,
      );

      // Credit total must equal GRNI Subtotal + VAT
      glLines.push({
        account_id: fallbackApAccountId,
        debit: 0,
        credit: Number(totalDebitLinesAmount.toFixed(2)),
        party_id: po.supplier_id,
        reference_type: "PURCHASE_INVOICE",
        reference_id: createdInvoice.id,
        description: `Vendor AP liability for ${invoiceData.supplier_invoice_no}`,
      });

      // 8. Validate journal balance
      GLValidationService.validateBalanced(glLines);

      // 9. Post journal entry with currency details
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: invoiceDate,
        source: "PURCHASE",
        journal_type: "PURCHASE_INVOICE",
        reference: createdInvoice.invoice_no,
        source_id: createdInvoice.id,
        description: `Posted Invoice ${createdInvoice.invoice_no} (Vendor Ref: ${invoiceData.supplier_invoice_no})`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      // Locate the posted AP journal line to link with vendor sub-ledger
      const apLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackApAccountId,
      );

      // 10. Post Vendor Sub-Ledger Entry
      const vendorLedgerEntry = await VendorLedgerService.createEntry(client, {
        companyId,
        vendorId: po.supplier_id,
        documentType: "PURCHASE_INVOICE",
        documentId: createdInvoice.id,
        documentNo: createdInvoice.invoice_no,
        postingDate: invoiceDate,
        dueDate,
        description: `Invoice ${createdInvoice.invoice_no} (Vendor Ref: ${invoiceData.supplier_invoice_no})`,
        originalAmount: grossTotal,
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: apLine?.id || null,
      });

      // 10. Mark Purchase Order completed
      await client.query(
        `UPDATE purchase_orders 
         SET status = 'completed', is_invoiced = true, updated_at = NOW() 
         WHERE id = $1`,
        [purchaseOrderId],
      );

      await client.query("COMMIT");
      return createdInvoice;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
