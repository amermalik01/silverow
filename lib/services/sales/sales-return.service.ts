// /lib/services/sales/sales-return.service.ts
import { PoolClient } from "pg";

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
}
