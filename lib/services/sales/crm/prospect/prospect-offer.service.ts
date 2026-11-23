// lib/services/sales/crm/prospect/prospect-offer.service.ts

import { pool } from "@/lib/db";
import type { PoolClient, QueryResultRow } from "pg";

import {
  ProspectOfferPayloadSchema,
  ProspectOfferPrimarySchema,
  ProspectOfferStatusSchema,
  type ProspectOfferPayload,
} from "@/lib/validations/prospect.schema";

import type {
  ProspectOffer,
  ProspectOfferDefaults,
  ProspectOfferLine,
  ProspectOfferStatus,
} from "@/types/prospect";

/* ============================================================
   CONSTANTS / HELPERS
============================================================ */

/** Offers in these statuses can still have their lines changed. */
const EDITABLE_STATUSES: ProspectOfferStatus[] = ["DRAFT", "SENT"];

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class ProspectOfferError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "ProspectOfferError";
  }
}

interface ProspectRow extends QueryResultRow {
  id: string;
  currency_id: string | null;
  vat_business_group_id: string | null;
}

interface ItemRow extends QueryResultRow {
  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  vat_product_group_id: string | null;
  base_uom_id: string | null;
  uom_code: string | null;
  uom_name: string | null;
}

interface VatSetupRow extends QueryResultRow {
  id: string;
  vat_product_group_id: string;
  vat_rate: string | number | null;
  sales_vat_account_id: string | null;
}

type CalculatedLine = Omit<
  ProspectOfferLine,
  "id" | "offer_id" | "company_id" | "created_at" | "updated_at"
>;

type CalculatedTotals = {
  subtotal: number;
  discount_total: number;
  taxable_amount: number;
  vat_total: number;
  grand_total: number;
};

/* ============================================================
   SERVICE
============================================================ */

export class ProspectOfferService {
  /* ----------------------------------------------------------
     READ
  ---------------------------------------------------------- */

  static async list(
    companyId: string,
    prospectId: string,
  ): Promise<{ offers: ProspectOffer[]; defaults: ProspectOfferDefaults }> {
    const prospect = await this.getProspect(pool, companyId, prospectId);

    const offersResult = await pool.query<ProspectOffer>(
      `
      SELECT
        o.*,
        c.code AS currency_code
      FROM public.prospect_offers o
      LEFT JOIN public.currencies c ON c.id = o.currency_id
      WHERE o.company_id = $1
        AND o.prospect_id = $2
      ORDER BY o.is_primary DESC, o.offer_date DESC, o.created_at DESC
      `,
      [companyId, prospectId],
    );

    const offerIds = offersResult.rows.map((offer) => offer.id);

    const linesResult = offerIds.length
      ? await pool.query<ProspectOfferLine>(
          `
          SELECT *
          FROM public.prospect_offer_lines
          WHERE company_id = $1
            AND offer_id = ANY($2::uuid[])
          ORDER BY offer_id, line_no
          `,
          [companyId, offerIds],
        )
      : { rows: [] as ProspectOfferLine[] };

    const linesByOffer = new Map<string, ProspectOfferLine[]>();

    for (const line of linesResult.rows) {
      const list = linesByOffer.get(line.offer_id) ?? [];
      list.push(line);
      linesByOffer.set(line.offer_id, list);
    }

    const offers = offersResult.rows.map((offer) => ({
      ...offer,
      lines: linesByOffer.get(offer.id) ?? [],
    }));

    const defaults = await this.getDefaults(companyId, prospect);

    return { offers, defaults };
  }

  static async getById(
    companyId: string,
    prospectId: string,
    offerId: string,
    client: PoolClient | typeof pool = pool,
  ): Promise<ProspectOffer | null> {
    const offerResult = await client.query<ProspectOffer>(
      `
      SELECT
        o.*,
        c.code AS currency_code
      FROM public.prospect_offers o
      LEFT JOIN public.currencies c ON c.id = o.currency_id
      WHERE o.id = $1
        AND o.company_id = $2
        AND o.prospect_id = $3
      LIMIT 1
      `,
      [offerId, companyId, prospectId],
    );

    const offer = offerResult.rows[0];

    if (!offer) return null;

    const linesResult = await client.query<ProspectOfferLine>(
      `
      SELECT *
      FROM public.prospect_offer_lines
      WHERE company_id = $1
        AND offer_id = $2
      ORDER BY line_no
      `,
      [companyId, offerId],
    );

    return { ...offer, lines: linesResult.rows };
  }

