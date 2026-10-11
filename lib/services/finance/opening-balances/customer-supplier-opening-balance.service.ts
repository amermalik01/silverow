// lib/services/finance/opening-balances/customer-supplier-opening-balance.service.ts

import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

import type {
  OpeningBalanceCreatePayload,
  OpeningBalanceInput,
  OpeningBalancePartyType,
  OpeningBalanceRow,
} from "./customer-supplier-opening-balance.types";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

type OpeningBalanceDbRow = {
  id: string;
  company_id: string;

  party_id: string;
  party_code: string | null;
  party_name: string | null;

  posting_date: string | Date;

  doc_type: string;
  doc_no: string | null;
  external_ref_no: string | null;

  description: string | null;

  currency_id: string | null;
  currency_code: string;

  debit: string | number | null;
  credit: string | number | null;

  exchange_rate: string | number | null;

  amount_lcy: string | number | null;

  created_at: string | Date;
  updated_at: string | Date;
};

type PartyDbRow = {
  id: string;
  customer_code: string | null;
  supplier_code: string | null;
  name: string;
  currency_id: string | null;
};

export class CustomerSupplierOpeningBalanceService {
  private static getTableName(partyType: OpeningBalancePartyType): string {
    if (partyType === "customer") {
      return "customer_opening_balances";
    }

    return "supplier_opening_balances";
  }

  private static normalizeDate(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    return String(value).split("T")[0];
  }

