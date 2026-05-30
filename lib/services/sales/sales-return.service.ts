// /lib/services/sales/sales-return.service.ts
import { PoolClient } from "pg";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";

export interface SalesReturnListFilter {
  companyId: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateSalesReturnInput {
  companyId: string;
  customerId: string;
  salesInvoiceId?: string | null;
  returnDate: string;
  currencyId: string;
  exchangeRate: number;
  notes?: string | null;
  lines: {
    lineNo: number;
    lineType: "ITEM" | "GL_ACCOUNT";
    itemId?: string | null;
    glAccountId?: string | null;
    warehouseId?: string | null;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    vatPercent: number;
  }[];
}

export interface PostedListFilterOptions {
  customerId?: string;
  search?: string;
  limit: number;
  offset: number;
}

export class SalesReturnService {
  /**
   * =========================================================
   * GET PAGINATED LISTING
   * =========================================================
   */
  static async getList(client: PoolClient, filters: SalesReturnListFilter) {
    const {
      companyId,
      search = "",
      status = "ALL",
      page = 1,
      limit = 10,
    } = filters;
    const offset = (page - 1) * limit;

    const queryParams: (string | number | boolean)[] = [companyId];
    let whereClause = "WHERE sr.company_id = $1";

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (sr.return_no ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    if (status !== "ALL") {
      queryParams.push(status);
      whereClause += ` AND sr.status = $${queryParams.length}`;
    }

    // 1. Total count execution
    const countResult = await client.query(
      `
      SELECT COUNT(*) 
      FROM sales_returns sr
      LEFT JOIN parties p ON p.id = sr.customer_id
      ${whereClause}
      `,
      queryParams,
    );
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // 2. Data payload window execution
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT 
        sr.id,
        sr.return_no,
        sr.return_date,
        sr.total_amount,
        sr.status,
        p.name as customer_name,
        si.invoice_no as original_invoice_no
      FROM sales_returns sr
      LEFT JOIN parties p ON p.id = sr.customer_id
      LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
      ${whereClause}
      ORDER BY sr.return_date DESC, sr.return_no DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataResult = await client.query(dataQuery, queryParams);

    return {
      returns: dataResult.rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  /**
   * =========================================================
   * GET SINGLE RECORD WITH LINES
   * =========================================================
   */
  static async getById(client: PoolClient, id: string, companyId: string) {
    const headerResult = await client.query(
      `SELECT sr.*, p.name as customer_name, si.invoice_no as original_invoice_no
       FROM sales_returns sr
       LEFT JOIN parties p ON p.id = sr.customer_id
       LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
       WHERE sr.id = $1 AND sr.company_id = $2`,
      [id, companyId],
    );

    if (!headerResult.rows.length) return null;

    const linesResult = await client.query(
      `SELECT srl.*, i.name as item_name, i.item_code, coa.name as account_name, coa.code as account_code, w.name as warehouse_name
       FROM sales_return_lines srl
       LEFT JOIN items i ON i.id = srl.item_id
       LEFT JOIN chart_of_accounts coa ON coa.id = srl.gl_account_id
       LEFT JOIN warehouses w ON w.id = srl.warehouse_id
       WHERE srl.sales_return_id = $1 AND srl.company_id = $2
       ORDER BY srl.line_no ASC`,
      [id, companyId],
    );

    return {
      invoice: headerResult.rows[0], // using key 'invoice' to mirror detail UI structure matches
      lines: linesResult.rows,
    };
  }

  /**
   * =========================================================
   * CREATE TRANSACTIONAL RETURN DOCUMENT
   * =========================================================
   */

  static async create(client: PoolClient, input: CreateSalesReturnInput) {
    let subtotal = 0;
    let totalVat = 0;

    const computedLines = input.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice - line.discountAmount;
      const lineVat = lineSubtotal * (line.vatPercent / 100);
      const lineTotal = lineSubtotal + lineVat;

      subtotal += lineSubtotal;
      totalVat += lineVat;

      return { ...line, lineTotal, vatAmount: lineVat };
    });

    const totalAmount = subtotal + totalVat;

    const countRes = await client.query(
      `SELECT COUNT(*) FROM sales_returns WHERE company_id = $1`,
      [input.companyId],
    );
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(
      5,
      "0",
    );
    const returnNo = `SR-${new Date(input.returnDate).getFullYear()}-${nextSeq}`;

    // Modified Header execution statement injecting multi-currency variables
    const headerRes = await client.query(
      `INSERT INTO sales_returns (
      company_id, return_no, customer_id, sales_invoice_id, return_date,
      currency_id, exchange_rate, subtotal, tax_amount, total_amount, status, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', $11)
     RETURNING id`,
      [
        input.companyId,
        returnNo,
        input.customerId,
        input.salesInvoiceId || null,
        input.returnDate,
        input.currencyId,
        input.exchangeRate,
        subtotal,
        totalVat,
        totalAmount,
        input.notes || null,
      ],
    );

    const salesReturnId = headerRes.rows[0].id;

    for (const line of computedLines) {
      await client.query(
        `INSERT INTO sales_return_lines (
        company_id, sales_return_id, line_no, line_type, item_id, gl_account_id,
        warehouse_id, description, quantity, unit_price, discount_amount,
        vat_percent, vat_amount, line_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          input.companyId,
          salesReturnId,
          line.lineNo,
          line.lineType,
          line.itemId || null,
          line.glAccountId || null,
          line.warehouseId || null,
          line.description || null,
          line.quantity,
          line.unitPrice,
          line.discountAmount,
          line.vatPercent,
          line.vatAmount,
          line.lineTotal,
        ],
      );
    }

    return { id: salesReturnId, returnNo };
  }

  /**
   * =========================================================
   * UPDATE TRANSACTIONAL RETURN DOCUMENT
   * =========================================================
   */
  static async update(
    client: PoolClient,
    id: string,
    input: CreateSalesReturnInput,
  ) {
    // 1. Recalculate line totals securely on the backend
    let subtotal = 0;
    let totalVat = 0;

    const computedLines = input.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice - line.discountAmount;
      const lineVat = lineSubtotal * (line.vatPercent / 100);
      const lineTotal = lineSubtotal + lineVat;

      subtotal += lineSubtotal;
      totalVat += lineVat;

      return { ...line, lineTotal, vatAmount: lineVat };
    });

    const totalAmount = subtotal + totalVat;

    // 2. Update the parent Header record
    const headerResult = await client.query(
      `UPDATE sales_returns 
       SET customer_id = $1, 
           sales_invoice_id = $2, 
           return_date = $3,
           currency_id = $4, 
           exchange_rate = $5, 
           subtotal = $6, 
           tax_amount = $7, 
           total_amount = $8, 
           notes = $9,
           updated_at = NOW()
       WHERE id = $10 AND company_id = $11
       RETURNING return_no`,
      [
        input.customerId,
        input.salesInvoiceId || null,
        input.returnDate,
        input.currencyId,
        input.exchangeRate,
        subtotal,
        totalVat,
        totalAmount,
        input.notes || null,
        id,
        input.companyId,
      ],
    );

    if (!headerResult.rows.length) {
      throw new Error("Target return record not found or unauthorized.");
    }

    // 3. Clear existing child lines to cleanly process row updates/removals
    await client.query(
      `DELETE FROM sales_return_lines WHERE sales_return_id = $1 AND company_id = $2`,
      [id, input.companyId],
    );

    // 4. Re-insert the updated line item matrix
    for (const line of computedLines) {
      await client.query(
        `INSERT INTO sales_return_lines (
          company_id, sales_return_id, line_no, line_type, item_id, gl_account_id,
          warehouse_id, description, quantity, unit_price, discount_amount,
          vat_percent, vat_amount, line_total
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          input.companyId,
          id,
          line.lineNo,
          line.lineType,
          line.itemId || null,
          line.glAccountId || null,
          line.warehouseId || null,
          line.description || null,
          line.quantity,
          line.unitPrice,
          line.discountAmount,
          line.vatPercent,
          line.vatAmount,
          line.lineTotal,
        ],
      );
    }

    return { id, returnNo: headerResult.rows[0].return_no };
  }

  /**
   * =========================================================
   * DELETE RETURN DOCUMENT AND ASSOCIATED LINES
   * =========================================================
   */
  static async delete(client: PoolClient, id: string, companyId: string) {
    // Foreign key cascading might handle this, but explicit cleanup guarantees execution safety
    await client.query(
      `DELETE FROM sales_return_lines WHERE sales_return_id = $1 AND company_id = $2`,
      [id, companyId],
    );

    const result = await client.query(
      `DELETE FROM sales_returns WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId],
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * =========================================================
   * POST CREDIT NOTE (LOCK, JOURNALIZE, & ARCHIVE HISTORIC)
   * =========================================================
   */
  static async post(
    client: PoolClient,
    id: string,
    companyId: string,
    userId?: string,
  ) {
    /**
     * -----------------------------------------------------
     * 1. LOAD DRAFT SALES RETURN HEADER
     * -----------------------------------------------------
     */
    const returnResult = await client.query(
      `SELECT * FROM sales_returns WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!returnResult.rows.length) {
      throw new Error("Credit Note draft record not found.");
    }

    const draftReturn = returnResult.rows[0];

    if (draftReturn.status === "POSTED") {
      throw new Error("This Credit Note has already been posted to ledgers.");
    }

    /**
     * -----------------------------------------------------
     * 2. LOAD DRAFT SALES RETURN LINES
     * -----------------------------------------------------
     */
    const linesResult = await client.query(
      `SELECT * FROM sales_return_lines WHERE sales_return_id = $1 ORDER BY line_no ASC`,
      [id],
    );

    const draftLines = linesResult.rows;

    if (!draftLines.length) {
      throw new Error("Credit Note draft has no valid allocation rows.");
    }

    /**
     * -----------------------------------------------------
     * 3. GENERATE IMMUTABLE CREDIT NOTE SEQUENTIAL NUMBER
     * -----------------------------------------------------
     */
    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "credit_note"],
    );
    const creditNoteNo = seqResult.rows[0].code;