  /* ----------------------------------------------------------
     CREATE
  ---------------------------------------------------------- */

  static async create(
    companyId: string,
    userId: string,
    prospectId: string,
    body: unknown,
  ): Promise<ProspectOffer> {
    const payload = ProspectOfferPayloadSchema.parse(body);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospect = await this.getProspect(
        client,
        companyId,
        prospectId,
        true,
      );

      await this.validateCurrency(client, companyId, payload.currency_id);

      const { lines, totals } = await this.calculate(
        client,
        companyId,
        prospect,
        payload,
      );

      const sequenceResult = await client.query<{ code: string | null }>(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "prospect_offer"],
      );

      const offerNo = sequenceResult.rows[0]?.code;

      if (!offerNo) {
        throw new ProspectOfferError(
          "Offer numbering is not set up. Add a 'prospect_offer' sequence for this company.",
        );
      }

      /* First offer of a prospect is always primary. */
      const existingCount = await client.query<{ count: string }>(
        `
        SELECT COUNT(*)::text AS count
        FROM public.prospect_offers
        WHERE company_id = $1
          AND prospect_id = $2
        `,
        [companyId, prospectId],
      );

      const makePrimary =
        payload.is_primary || Number(existingCount.rows[0]?.count ?? 0) === 0;

      if (makePrimary) {
        await this.clearPrimary(client, companyId, prospectId);
      }

      const insertResult = await client.query<{ id: string }>(
        `
        INSERT INTO public.prospect_offers (
          company_id, prospect_id, offer_no,
          offer_date, valid_until, status,
          currency_id, exchange_rate,
          subtotal, discount_total, taxable_amount, vat_total, grand_total,
          is_primary, notes,
          created_by, updated_by
        )
        VALUES (
          $1, $2, $3,
          $4, $5, 'DRAFT',
          $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14,
          $15, $15
        )
        RETURNING id
        `,
        [
          companyId,
          prospectId,
          offerNo,
          payload.offer_date,
          payload.valid_until,
          payload.currency_id,
          payload.exchange_rate,
          totals.subtotal,
          totals.discount_total,
          totals.taxable_amount,
          totals.vat_total,
          totals.grand_total,
          makePrimary,
          payload.notes,
          userId,
        ],
      );

      const offerId = insertResult.rows[0].id;

      await this.insertLines(client, companyId, offerId, lines);

      await client.query("COMMIT");

      return (await this.getById(companyId, prospectId, offerId))!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ----------------------------------------------------------
     UPDATE (header + full line replacement)
  ---------------------------------------------------------- */

