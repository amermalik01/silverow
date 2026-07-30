// lib/services/purchase-invoices/purchase-invoice-posting.service.ts

import { pool } from "@/lib/db";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLPostingService, GLLineInput } from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

export interface PostInvoiceInput {
  companyId: string;
  purchaseOrderId: string;
  userId?: string;
  invoiceData: {
    supplier_invoice_no: string;
    invoice_date?: string;
    posting_date?: string;
    notes?: string;
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
    const { companyId, purchaseOrderId, userId, invoiceData, financials } = input;

    try {
      await client.query("BEGIN");

      // 1. Fetch & lock Purchase Order record
      const poResult = await client.query(
        `SELECT id, supplier_id, status 
         FROM purchase_orders 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [purchaseOrderId, companyId]
      );

      if (!poResult.rows.length) {
        throw new Error("Target Purchase Order document not found.");
      }

      const po = poResult.rows[0];

      // 2. Load active order lines
      const linesResult = await client.query(
        `SELECT id, item_id, warehouse_id, quantity, unit_price 
         FROM purchase_order_lines 
         WHERE purchase_order_id = $1 AND company_id = $2 AND is_deleted = false`,
        [purchaseOrderId, companyId]
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post invoice for an order without lines.");
      }

      // 3. Insert Purchase Invoice record
      const invoiceDate =
        invoiceData.invoice_date || new Date().toISOString().split("T")[0];
      const postingDate = invoiceData.posting_date || invoiceDate;

      const invResult = await client.query(
        `INSERT INTO purchase_invoices (
          company_id, purchase_order_id, supplier_id, supplier_invoice_no,
          invoice_date, posting_date, subtotal, tax_amount, total_amount, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'POSTED', $10)
        RETURNING id, invoice_no`,
        [
          companyId,
          purchaseOrderId,
          po.supplier_id,
          invoiceData.supplier_invoice_no,
          invoiceDate,
          postingDate,
          financials.amount,
          financials.vat,
          financials.amountInclVat,
          userId || null,
        ]
      );

      const createdInvoice = invResult.rows[0];
      const glLines: GLLineInput[] = [];

      let fallbackApAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;

      // 4. Resolve Accounts per line & build GRNI clearing lines
      for (const line of lines) {
        const lineTotal = Number(line.quantity) * Number(line.unit_price || 0);

        // Uses your existing resolvePurchaseAccounts method
        const accounts = await AccountResolutionService.resolvePurchaseAccounts(
          client,
          companyId,
          line.item_id
        );

        // Store AP and VAT accounts from posting setup
        if (!fallbackApAccountId && accounts.payable_account_id) {
          fallbackApAccountId = accounts.payable_account_id;
        }
        if (!fallbackVatAccountId && accounts.vat_account_id) {
          fallbackVatAccountId = accounts.vat_account_id;
        }

        // DEBIT: Clear GRNI Liability
        glLines.push({
          account_id: accounts.grni_account_id,
          debit: lineTotal,
          credit: 0,
          party_id: po.supplier_id,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: Number(line.quantity),
          reference_type: "PURCHASE_INVOICE",
          reference_id: createdInvoice.id,
          description: `GRNI clearing for invoice ${createdInvoice.invoice_no}`,
        });

        // Mark line invoiced
        await client.query(
          `UPDATE purchase_order_lines 
           SET invoiced_quantity = quantity, updated_at = NOW() 
           WHERE id = $1`,
          [line.id]
        );
      }

      // 5. DEBIT: Input Tax / VAT (if applicable)
      if (financials.vat > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Purchase VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: financials.vat,
          credit: 0,
          party_id: po.supplier_id,
          reference_type: "PURCHASE_INVOICE",
          reference_id: createdInvoice.id,
          description: `Input VAT for invoice ${createdInvoice.invoice_no}`,
        });
      }

      // 6. CREDIT: Accounts Payable (Vendor Total)
      if (!fallbackApAccountId) {
        throw new Error("Accounts Payable account not configured in purchase posting groups.");
      }

      glLines.push({
        account_id: fallbackApAccountId,
        debit: 0,
        credit: financials.amountInclVat,
        party_id: po.supplier_id,
        reference_type: "PURCHASE_INVOICE",
        reference_id: createdInvoice.id,
        description: `Vendor AP liability for ${invoiceData.supplier_invoice_no}`,
      });

      // 7. Validate journal balance using your GLValidationService
      GLValidationService.validateBalanced(glLines);

      // 8. Post journal using your GLPostingService
      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "PURCHASE",
        journal_type: "PURCHASE_INVOICE",
        reference: createdInvoice.invoice_no,
        source_id: createdInvoice.id,
        description: `Posted Invoice ${createdInvoice.invoice_no} (Vendor Ref: ${invoiceData.supplier_invoice_no})`,
        created_by: userId || null,
        lines: glLines,
      });

      // 9. Mark Purchase Order completed
      await client.query(
        `UPDATE purchase_orders 
         SET status = 'completed', is_invoiced = true, updated_at = NOW() 
         WHERE id = $1`,
        [purchaseOrderId]
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