    /**
     * -----------------------------------------------------
     * 4. INSERT IMMUTABLE HEAD ARCHIVE (posted_sales_returns)
     * -----------------------------------------------------
     */
    const postedHeaderResult = await client.query(
      `INSERT INTO public.posted_sales_returns (
        company_id, credit_note_no, source_return_no, customer_id, 
        sales_invoice_id, posting_date, currency_id, exchange_rate,
        subtotal, tax_amount, total_amount, notes, posted_by, posted_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        companyId,
        creditNoteNo,
        draftReturn.return_no,
        draftReturn.customer_id,
        draftReturn.sales_invoice_id || null,
        draftReturn.currency_id || null,
        Number(draftReturn.exchange_rate || 1),
        0, // Temporary values updated after parsing elements
        0,
        0,
        draftReturn.notes || null,
        userId || null,
      ],
    );

    const postedHeader = postedHeaderResult.rows[0];

    /**
     * -----------------------------------------------------
     * 5. ITERATE LINES, IMMUTABLE ARCHIVE, BUILD JOURNAL LINES
     * -----------------------------------------------------
     */
    let totalSubtotal = 0;
    let totalTaxAmount = 0;
    let totalGrossAmount = 0;
    const glLines: JournalLineInput[] = [];

    for (const line of draftLines) {
      const qty = Number(line.quantity || 0);
      const unitPrice = Number(line.unit_price || 0);
      const discount = Number(line.discount_amount || 0);
      const vatPercent = Number(line.vat_percent || 0);

      const lineNet = qty * unitPrice - discount;
      const lineTax = lineNet * (vatPercent / 100);
      const lineTotal = lineNet + lineTax;

      // Persist directly to immutable historical entries schema
      await client.query(
        `INSERT INTO public.posted_sales_return_lines (
          company_id, posted_sales_return_id, line_no, line_type,
          item_id, gl_account_id, warehouse_id, description,
          quantity, unit_price, discount_amount, vat_percent, vat_amount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          companyId,
          postedHeader.id,
          line.line_no,
          line.line_type,
          line.item_id || null,
          line.gl_account_id || null,
          line.warehouse_id || null,
          line.description || null,
          qty,
          unitPrice,
          discount,
          vatPercent,
          lineTax,
          lineTotal,
        ],
      );