  private static toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private static mapRow(row: OpeningBalanceDbRow): OpeningBalanceRow {
    return {
      id: row.id,

      company_id: row.company_id,

      party_id: row.party_id,
      party_code: row.party_code,
      party_name: row.party_name || "",

      posting_date: this.normalizeDate(row.posting_date),

      doc_type: row.doc_type as OpeningBalanceRow["doc_type"],

      doc_no: row.doc_no || "",
      external_ref_no: row.external_ref_no || "",

      description: row.description || "",

      currency_id: row.currency_id,
      currency_code: row.currency_code,

      debit: this.toNumber(row.debit),
      credit: this.toNumber(row.credit),

      exchange_rate: this.toNumber(row.exchange_rate) || 1,

      amount_lcy: this.toNumber(row.amount_lcy),

      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),

      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    };
  }

  /**
   * Validate and normalize one incoming line.
   */
  private static normalizeInput(
    line: OpeningBalanceInput,
  ): OpeningBalanceInput {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    const exchangeRate = Number(line.exchange_rate ?? 1);

    if (!line.party_id) {
      throw new Error("Party is required");
    }

    if (!line.posting_date) {
      throw new Error("Posting date is required");
    }

    if (!line.currency_code) {
      throw new Error("Currency is required");
    }

    if (!Number.isFinite(debit) || debit < 0) {
      throw new Error("Debit must be a valid positive number");
    }

    if (!Number.isFinite(credit) || credit < 0) {
      throw new Error("Credit must be a valid positive number");
    }

    if (debit > 0 && credit > 0) {
      throw new Error("A line cannot have both debit and credit");
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Exchange rate must be greater than zero");
    }

    return {
      ...line,

      party_code: line.party_code || null,
      party_name: line.party_name || null,

      doc_no: line.doc_no || "",
      external_ref_no: line.external_ref_no || "",

      description: line.description || "",

      currency_id: line.currency_id || null,

      debit,
      credit,

      exchange_rate: exchangeRate,
    };
  }

  /**
   * Validate the entire POST payload.
   */
  private static validatePayload(
    rawPayload: unknown,
  ): OpeningBalanceCreatePayload {
    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("Invalid request body");
    }

    const payload = rawPayload as Record<string, unknown>;

    if (!Array.isArray(payload.lines)) {
      throw new Error("lines must be an array");
    }

    const lines: OpeningBalanceInput[] = [];

    for (const rawLine of payload.lines) {
      if (typeof rawLine !== "object" || rawLine === null) {
        throw new Error("Invalid opening balance line");
      }

      const line = rawLine as Record<string, unknown>;

      const docType = line.doc_type;

      const allowedDocTypes = [
        "Invoice",
        "Credit Note",
        "Debit Note",
        "Payment",
        "Refund",
      ];

      if (typeof docType !== "string" || !allowedDocTypes.includes(docType)) {
        throw new Error("Invalid document type");
      }

      const normalizedLine = this.normalizeInput({
        party_id: String(line.party_id ?? ""),

        party_code:
          line.party_code === null || line.party_code === undefined
            ? null
            : String(line.party_code),

        party_name:
          line.party_name === null || line.party_name === undefined
            ? null
            : String(line.party_name),

        posting_date: String(line.posting_date ?? ""),

        doc_type: docType as OpeningBalanceInput["doc_type"],

        doc_no:
          line.doc_no === null || line.doc_no === undefined
            ? ""
            : String(line.doc_no),

        external_ref_no:
          line.external_ref_no === null || line.external_ref_no === undefined
            ? ""
            : String(line.external_ref_no),

        description:
          line.description === null || line.description === undefined
            ? ""
            : String(line.description),

        currency_id:
          line.currency_id === null || line.currency_id === undefined
            ? null
            : String(line.currency_id),

        currency_code: String(line.currency_code ?? ""),

        debit:
          line.debit === null || line.debit === undefined
            ? 0
            : Number(line.debit),

        credit:
          line.credit === null || line.credit === undefined
            ? 0
            : Number(line.credit),

        exchange_rate:
          line.exchange_rate === null || line.exchange_rate === undefined
            ? 1
            : Number(line.exchange_rate),
      });

      lines.push(normalizedLine);
    }

    return { lines };
  }

  /**
   * Check that the party belongs to the current company.
   */
  private static async validateParty(
    client: PoolClient,
    companyId: string,
    partyType: OpeningBalancePartyType,
    partyId: string,
  ): Promise<PartyDbRow> {
    const result = await client.query<PartyDbRow>(
      `
        SELECT
          id,
          customer_code,
          supplier_code,
          name,
          currency_id
        FROM parties
        WHERE id = $1
          AND company_id = $2
         -- AND party_type = $3
        LIMIT 1
      `,
      [partyId, companyId],
    );

    if (!result.rows.length) {
      throw new Error(
        `${partyType === "customer" ? "Customer" : "Supplier"} not found`,
      );
    }

    return result.rows[0];
  }

  /**
   * Create opening balance lines.
   *
   * This method expects the caller to already have a transaction.
   */
  static async create(
    client: PoolClient,
    companyId: string,
    partyType: OpeningBalancePartyType,
    rawPayload: unknown,
  ): Promise<OpeningBalanceRow[]> {
    const payload = this.validatePayload(rawPayload);

    const tableName = this.getTableName(partyType);

    const createdRows: OpeningBalanceRow[] = [];

    for (const rawLine of payload.lines) {
      const line = this.normalizeInput(rawLine);

      const party = await this.validateParty(
        client,
        companyId,
        partyType,
        line.party_id,
      );

      const partyCode =
        line.party_code ||
        (partyType == "customer" ? party.customer_code : party.supplier_code) ||
        null;

      const partyName = line.party_name || party.name;

      const currencyId = line.currency_id || party.currency_id || null;

      /*
       * LCY amount:
       *
       * (Debit - Credit) * Exchange Rate
       */
      const amountLcy =
        (Number(line.debit || 0) - Number(line.credit || 0)) *
        Number(line.exchange_rate || 1);

      const InertQry = `
          INSERT INTO ${tableName} (
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
           -- amount_lcy,

            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
           -- $15,
            NOW(),
            NOW()
          )
          RETURNING *
        `;

      const qryParam = [
        companyId,

        line.party_id,
        partyCode,
        partyName,

        line.posting_date,

        line.doc_type,
        line.doc_no || "",
        line.external_ref_no || "",

        line.description || "",

        currencyId,
        line.currency_code,

        line.debit || 0,
        line.credit || 0,

        line.exchange_rate || 1,
        // amountLcy,
      ];

      // console.log("InertQry === ", InertQry);
      // console.log("qryParam === ", qryParam);

      const result = await client.query<OpeningBalanceDbRow>(
        InertQry,
        qryParam,
      );

      createdRows.push(this.mapRow(result.rows[0]));
    }

    return createdRows;
  }

  /**
   * Fetch all opening balance records for a company.
   *
   * Optional partyId can filter by customer/supplier.
   */
  static async list(
    companyId: string,
    partyType: OpeningBalancePartyType,
    partyId?: string,
  ): Promise<OpeningBalanceRow[]> {
    const tableName = this.getTableName(partyType);

    const values: string[] = [companyId];

    let whereSql = `
      WHERE company_id = $1
    `;

    if (partyId) {
      values.push(partyId);

      whereSql += `
        AND party_id = $${values.length}
      `;
    }

    const result = await pool.query<OpeningBalanceDbRow>(
      `
          SELECT
            id,
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
            amount_lcy,

            created_at,
            updated_at

          FROM ${tableName}

          ${whereSql}

          ORDER BY
            posting_date ASC,
            created_at ASC
        `,
      values,
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Fetch one opening balance record.
   */
  static async get(
    companyId: string,
    partyType: OpeningBalancePartyType,
    id: string,
  ): Promise<OpeningBalanceRow | null> {
    const tableName = this.getTableName(partyType);

    const result = await pool.query<OpeningBalanceDbRow>(
      `
          SELECT
            id,
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
            amount_lcy,

            created_at,
            updated_at

          FROM ${tableName}

          WHERE id = $1
            AND company_id = $2

          LIMIT 1
        `,
      [id, companyId],
    );

    if (!result.rows.length) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async update(
    client: PoolClient,
    companyId: string,
    id: string,
    partyType: OpeningBalancePartyType,
    rawPayload: unknown,
  ): Promise<OpeningBalanceRow> {
    if (
      typeof rawPayload !== "object" ||
      rawPayload === null ||
      Array.isArray(rawPayload)
    ) {
      throw new Error("Invalid request body");
    }

    const body = rawPayload as Record<string, unknown>;

    let payloadToValidate: unknown;

    if (Array.isArray(body.lines)) {
      if (body.lines.length !== 1) {
        throw new Error(
          "Update requires exactly one line. Use POST to create multiple lines.",
        );
      }

      payloadToValidate = { lines: body.lines };
    } else {
      // Allow a single line object directly in the request body.
      payloadToValidate = { lines: [body] };
    }

    const payload = this.validatePayload(payloadToValidate);
    const line = payload.lines[0];

    const tableName = this.getTableName(partyType);

    // Verify the target row belongs to this company and table.
    const existingResult = await client.query(
      `
        SELECT id
        FROM ${tableName}
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
      `,
      [id, companyId],
    );

    if (!existingResult.rows.length) {
      throw new Error("Opening balance record not found");
    }

    // Verify the selected customer/supplier belongs to this company.
    const party = await this.validateParty(
      client,
      companyId,
      partyType,
      line.party_id,
    );

    const partyCode =
      line.party_code ||
      (partyType == "customer" ? party.customer_code : party.supplier_code) ||
      null;
    const partyName = line.party_name || party.name;
    const currencyId = line.currency_id || party.currency_id || null;

    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    const exchangeRate = Number(line.exchange_rate || 1);

    // Debit/credit are stored in document currency.
    // LCY = (Debit - Credit) * Exchange Rate.
    const amountLcy = (debit - credit) * exchangeRate;

    const result = await client.query<OpeningBalanceDbRow>(
      `
        UPDATE ${tableName}
        SET
          party_id = $1,
          party_code = $2,
          party_name = $3,
          posting_date = $4,
          doc_type = $5,
          doc_no = $6,
          external_ref_no = $7,
          description = $8,
          currency_id = $9,
          currency_code = $10,
          debit = $11,
          credit = $12,
          exchange_rate = $13,
         -- amount_lcy = $14,
          updated_at = NOW()
        WHERE id = $14
          AND company_id = $15
        RETURNING *
      `,
      [
        line.party_id,
        partyCode,
        partyName,
        line.posting_date,
        line.doc_type,
        line.doc_no || "",
        line.external_ref_no || "",
        line.description || "",
        currencyId,
        line.currency_code,
        debit,
        credit,
        exchangeRate,
        // amountLcy,
        id,
        companyId,
      ],
    );

    if (!result.rows.length) {
      throw new Error("Opening balance record not found");
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete one opening balance line.
   */
  static async delete(
    companyId: string,
    id: string,
    partyType: OpeningBalancePartyType,
  ): Promise<void> {
    const tableName = this.getTableName(partyType);

    const result = await pool.query(
      `
        DELETE FROM ${tableName}
        WHERE id = $1
          AND company_id = $2
        RETURNING id
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      throw new Error("Opening balance record not found");
    }
  }

  static async post(
    companyId: string,
    id: string,
    partyType: OpeningBalancePartyType,
    postedBy?: string,
  ): Promise<void> {
    const client = await pool.connect();

    const tableName = this.getTableName(partyType);
    const isSupplier = partyType === "supplier";

    const subLedgerTable = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";

    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    try {
      await client.query("BEGIN");

      // 1. Lock the source record to prevent duplicate posting.
      const openingResult = await client.query(
        `
        SELECT
          id,
          company_id,
          party_id,
          party_code,
          party_name,
          posting_date,
          doc_type,
          doc_no,
          external_ref_no,
          description,
          currency_id,
          currency_code,
          debit,
          credit,
          exchange_rate,
          status
        FROM ${tableName}
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
      `,
        [id, companyId],
      );

      if (!openingResult.rows.length) {
        throw new Error("Opening balance record not found.");
      }

      const opening = openingResult.rows[0];

      if (opening.status === "Posted") {
        throw new Error("This opening balance has already been posted.");
      }

      if (opening.status !== "Open") {
        throw new Error("Only open opening balances can be posted.");
      }

      // 2. Validate posting date.
      const postingDate =
        opening.posting_date instanceof Date
          ? opening.posting_date.toISOString().split("T")[0]
          : String(opening.posting_date).split("T")[0];

      const gateCheck = await validateLedgerPostingDate(companyId, postingDate);

      if (!gateCheck.allowed) {
        throw new Error(gateCheck.reason);
      }

      // 3. Validate amounts and calculate base-currency amounts.
      const debitFCY = Number(opening.debit ?? 0);
      const creditFCY = Number(opening.credit ?? 0);
      const exchangeRate = Number(opening.exchange_rate ?? 1);

      if (
        !Number.isFinite(debitFCY) ||
        !Number.isFinite(creditFCY) ||
        debitFCY < 0 ||
        creditFCY < 0
      ) {
        throw new Error("Invalid opening balance debit or credit.");
      }

      if (debitFCY > 0 && creditFCY > 0) {
        throw new Error("A line cannot have both debit and credit.");
      }

      if (debitFCY === 0 && creditFCY === 0) {
        throw new Error("Opening balance amount must be greater than zero.");
      }

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new Error("Exchange rate must be greater than zero.");
      }

      const debitLCY = Number((debitFCY * exchangeRate).toFixed(2));
      const creditLCY = Number((creditFCY * exchangeRate).toFixed(2));

      if (debitLCY === 0 && creditLCY === 0) {
        throw new Error("Opening balance is zero in local currency.");
      }

      // 4. Verify party belongs to this company.
      const party = await this.validateParty(
        client,
        companyId,
        partyType,
        opening.party_id,
      );

      // 5. Resolve the party's configured control account.
      //
      // Keep the resolution consistent with JournalService:
      // posting group -> direct party account -> company fallback.
      let controlAccountId: string | null = null;

      if (isSupplier) {
        const groupResult = await client.query(
          `
          SELECT ppg.payable_account_id AS account_id
          FROM parties p
          LEFT JOIN purchase_posting_groups ppg
            ON p.posting_group::uuid = ppg.posting_group_id
          WHERE p.id = $1
            AND p.company_id = $2
          LIMIT 1
        `,
          [opening.party_id, companyId],
        );

        controlAccountId = groupResult.rows[0]?.account_id || null;

        if (!controlAccountId) {
          const directResult = await client.query(
            `
            SELECT gl_account_payable AS account_id
            FROM parties
            WHERE id = $1
              AND company_id = $2
            LIMIT 1
          `,
            [opening.party_id, companyId],
          );

          controlAccountId = directResult.rows[0]?.account_id || null;
        }

        if (!controlAccountId) {
          const fallbackResult = await client.query(
            `
            SELECT payable_account_id AS account_id
            FROM purchase_posting_groups
            WHERE company_id = $1
            ORDER BY created_at ASC
            LIMIT 1
          `,
            [companyId],
          );

          controlAccountId = fallbackResult.rows[0]?.account_id || null;
        }
      } else {
        const groupResult = await client.query(
          `
          SELECT spg.receivable_account_id AS account_id
          FROM parties p
          LEFT JOIN sales_posting_groups spg
            ON p.posting_group::uuid = spg.posting_group_id
          WHERE p.id = $1
            AND p.company_id = $2
          LIMIT 1
        `,
          [opening.party_id, companyId],
        );

        controlAccountId = groupResult.rows[0]?.account_id || null;

        if (!controlAccountId) {
          const directResult = await client.query(
            `
            SELECT gl_account_receivable AS account_id
            FROM parties
            WHERE id = $1
              AND company_id = $2
            LIMIT 1
          `,
            [opening.party_id, companyId],
          );

          controlAccountId = directResult.rows[0]?.account_id || null;
        }

        if (!controlAccountId) {
          const fallbackResult = await client.query(
            `
            SELECT receivable_account_id AS account_id
            FROM sales_posting_groups
            WHERE company_id = $1
            ORDER BY created_at ASC
            LIMIT 1
          `,
            [companyId],
          );

          controlAccountId = fallbackResult.rows[0]?.account_id || null;
        }
      }

      if (!controlAccountId) {
        throw new Error(
          `No G/L control account configured for ${partyType} ${opening.party_id}.`,
        );
      }

      // 6. Resolve the company's opening balance equity account.
      // This is configured once per company in company_finance_setup.
      const setupResult = await client.query(
        `
        SELECT opening_balance_equity_account_id
        FROM company_finance_setup
        WHERE company_id = $1
        LIMIT 1
      `,
        [companyId],
      );

      const equityAccountId =
        setupResult.rows[0]?.opening_balance_equity_account_id || null;

      if (!equityAccountId) {
        throw new Error(
          "Opening balance equity G/L account is not configured for this company.",
        );
      }

      // 7. Validate both G/L accounts.
      await GLValidationService.validateAccount(client, controlAccountId);
      await GLValidationService.validateAccount(client, equityAccountId);

      if (controlAccountId === equityAccountId) {
        throw new Error(
          "The party control account and opening balance equity account must be different.",
        );
      }

      // 8. Get a document reference.
      // Use the document number when provided; otherwise generate a stable
      // reference from the opening balance record ID.
      const documentNo =
        String(opening.doc_no || "").trim() ||
        `OB-${isSupplier ? "SUP" : "CUS"}-${id}`;

      const reference = String(opening.external_ref_no || "").trim() || null;

      const description =
        String(opening.description || "").trim() ||
        `${isSupplier ? "Supplier" : "Customer"} opening balance`;

      const currencyId = opening.currency_id || null;

      // 9. Build the balanced posting legs.
      //
      // The equity entry is the exact opposite of the party entry in LCY.
      const legs = [
        {
          accountId: controlAccountId,
          debit: debitLCY,
          credit: creditLCY,
          debitFcy: debitFCY,
          creditFcy: creditFCY,
          partyType,
          partyId: opening.party_id as string | null,
          description,
        },
        {
          accountId: equityAccountId,
          debit: creditLCY,
          credit: debitLCY,
          debitFcy: creditFCY,
          creditFcy: debitFCY,
          partyType: null,
          partyId: null,
          description: `Opening balance offset - ${documentNo}`,
        },
      ];

      GLValidationService.validateBalanced(
        legs.map((leg) => ({
          debit: leg.debit,
          credit: leg.credit,
        })),
      );

      // 10. Insert both G/L entries.
      let partyGlEntryId: string | null = null;

      for (const leg of legs) {
        const txResult = await client.query(
          `SELECT nextval('gl_transaction_id_seq') AS tx_id`,
        );

        const transactionId = Number(txResult.rows[0].tx_id);

        const glResult = await client.query(
          `
          INSERT INTO gl_ledger_entries (
            company_id,
            account_id,
            transaction_id,
            vat_transaction_id,
            vat_settlement_transaction_id,
            source_journal_id,
            entry_no,
            posting_date,
            source_type,
            reference,
            description,
            debit,
            credit,
            currency_id,
            exchange_rate,
            debit_fcy,
            credit_fcy,
            source_document_id,
            source_document_no,
            party_type,
            party_id,
            document_no,
            posted_at
          )
          VALUES (
            $1, $2, $3, NULL, NULL, NULL,
            $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16,
            $17::sub_ledger_type, $18, $19, NOW()
          )
          RETURNING id
        `,
          [
            companyId,
            leg.accountId,
            transactionId,
            documentNo,
            postingDate,
            isSupplier
              ? "SUPPLIER_OPENING_BALANCE"
              : "CUSTOMER_OPENING_BALANCE",
            reference,
            leg.description,
            leg.debit,
            leg.credit,
            currencyId,
            exchangeRate,
            leg.debitFcy,
            leg.creditFcy,
            id,
            documentNo,
            leg.partyType,
            leg.partyId,
            documentNo,
          ],
        );

        if (leg.partyId) {
          partyGlEntryId = glResult.rows[0].id;
        }
      }

      if (!partyGlEntryId) {
        throw new Error("Failed to create the party G/L ledger entry.");
      }

      // 11. Determine sub-ledger document type.
      //
      // Opening balances are represented as open customer/vendor documents.
      // Payment and refund types are mapped explicitly for compatibility.
      const rawDocType = String(opening.doc_type || "Invoice")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

      let subLedgerDocType: string;

      if (rawDocType === "REFUND") {
        subLedgerDocType = "REFUND";
      } else if (rawDocType === "DEBIT_NOTE") {
        subLedgerDocType = "DEBIT_NOTE";
      } else if (rawDocType === "CREDIT_NOTE" || rawDocType === "CREDIT_MEMO") {
        subLedgerDocType = isSupplier ? "CREDIT_MEMO" : "CREDIT_NOTE";
      } else if (rawDocType === "PAYMENT" || rawDocType === "VENDOR_PAYMENT") {
        subLedgerDocType = isSupplier ? "VENDOR_PAYMENT" : "PAYMENT";
      } else {
        subLedgerDocType = isSupplier ? "PURCHASE_INVOICE" : "SALES_INVOICE";
      }

      // 12. Calculate signed sub-ledger balances.
      //
      // Customer: debit increases the receivable.
      // Supplier: credit increases the payable.
      const originalAmountFCY = isSupplier
        ? creditFCY - debitFCY
        : debitFCY - creditFCY;

      const originalAmountLCY = isSupplier
        ? creditLCY - debitLCY
        : debitLCY - creditLCY;

      // 13. Create the open customer/vendor ledger document.
      const subLedgerResult = await client.query(
        `
        INSERT INTO ${subLedgerTable} (
          company_id,
          ${partyColumn},
          document_type,
          document_id,
          document_no,
          posting_date,
          description,
          currency_id,
          exchange_rate,
          original_amount_fcy,
          remaining_amount_fcy,
          original_amount_lcy,
          remaining_amount_lcy,
          is_open,
          journal_entry_id,
          journal_line_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $10, $11, $11, true, NULL, NULL,
          NOW(), NOW()
        )
        RETURNING id
      `,
        [
          companyId,
          opening.party_id,
          subLedgerDocType,
          id,
          documentNo,
          postingDate,
          description,
          currencyId,
          exchangeRate,
          originalAmountFCY,
          originalAmountLCY,
        ],
      );

      const subLedgerEntryId = subLedgerResult.rows[0]?.id;

      if (!subLedgerEntryId) {
        throw new Error("Failed to create the party sub-ledger entry.");
      }

      // 14. Mark the opening balance as posted.
      //
      // Adjust these tracking columns to match your actual table schema.
      await client.query(
        `
        UPDATE ${tableName}
        SET
          status = 'Posted',
          posted_at = NOW(),
          posted_by = $1,
          gl_ledger_entry_id = $2,
          general_ledger_document_no = $3,
          updated_at = NOW()
        WHERE id = $4
          AND company_id = $5
          AND status = 'Open'
      `,
        [postedBy || null, partyGlEntryId, documentNo, id, companyId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