  static async update(
    companyId: string,
    userId: string,
    prospectId: string,
    offerId: string,
    body: unknown,
  ): Promise<ProspectOffer> {
    const payload = ProspectOfferPayloadSchema.parse(body);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospect = await this.getProspect(
        client,
        companyId,
        prospectId,
        true,
      );

      const current = await this.lockOffer(
        client,
        companyId,
        prospectId,
        offerId,
      );

      if (!EDITABLE_STATUSES.includes(current.status)) {
        throw new ProspectOfferError(
          `A ${current.status.toLowerCase()} offer cannot be edited.`,
        );
      }

      await this.validateCurrency(client, companyId, payload.currency_id);

      const { lines, totals } = await this.calculate(
        client,
        companyId,
        prospect,
        payload,
      );

      if (payload.is_primary && !current.is_primary) {
        await this.clearPrimary(client, companyId, prospectId);
      }

      await client.query(
        `
        UPDATE public.prospect_offers
        SET
          offer_date = $1,
          valid_until = $2,
          currency_id = $3,
          exchange_rate = $4,
          subtotal = $5,
          discount_total = $6,
          taxable_amount = $7,
          vat_total = $8,
          grand_total = $9,
          is_primary = $10,
          notes = $11,
          updated_by = $12,
          updated_at = NOW()
        WHERE id = $13
          AND company_id = $14
        `,
        [
          payload.offer_date,
          payload.valid_until,
          payload.currency_id,
          payload.exchange_rate,
          totals.subtotal,
          totals.discount_total,
          totals.taxable_amount,
          totals.vat_total,
          totals.grand_total,
          current.is_primary || payload.is_primary,
          payload.notes,
          userId,
          offerId,
          companyId,
        ],
      );

      await client.query(
        `
        DELETE FROM public.prospect_offer_lines
        WHERE company_id = $1
          AND offer_id = $2
        `,
        [companyId, offerId],
      );

      await this.insertLines(client, companyId, offerId, lines);

      await client.query("COMMIT");

      return (await this.getById(companyId, prospectId, offerId))!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ----------------------------------------------------------
     STATUS / PRIMARY / DELETE
  ---------------------------------------------------------- */

  static async setStatus(
    companyId: string,
    userId: string,
    prospectId: string,
    offerId: string,
    body: unknown,
  ): Promise<ProspectOffer> {
    const { status } = ProspectOfferStatusSchema.parse(body);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await this.lockOffer(
        client,
        companyId,
        prospectId,
        offerId,
      );

      if (current.status === "CANCELLED" && status !== "CANCELLED") {
        throw new ProspectOfferError("A cancelled offer cannot be reopened.");
      }

      await client.query(
        `
        UPDATE public.prospect_offers
        SET status = $1, updated_by = $2, updated_at = NOW()
        WHERE id = $3 AND company_id = $4
        `,
        [status, userId, offerId, companyId],
      );

      await client.query("COMMIT");

      return (await this.getById(companyId, prospectId, offerId))!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async setPrimary(
    companyId: string,
    userId: string,
    prospectId: string,
    offerId: string,
    body: unknown,
  ): Promise<ProspectOffer> {
    const { is_primary } = ProspectOfferPrimarySchema.parse(body);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await this.lockOffer(client, companyId, prospectId, offerId);

      if (is_primary) {
        await this.clearPrimary(client, companyId, prospectId);
      }

      await client.query(
        `
        UPDATE public.prospect_offers
        SET is_primary = $1, updated_by = $2, updated_at = NOW()
        WHERE id = $3 AND company_id = $4
        `,
        [is_primary, userId, offerId, companyId],
      );

      await client.query("COMMIT");

      return (await this.getById(companyId, prospectId, offerId))!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(
    companyId: string,
    prospectId: string,
    offerId: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await this.lockOffer(
        client,
        companyId,
        prospectId,
        offerId,
      );

      if (current.status !== "DRAFT") {
        throw new ProspectOfferError(
          "Only draft offers can be deleted. Cancel the offer instead.",
        );
      }

      await client.query(
        `DELETE FROM public.prospect_offers WHERE id = $1 AND company_id = $2`,
        [offerId, companyId],
      );

      /* Promote the most recent remaining offer to primary. */
      if (current.is_primary) {
        await client.query(
          `
          UPDATE public.prospect_offers
          SET is_primary = true, updated_at = NOW()
          WHERE id = (
            SELECT id
            FROM public.prospect_offers
            WHERE company_id = $1
              AND prospect_id = $2
            ORDER BY offer_date DESC, created_at DESC
            LIMIT 1
          )
          `,
          [companyId, prospectId],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ============================================================
     INTERNALS
  ============================================================ */

  private static async getProspect(
    client: PoolClient | typeof pool,
    companyId: string,
    prospectId: string,
    lock = false,
  ): Promise<ProspectRow> {
    const result = await client.query<ProspectRow>(
      `
      SELECT id, currency_id, vat_business_group_id
      FROM public.prospects
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      ${lock ? "FOR UPDATE" : ""}
      `,
      [prospectId, companyId],
    );

    const prospect = result.rows[0];

    if (!prospect) {
      throw new ProspectOfferError("Prospect not found.", 404);
    }

    return prospect;
  }

  private static async lockOffer(
    client: PoolClient,
    companyId: string,
    prospectId: string,
    offerId: string,
  ): Promise<{ status: ProspectOfferStatus; is_primary: boolean }> {
    const result = await client.query<{
      status: ProspectOfferStatus;
      is_primary: boolean;
    }>(
      `
      SELECT status, is_primary
      FROM public.prospect_offers
      WHERE id = $1
        AND company_id = $2
        AND prospect_id = $3
      FOR UPDATE
      `,
      [offerId, companyId, prospectId],
    );

    const offer = result.rows[0];

    if (!offer) {
      throw new ProspectOfferError("Offer not found.", 404);
    }

    return offer;
  }

  private static async clearPrimary(
    client: PoolClient,
    companyId: string,
    prospectId: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE public.prospect_offers
      SET is_primary = false, updated_at = NOW()
      WHERE company_id = $1
        AND prospect_id = $2
        AND is_primary = true
      `,
      [companyId, prospectId],
    );
  }

  private static async validateCurrency(
    client: PoolClient,
    companyId: string,
    currencyId: string,
  ): Promise<void> {
    const result = await client.query(
      `
      SELECT c.id
      FROM public.currencies c
      INNER JOIN public.company_currencies cc
        ON cc.currency_id = c.id
       AND cc.company_id = $2
       AND cc.status = 1
      WHERE c.id = $1
        AND c.status = 1
      LIMIT 1
      `,
      [currencyId, companyId],
    );

    if (!result.rows.length) {
      throw new ProspectOfferError(
        "Selected currency is not enabled for this company.",
      );
    }
  }

  /**
   * Currency defaults to the prospect's currency, else the company's
   * base currency. VAT business group comes from the prospect.
   */
  private static async getDefaults(
    companyId: string,
    prospect: ProspectRow,
  ): Promise<ProspectOfferDefaults> {
    const result = await pool.query<{
      currency_id: string;
      currency_code: string;
      exchange_rate: string;
    }>(
      `
      SELECT
        c.id AS currency_id,
        c.code AS currency_code,
        COALESCE(cc.exchange_rate, 1)::text AS exchange_rate
      FROM public.company_currencies cc
      INNER JOIN public.currencies c ON c.id = cc.currency_id
      WHERE cc.company_id = $1
        AND cc.status = 1
        AND (
          ($2::uuid IS NOT NULL AND c.id = $2::uuid)
          OR ($2::uuid IS NULL AND cc.is_base = true)
        )
      ORDER BY cc.is_base DESC
      LIMIT 1
      `,
      [companyId, prospect.currency_id],
    );

    const currency = result.rows[0];

    return {
      currency_id: currency?.currency_id ?? null,
      currency_code: currency?.currency_code ?? null,
      exchange_rate: Number(currency?.exchange_rate ?? 1),
      vat_business_group_id: prospect.vat_business_group_id,
    };
  }

  /**
   * Resolves item snapshots and VAT, and calculates all amounts.
   * Client-submitted totals are never trusted.
   */
  private static async calculate(
    client: PoolClient,
    companyId: string,
    prospect: ProspectRow,
    payload: ProspectOfferPayload,
  ): Promise<{ lines: CalculatedLine[]; totals: CalculatedTotals }> {
    const itemIds = payload.lines.map((line) => line.item_id);

    const itemsResult = await client.query<ItemRow>(
      `
      SELECT
        i.id,
        i.item_code,
        i.name,
        i.description,
        i.vat_product_group_id,
        i.base_uom_id,
        to_jsonb(u) ->> 'code' AS uom_code,
        u.name AS uom_name
      FROM public.items i
      LEFT JOIN public.uoms u ON u.id = i.base_uom_id
      WHERE i.company_id = $1
        AND i.id = ANY($2::uuid[])
        AND i.deleted_at IS NULL
      `,
      [companyId, itemIds],
    );

    const items = new Map(itemsResult.rows.map((item) => [item.id, item]));

    const missing = itemIds.filter((id) => !items.has(id));

    if (missing.length) {
      throw new ProspectOfferError(
        "One or more selected items were not found or have been deleted.",
      );
    }

    /* VAT posting setup per product group for the prospect's business group. */
    const vatByProductGroup = new Map<string, VatSetupRow>();

    const productGroupIds = [
      ...new Set(
        itemsResult.rows
          .map((item) => item.vat_product_group_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (prospect.vat_business_group_id && productGroupIds.length) {
      const vatResult = await client.query<VatSetupRow>(
        `
        SELECT id, vat_product_group_id, vat_rate, sales_vat_account_id
        FROM public.vat_posting_setup
        WHERE company_id = $1
          AND vat_business_group_id = $2
          AND vat_product_group_id = ANY($3::uuid[])
        `,
        [companyId, prospect.vat_business_group_id, productGroupIds],
      );

      for (const row of vatResult.rows) {
        vatByProductGroup.set(row.vat_product_group_id, row);
      }
    }

    const totals: CalculatedTotals = {
      subtotal: 0,
      discount_total: 0,
      taxable_amount: 0,
      vat_total: 0,
      grand_total: 0,
    };

    const lines: CalculatedLine[] = payload.lines.map((input, index) => {
      const item = items.get(input.item_id)!;

      const vat = item.vat_product_group_id
        ? vatByProductGroup.get(item.vat_product_group_id)
        : undefined;

      const quantity = Number(input.quantity);
      const unitPrice = Number(input.unit_price);
      const discountValue = Number(input.discount_value ?? 0);

      const gross = round2(quantity * unitPrice);

      const discountAmount = round2(
        Math.min(
          gross,
          input.discount_type === "PERCENTAGE"
            ? (gross * discountValue) / 100
            : discountValue,
        ),
      );

      const lineSubtotal = round2(gross - discountAmount);
      const vatRate = Number(vat?.vat_rate ?? 0);
      const vatAmount = round2((lineSubtotal * vatRate) / 100);
      const lineTotal = round2(lineSubtotal + vatAmount);

      totals.subtotal += gross;
      totals.discount_total += discountAmount;
      totals.taxable_amount += lineSubtotal;
      totals.vat_total += vatAmount;
      totals.grand_total += lineTotal;

      return {
        line_no: index + 1,

        item_id: item.id,
        item_code: item.item_code,
        item_name: item.name,
        description: input.description ?? null,

        uom_id: item.base_uom_id,
        uom_code: item.uom_code,
        uom_name: item.uom_name,

        quantity,
        unit_price: unitPrice,

        discount_type: input.discount_type,
        discount_value: discountValue,
        discount_amount: discountAmount,

        vat_product_group_id: item.vat_product_group_id,
        vat_posting_setup_id: vat?.id ?? null,
        sales_vat_account_id: vat?.sales_vat_account_id ?? null,

        vat_rate: vatRate,
        line_subtotal: lineSubtotal,
        vat_amount: vatAmount,
        line_total: lineTotal,
      };
    });

    return {
      lines,
      totals: {
        subtotal: round2(totals.subtotal),
        discount_total: round2(totals.discount_total),
        taxable_amount: round2(totals.taxable_amount),
        vat_total: round2(totals.vat_total),
        grand_total: round2(totals.grand_total),
      },
    };
  }

  private static async insertLines(
    client: PoolClient,
    companyId: string,
    offerId: string,
    lines: CalculatedLine[],
  ): Promise<void> {
    for (const line of lines) {
      await client.query(
        `
        INSERT INTO public.prospect_offer_lines (
          offer_id, company_id, line_no,
          item_id, item_code, item_name, description,
          uom_id, uom_code, uom_name,
          quantity, unit_price,
          discount_type, discount_value, discount_amount,
          vat_product_group_id, vat_posting_setup_id, sales_vat_account_id,
          vat_rate, line_subtotal, vat_amount, line_total
        )
        VALUES (
          $1, $2, $3,
          $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22
        )
        `,
        [
          offerId,
          companyId,
          line.line_no,
          line.item_id,
          line.item_code,
          line.item_name,
          line.description,
          line.uom_id,
          line.uom_code,
          line.uom_name,
          line.quantity,
          line.unit_price,
          line.discount_type,
          line.discount_value,
          line.discount_amount,
          line.vat_product_group_id,
          line.vat_posting_setup_id,
          line.sales_vat_account_id,
          line.vat_rate,
          line.line_subtotal,
          line.vat_amount,
          line.line_total,
        ],
      );
    }
  }
}