      /**
       * -----------------------------------------------------
       * RESOLVE COAs & ACCRUE JOURNAL BALANCES
       * -----------------------------------------------------
       */
      const accounts = await AccountResolutionService.resolveSalesAccounts(
        client,
        companyId,
        line.item_id,
      );

      /**
       * CREDIT NOTE DOUBLE ENTRY PATTERN:
       * DR: Revenue Account (Reverses Sales Inflows)
       * DR: VAT Output Account (Reverses Collected Liability)
       * CR: Receivable Control Account (Reduces Outstanding Invoice Assets)
       */

      // DR: Revenue / Adjustments Balance
      glLines.push({
        account_id: line.gl_account_id || accounts.sales_account_id,
        debit: lineNet,
        credit: 0,
        item_id: line.item_id || null,
        quantity: qty,
        unit_cost: unitPrice,
        reference_type: "CREDIT_NOTE",
        reference_id: postedHeader.id,
      });

      // DR: Tax Balance
      if (lineTax > 0) {
        glLines.push({
          account_id: accounts.vat_account_id,
          debit: lineTax,
          credit: 0,
          item_id: line.item_id || null,
          quantity: qty,
          unit_cost: unitPrice,
          reference_type: "CREDIT_NOTE",
          reference_id: postedHeader.id,
        });
      }

      // CR: Accounts Receivable
      glLines.push({
        account_id: accounts.receivable_account_id,
        debit: 0,
        credit: lineTotal,
        item_id: line.item_id || null,
        quantity: qty,
        unit_cost: unitPrice,
        reference_type: "CREDIT_NOTE",
        reference_id: postedHeader.id,
      });

      totalSubtotal += lineNet;
      totalTaxAmount += lineTax;
      totalGrossAmount += lineTotal;
    }

    /**
     * -----------------------------------------------------
     * 6. VALIDATE AND EXECUTE POSTING ENTRY TO GL
     * -----------------------------------------------------
     */
    GLValidationService.validateBalanced(glLines);

    const journal = await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: postedHeader.posting_date,
      source: "SALES",
      journal_type: "CREDIT_NOTE",
      reference: postedHeader.credit_note_no,
      source_id: postedHeader.id,
      description: `Posted Credit Note adjustment voucher ${postedHeader.credit_note_no}`,
      created_by: userId || null,
      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * 7. ASSIGN RUNTIME FINANCIAL AGGREGATIONS BACK TO ARCHIVE
     * -----------------------------------------------------
     */
    await client.query(
      `UPDATE public.posted_sales_returns
       SET subtotal = $1, tax_amount = $2, total_amount = $3, journal_entry_id = $4
       WHERE id = $5`,
      [
        totalSubtotal,
        totalTaxAmount,
        totalGrossAmount,
        journal.id,
        postedHeader.id,
      ],
    );

    /**
     * -----------------------------------------------------
     * 8. WRITE SUB-LEDGER TRANSACTION (CUSTOMER LEDGER ENTRIES)
     * -----------------------------------------------------
     */
    const subLedgerResult = await client.query(
      `INSERT INTO customer_ledger_entries (
        company_id, customer_id, document_type, document_id, document_no,
        posting_date, description, original_amount, remaining_amount,
        currency_id, is_open, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
      RETURNING id`,
      [
        companyId,
        draftReturn.customer_id,
        "CREDIT_NOTE",
        postedHeader.id,
        postedHeader.credit_note_no,
        postedHeader.posting_date,
        `Credit Note Reversal Ref: ${draftReturn.return_no}`,
        -Math.abs(totalGrossAmount), // Stored as negative value to net down AR balances
        -Math.abs(totalGrossAmount),
        draftReturn.currency_id || null,
        journal.id,
      ],
    );

    const creditNoteLedgerEntryId = subLedgerResult.rows[0].id;

    /**
     * -----------------------------------------------------
     * 9. CONDITIONAL APPLICATION: KNOCK OFF TARGET SPECIFIC INVOICE
     * -----------------------------------------------------
     */
    if (draftReturn.sales_invoice_id) {
      // Find the open ledger record of the target invoice to apply against
      const invoiceLedgerResult = await client.query(
        `SELECT id, remaining_amount FROM customer_ledger_entries 
         WHERE document_type = 'SALES_INVOICE' AND document_id = $1 AND is_open = true`,
        [draftReturn.sales_invoice_id],
      );

      if (invoiceLedgerResult.rows.length > 0) {
        const invLedger = invoiceLedgerResult.rows[0];
        const invoiceRemaining = Number(invLedger.remaining_amount);

        // Amount calculation threshold rule mapping
        const amountToApply = Math.min(invoiceRemaining, totalGrossAmount);

        if (amountToApply > 0) {
          // Log reference to matching ledger allocations
          await client.query(
            `INSERT INTO public.customer_ledger_applications (
              company_id, applied_by_entry_id, applied_to_entry_id, amount_applied, applied_at
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [companyId, creditNoteLedgerEntryId, invLedger.id, amountToApply],
          );

          // Net down target invoice balance allocation
          await client.query(
            `UPDATE customer_ledger_entries
             SET remaining_amount = remaining_amount - $1,
                 is_open = CASE WHEN (remaining_amount - $1) <= 0 THEN false ELSE true END
             WHERE id = $2`,
            [amountToApply, invLedger.id],
          );

          // Net down this credit note's open status balance asset application
          await client.query(
            `UPDATE customer_ledger_entries
             SET remaining_amount = remaining_amount + $1,
                 is_open = CASE WHEN (remaining_amount + $1) >= 0 THEN false ELSE true END
             WHERE id = $2`,
            [amountToApply, creditNoteLedgerEntryId],
          );
        }
      }
    }

    /**
     * -----------------------------------------------------
     * 10. FLAG LOCAL SOURCE TRANSACTION DOCUMENT AS POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `UPDATE sales_returns
       SET status = 'POSTED', posted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id],
    );

    return {
      returnNo: draftReturn.return_no,
      creditNoteNo: postedHeader.credit_note_no,
    };
  }

  /**
   * =========================================================
   * RETRIEVE HISTORICAL POSTED LEDGER ENTRIES (WITH COUNTS)
   * =========================================================
   */
  static async listPosted(
    client: PoolClient,
    companyId: string,
    filters: PostedListFilterOptions,
  ) {
    let baseWhere = `WHERE psr.company_id = $1`;
    const queryParams: (string | number | boolean)[] = [companyId];
    let paramIndex = 2;

    if (filters.customerId) {
      baseWhere += ` AND psr.customer_id = $${paramIndex}`;
      queryParams.push(filters.customerId);
      paramIndex++;
    }

    if (filters.search) {
      baseWhere += ` AND (psr.credit_note_no ILIKE $${paramIndex} OR psr.source_return_no ILIKE $${paramIndex} OR psr.notes ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // 1. Query Total Math Metrics for Frontend Pagination Components
    const countQuery = `
      SELECT COUNT(DISTINCT psr.id)::int as total 
      FROM public.posted_sales_returns psr
      ${baseWhere}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const totalRecords = countResult.rows[0]?.total || 0;

    // 2. Query Paginated Core Relational Data Payload
    const dataQuery = `
      SELECT 
        psr.id,
        psr.credit_note_no,
        psr.source_return_no,
        psr.posting_date,
        psr.subtotal,
        psr.tax_amount,
        psr.total_amount,
        psr.journal_entry_id,
        psr.notes,
        c.name as customer_name,
        curr.code as currency_code
      FROM public.posted_sales_returns psr
      LEFT JOIN customers c ON psr.customer_id = c.id
      LEFT JOIN currencies curr ON psr.currency_id = curr.id
      ${baseWhere}
      GROUP BY psr.id, c.name, curr.code
      ORDER BY psr.posted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(filters.limit);
    queryParams.push(filters.offset);

    const dataResult = await client.query(dataQuery, queryParams);

    return {
      records: dataResult.rows,
      total: totalRecords,
    };
  }
}
/**
 * =========================================================
 * POST CREDIT NOTE (LOCK & COMMIT TO LEDGERS)
 * =========================================================
 */
/* static async post(client: PoolClient, id: string, companyId: string) {
    // 1. Fetch current status to prevent double-posting
    const statusCheck = await client.query(
      `SELECT status, return_no FROM sales_returns WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!statusCheck.rows.length) {
      throw new Error("Credit Note not found.");
    }

    if (statusCheck.rows[0].status === "POSTED") {
      throw new Error("This Credit Note has already been posted.");
    }

    // 2. Update status to POSTED
    const result = await client.query(
      `UPDATE sales_returns 
       SET status = 'POSTED',
           posted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING return_no`,
      [id, companyId]
    );

    // NOTE: If you have GL/Inventory ledger tables, you would loop through 
    // the line items here and execute your sub-ledger insertion queries 
    // within this same shared transaction context.

    return { returnNo: result.rows[0].return_no };
  } */
