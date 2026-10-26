// app/api/parties/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";

import { priceListsSchema } from "@/lib/validations/price-list.schema";

import { z } from "zod";

type PartyContactInput = z.infer<typeof PartyContactSchema>;
type PartyAddressInput = z.infer<typeof PartyAddressSchema>;
type PriceListsInput = z.infer<typeof priceListsSchema>;

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await pool.connect();

  try {
    const party = await client.query(
      `
      SELECT 
        p.*,
        ar.code AS gl_account_receivable_code,
        ar.name AS gl_account_receivable_name,
        ap.code AS gl_account_payable_code,
        ap.name AS gl_account_payable_name
      FROM parties p
      LEFT JOIN chart_of_accounts ar 
        ON NULLIF(p.gl_account_receivable, '')::uuid = ar.id
      LEFT JOIN chart_of_accounts ap 
        ON NULLIF(p.gl_account_payable, '')::uuid = ap.id
      WHERE p.id = $1 AND p.company_id = $2
      `,
      [id, companyId],
    );

    if (!party.rows[0]) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const contacts = await client.query(
      `SELECT * FROM party_contacts WHERE party_id = $1 ORDER BY is_primary DESC, id ASC`,
      [id],
    );

    const addresses = await client.query(
      `SELECT * FROM party_addresses WHERE party_id = $1 ORDER BY is_primary DESC, id ASC`,
      [id],
    );

    // Fetch Price Lists with Items and Volume Discounts
    const priceListsResult = await client.query(
      `
      SELECT 
        pl.id,
        pl.company_id,
        pl.name,
        pl.list_type,
        pl.party_id,
        pl.salesperson_id,
        (SELECT CONCAT(emp.employee_code, '-', emp.display_name) FROM employees emp WHERE emp.id = pl.salesperson_id) AS salesperson_name,
        pl.offer_method,
        TO_CHAR(pl.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(pl.end_date, 'YYYY-MM-DD') AS end_date,
        pl.currency_id,
        pl.status,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pli.id,
                'item_id', pli.item_id,
                'item_code', i.item_code,
                'name', i.name,
                'category_name', '',
                'uom_id', pli.uom_id,
                'uom_name', '',
                'standard_price', pli.standard_price,
                'offered_price', pli.offered_price,
                'min_order_qty', pli.min_order_qty,
                'max_order_qty', pli.max_order_qty,
                'has_volume_discount', pli.has_volume_discount,
                'volume_discounts', COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', vd.id,
                        'min_order_qty', vd.min_order_qty,
                        'discount_type', vd.discount_type,
                        'discount_value', vd.discount_value,
                        'discounted_price', vd.discounted_price
                      )
                    ) FROM price_list_volume_discounts vd WHERE vd.price_list_item_id = pli.id
                  ), '[]'::json
                )
              )
            ) FROM price_list_items pli
            JOIN items i ON pli.item_id = i.id
            WHERE pli.price_list_id = pl.id
          ), '[]'::json
        ) AS items
      FROM price_lists pl
      WHERE pl.party_id = $1
      `,
      [id],
    );

    return NextResponse.json({
      account: party.rows[0],
      contacts: contacts.rows,
      addresses: addresses.rows,
      priceLists: priceListsResult.rows,
    });
  } catch (err) {
    console.error("Fetch Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch party data structure" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* ==========================================================
   2. UPDATE PARTY (PUT /api/parties/[id])
============================================================ */
export async function PUT(req: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const rawBody = await req.json();
    const validatedAccount = PartySchema.parse(rawBody.account);

    const rawContacts = Array.isArray(rawBody.contacts) ? rawBody.contacts : [];
    const validatedContacts: PartyContactInput[] = rawContacts.map(
      (c: unknown) => PartyContactSchema.parse(c),
    );

    const rawAddresses = Array.isArray(rawBody.addresses)
      ? rawBody.addresses
      : [];
    const validatedAddresses: PartyAddressInput[] = rawAddresses.map(
      (a: unknown) => PartyAddressSchema.parse(a),
    );

    const priceListsResult = priceListsSchema.safeParse(
      rawBody.priceLists ?? [],
    );

    if (!priceListsResult.success) {
      return NextResponse.json(
        {
          error: "Price list validation failed.",
          issues: priceListsResult.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const rawPriceLists = priceListsResult.data;

    // const rawPriceLists = Array.isArray(rawBody.priceLists)
    //   ? rawBody.priceLists
    //   : [];

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const toCleanOrNull = (val: unknown) => {
        if (
          !val ||
          typeof val !== "string" ||
          val.trim() === "" ||
          val === "undefined" ||
          val === "null"
        ) {
          return null;
        }
        return val.trim();
      };

      // Helper to cleanly handle DATE values
      const toDateOrNull = (val: unknown) => {
        const str = toCleanOrNull(val);
        if (!str) return null;
        const parsedDate = new Date(str);
        return isNaN(parsedDate.getTime()) ? null : str;
      };

      // 1. Core Profile Parameter Field Updates
      const partyUpdateQuery = `
        UPDATE parties SET
          name = $1,
          status = $2,
          is_crm_lead = $3,
          is_srm_vendor = $4,
          is_customer = $5,
          is_supplier = $6,
          email = $7,
          phone = $8,
          mobile = $9,
          website = $10,
          credit_limit = $11,
          currency_id = $12,
          salesperson_id = $13,
          bucket_id = $14,
          vat_reg_no = $15,
          segment_id = $16,
          territory_id = $17,
          buying_group_id = $18,
          credit_rating_id = $19,
          ownership_type_id = $20,
          classification_id = $21,
          type_id = $22,
          status_id = $23,
          source_of_crm_id = $24,
          no_of_emp = $25,
          turnover = $26,
          comp_reg_no = $27,
          date_of_inc = $28,
          additional_information = $29,
          assign_person_id = $30,
          assign_person = $31,
          sales_posting_group_id = $32,
          purchase_posting_group_id = $33,
          anonymous_supplier = $34,
          anonymous_customer = $35,
          
          -- Finance & General Ledger
          finance_contact_person = $36,
          finance_email = $37,
          finance_phone = $38,
          finance_fax = $39,
          finance_alt_contact = $40,
          finance_alt_email = $41,
          payment_terms = $42,
          payment_method = $43,
          company_reg_no = $44,
          supplier_vat_no = $45,
          payable_bank = $46,
          gl_account_receivable = $47,
          gl_account_payable = $48,
          posting_group = $49,
          finance_charge = $50,
          has_finance_charge = $51,
          insurance_charge = $52,
          has_insurance_charge = $53,
          exclude_from_aging_report = $54,

          -- E-Document Flags
          e_reminder = $55,
          e_statement = $56,
          e_invoice = $57,
          e_purchase_order = $58,
          e_debit_note = $59,
          e_remittance_advice = $60,

          -- Bank Details
          bank_account_name = $61,
          bank_sort_code = $62,
          bank_account_no = $63,
          bank_swift_bic = $64,
          bank_iban = $65,
          bank_name = $66,
          bank_address = $67,
          bank_address_2 = $68,
          updated_at = NOW()
        WHERE id = $69 AND company_id = $70
        RETURNING id;
      `;

      const partyValues = [
        validatedAccount.name, // $1
        validatedAccount.status || "active", // $2
        validatedAccount.is_crm_lead, // $3
        validatedAccount.is_srm_vendor, // $4
        validatedAccount.is_customer, // $5
        validatedAccount.is_supplier, // $6
        toCleanOrNull(validatedAccount.email), // $7
        toCleanOrNull(validatedAccount.phone), // $9
        toCleanOrNull(validatedAccount.mobile), // $9
        toCleanOrNull(validatedAccount.website), // $10
        validatedAccount.credit_limit || 0, // $11

        toCleanOrNull(validatedAccount.currency_id), // $12
        toCleanOrNull(validatedAccount.salesperson_id), // $13
        toCleanOrNull(validatedAccount.bucket_id), // $14
        toCleanOrNull(validatedAccount.vat_reg_no), // $15
        toCleanOrNull(validatedAccount.segment_id), // $16
        toCleanOrNull(validatedAccount.territory_id), // $17
        toCleanOrNull(validatedAccount.buying_group_id), // $18
        toCleanOrNull(validatedAccount.credit_rating_id), // $19
        toCleanOrNull(validatedAccount.ownership_type_id), // $20
        toCleanOrNull(validatedAccount.classification_id), // $21
        toCleanOrNull(validatedAccount.type_id), // $22
        toCleanOrNull(validatedAccount.status_id), // $23
        toCleanOrNull(validatedAccount.source_of_crm_id), // $24

        validatedAccount.no_of_emp || 0, // $25
        validatedAccount.turnover || 0, // $26

        toCleanOrNull(validatedAccount.comp_reg_no), // $27
        toDateOrNull(validatedAccount.date_of_inc), // $28
        toCleanOrNull(validatedAccount.additional_information), // $29
        toCleanOrNull(validatedAccount.assign_person_id), // $30
        toCleanOrNull(validatedAccount.assign_person), // $31
        toCleanOrNull(validatedAccount.sales_posting_group_id), // $32
        toCleanOrNull(validatedAccount.purchase_posting_group_id), // $33
        validatedAccount.anonymous_supplier ?? false, // $34
        validatedAccount.anonymous_customer ?? false, // $35

        // Finance Fields ($36 - $54)
        toCleanOrNull(validatedAccount.finance_contact_person),
        toCleanOrNull(validatedAccount.finance_email),
        toCleanOrNull(validatedAccount.finance_phone),
        toCleanOrNull(validatedAccount.finance_fax),
        toCleanOrNull(validatedAccount.finance_alt_contact),
        toCleanOrNull(validatedAccount.finance_alt_email),
        toCleanOrNull(validatedAccount.payment_terms),
        toCleanOrNull(validatedAccount.payment_method),
        toCleanOrNull(validatedAccount.company_reg_no),
        toCleanOrNull(validatedAccount.supplier_vat_no),
        toCleanOrNull(validatedAccount.payable_bank),
        toCleanOrNull(validatedAccount.gl_account_receivable),
        toCleanOrNull(validatedAccount.gl_account_payable),
        toCleanOrNull(validatedAccount.posting_group), //  || "UK"
        toCleanOrNull(validatedAccount.finance_charge),
        validatedAccount.has_finance_charge ?? false,
        toCleanOrNull(validatedAccount.insurance_charge),
        validatedAccount.has_insurance_charge ?? false,
        validatedAccount.exclude_from_aging_report ?? false,

        // E-Document Flags ($55 - $60)
        validatedAccount.e_reminder ?? false,
        validatedAccount.e_statement ?? false,
        validatedAccount.e_invoice ?? false,
        validatedAccount.e_purchase_order ?? false,
        validatedAccount.e_debit_note ?? false,
        validatedAccount.e_remittance_advice ?? false,

        // Bank Account Details ($61 - $67)
        toCleanOrNull(validatedAccount.bank_account_name),
        toCleanOrNull(validatedAccount.bank_sort_code),
        toCleanOrNull(validatedAccount.bank_account_no),
        toCleanOrNull(validatedAccount.bank_swift_bic),
        toCleanOrNull(validatedAccount.bank_iban),
        toCleanOrNull(validatedAccount.bank_name),
        toCleanOrNull(validatedAccount.bank_address),
        toCleanOrNull(validatedAccount.bank_address_2),

        // Record & Tenant Keys ($68 - $69)
        id,
        companyId,
      ];

      const partyResult = await client.query(partyUpdateQuery, partyValues);

      if (partyResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Party not found" }, { status: 404 });
      }

      // 2. Sync Contacts
      await client.query("DELETE FROM party_contacts WHERE party_id = $1", [
        id,
      ]);

      if (validatedContacts.length > 0) {
        const contactQuery = `
          INSERT INTO party_contacts (party_id, name, job_title, email, phone, mobile, is_primary, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        for (const c of validatedContacts) {
          if (c.name && c.name.trim() !== "") {
            await client.query(contactQuery, [
              id,
              c.name,
              c.job_title || null,
              c.email || null,
              c.phone || null,
              c.mobile || null,
              !!c.is_primary,
              c.notes || null,
            ]);
          }
        }
      }

      // 3. Sync Addresses
      await client.query("DELETE FROM party_addresses WHERE party_id = $1", [
        id,
      ]);
      if (validatedAddresses.length > 0) {
        const addressQuery = `
          INSERT INTO party_addresses (
            party_id, label, address_1, address_2, city, state, country, postcode,
            phone, email, is_primary, is_billing, is_shipping, is_collection
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;
        for (const a of validatedAddresses) {
          if (
            (a.address_1 && a.address_1.trim() !== "") ||
            (a.city && a.city.trim() !== "")
          ) {
            await client.query(addressQuery, [
              id,
              a.label || "Main Address",
              a.address_1,
              a.address_2 || null,
              a.city,
              a.state || null,
              toCleanOrNull(a.country),
              a.postcode,
              a.phone || null,
              a.email || null,
              !!a.is_primary,
              !!a.is_billing,
              !!a.is_shipping,
              !!a.is_collection,
            ]);
          }
        }
      }

      // Retrieve current user ID for history audit logging
      const session = await getServerSession(authOptions);
      const currentUserId = session?.user?.id || null;

      // Helper functions for parsing
      const toNumberOrDefault = (val: unknown, fallback: number) => {
        const num = Number(val);
        return Number.isFinite(num) ? num : fallback;
      };

      // 4. Map existing price list items for this party to preserve IDs and track history properly
      const existingPlItemsRes = await client.query(
        `
      SELECT pli.id AS price_list_item_id, pl.id AS price_list_id, pli.item_id 
      FROM price_list_items pli
      JOIN price_lists pl ON pli.price_list_id = pl.id
      WHERE pl.party_id = $1 AND pl.company_id = $2
      `,
        [id, companyId],
      );

      const existingItemsMap = new Map<
        string,
        { priceListItemId: string; priceListId: string }
      >();
      for (const row of existingPlItemsRes.rows) {
        // Key format: itemId_priceListId (or just itemId if unique per list)
        const key = `${row.item_id}_${row.price_list_id}`;
        existingItemsMap.set(key, {
          priceListItemId: row.price_list_item_id,
          priceListId: row.price_list_id,
        });
      }

      // 5. Validate Overlapping Prices & Sync Price Lists, Items, History, and Volume Discounts
      for (const pl of rawPriceLists) {
        const listName = (pl.name as string) || "Price List";
        const startDate = pl.start_date as string;
        const endDate = pl.end_date as string;
        const listType = pl.list_type as string;
        const items = Array.isArray(pl.items) ? pl.items : [];

        if (!startDate || !endDate) {
          throw new Error(
            `Price list "${listName}" must specify valid start and end dates.`,
          );
        }

        for (const item of items) {
          const itemId = item.item_id as string;
          const itemCode = (item.item_code as string) || "SKU";
          const UOM_ID = item.uom_id;

          if (!itemId) continue;

          // Check against other price lists for this party & list type with overlapping dates
          const overlapCheckQry = `
          SELECT pl.id, pl.name, pl.start_date, pl.end_date
          FROM price_lists pl
          JOIN price_list_items pli ON pli.price_list_id = pl.id
          WHERE pl.company_id = $1
            AND pl.party_id = $2 
            AND pl.list_type = $3
            AND pl.status = 1
            AND pli.item_id = $4
            AND pli.uom_id = $5
            AND pl.start_date <= $7::date
            AND pl.end_date >= $6::date
            AND ($8::uuid IS NULL OR pl.id <> $8::uuid)
          LIMIT 1`;

          const overlapCheckParam = [
            companyId,
            id,
            listType,
            itemId,
            UOM_ID,
            startDate,
            endDate,
            pl.id || null,
          ];

          const overlapCheck = await client.query(
            overlapCheckQry,
            overlapCheckParam,
          );

          if (overlapCheck.rows.length > 0) {
            const conflictListName = overlapCheck.rows[0].name;
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `Date overlap validation error: Item [${itemCode}] already has an active price offer in another list ("${conflictListName}") during the selected date range (${startDate} to ${endDate}).`,
              },
              { status: 409 },
            );
          }
        }
      }

      // Clear old price lists for this party before re-syncing
      await client.query("DELETE FROM price_lists WHERE party_id = $1", [id]);

      for (const pl of rawPriceLists) {
        const plResult = await client.query(
          `
        INSERT INTO price_lists (
          company_id, name, list_type, party_id, salesperson_id, offer_method, start_date, end_date, currency_id, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id;
        `,
          [
            companyId,
            pl.name || "Price List",
            pl.list_type,
            id,
            toCleanOrNull(pl.salesperson_id),
            pl.offer_method || "Phone",
            pl.start_date,
            pl.end_date,
            pl.currency_id,
            1,
          ],
        );

        const priceListId = plResult.rows[0].id;
        const items = Array.isArray(pl.items) ? pl.items : [];

        for (const item of items) {
          const itemId = item.item_id;
          const lookupKey = `${itemId}_${pl.id}`;
          let priceListItemId =
            item.id || existingItemsMap.get(lookupKey)?.priceListItemId;

          const newOfferedPrice = toNumberOrDefault(item.offered_price, 0);
          const newMinQty = toNumberOrDefault(item.min_order_qty, 1);
          const newMaxQty = toNumberOrDefault(item.max_order_qty, 100);
          const standardPriceVal = toNumberOrDefault(item.standard_price, 0);

          if (!priceListItemId) {
            // Insert new price list item
            const itemResult = await client.query(
              `
            INSERT INTO price_list_items (
              price_list_id, item_id, uom_id, standard_price, offered_price, min_order_qty, max_order_qty, has_volume_discount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id;
            `,
              [
                priceListId,
                itemId,
                item.uom_id,
                standardPriceVal,
                newOfferedPrice,
                newMinQty,
                newMaxQty,
                Boolean(item.has_volume_discount),
              ],
            );
            priceListItemId = itemResult.rows[0].id;

            // Initial creation history log
            await client.query(
              `
            INSERT INTO price_list_item_history (
              price_list_item_id, new_offered_price, new_min_order_qty, new_max_order_qty, changed_by
            ) VALUES ($1, $2, $3, $4, $5)
            `,
              [
                priceListItemId,
                newOfferedPrice,
                newMinQty,
                newMaxQty,
                currentUserId,
              ],
            );
          } else {
            // Check existing item for modifications to record audit history
            const existingPliRes = await client.query(
              `SELECT offered_price, min_order_qty, max_order_qty FROM price_list_items WHERE id = $1`,
              [priceListItemId],
            );

            if (existingPliRes.rowCount && existingPliRes.rowCount > 0) {
              const oldRow = existingPliRes.rows[0];
              if (
                Number(oldRow.offered_price) !== newOfferedPrice ||
                Number(oldRow.min_order_qty) !== newMinQty ||
                Number(oldRow.max_order_qty) !== newMaxQty
              ) {
                await client.query(
                  `
                INSERT INTO price_list_item_history (
                  price_list_item_id, old_offered_price, new_offered_price, old_min_order_qty, new_min_order_qty, old_max_order_qty, new_max_order_qty, changed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                  [
                    priceListItemId,
                    oldRow.offered_price,
                    newOfferedPrice,
                    oldRow.min_order_qty,
                    newMinQty,
                    oldRow.max_order_qty,
                    newMaxQty,
                    currentUserId,
                  ],
                );
              }
            }

            // Update existing item record
            await client.query(
              `
            UPDATE price_list_items SET
              price_list_id = $1,
              standard_price = $2,
              offered_price = $3,
              min_order_qty = $4,
              max_order_qty = $5,
              has_volume_discount = $6,
              updated_at = NOW()
            WHERE id = $7
            `,
              [
                priceListId,
                standardPriceVal,
                newOfferedPrice,
                newMinQty,
                newMaxQty,
                Boolean(item.has_volume_discount),
                priceListItemId,
              ],
            );
          }

          // Sync Volume Discount Tiers
          await client.query(
            `DELETE FROM price_list_volume_discounts WHERE price_list_item_id = $1`,
            [priceListItemId],
          );

          const volumeDiscounts = Array.isArray(item.volume_discounts)
            ? item.volume_discounts
            : [];
          if (item.has_volume_discount && volumeDiscounts.length > 0) {
            for (const vd of volumeDiscounts) {
              await client.query(
                `
              INSERT INTO price_list_volume_discounts (
                price_list_item_id, min_order_qty, discount_type, discount_value, discounted_price, created_at
              ) VALUES ($1, $2, $3, $4, $5, NOW())
              `,
                [
                  priceListItemId,
                  toNumberOrDefault(vd.min_order_qty, 1),
                  vd.discount_type || "PERCENTAGE",
                  toNumberOrDefault(vd.discount_value, 0),
                  toNumberOrDefault(vd.discounted_price, 0),
                ],
              );
            }
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json(partyResult.rows[0], { status: 200 });
      // return NextResponse.json(
      //   { success: true, account: partyResult.rows[0] },
      //   { status: 200 },
      // );
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      console.error("PUT Mutation Fatal Exception Error:", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Execution Transaction Refused",
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (parseErr: unknown) {
    return NextResponse.json(
      {
        error:
          parseErr instanceof Error
            ? parseErr.message
            : "Payload validation failure.",
      },
      { status: 400 },
    );
  }
}

/* ==========================================================
   3. DELETE PARTY (DELETE /api/parties/[id])
============================================================ */
export async function DELETE(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [id]);
    await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [id]);
    await client.query(`DELETE FROM price_lists WHERE party_id = $1`, [id]);

    const deleteResult = await client.query(
      `DELETE FROM parties WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId],
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Record not found or user lacks authorization." },
        { status: 404 },
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Party record deleted successfully.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Delete operational failure:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete party record.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}


      /* // 4. Validate Overlapping Prices for Same Items in Same Dates for Same Party
      for (const pl of rawPriceLists) {
        const listName = (pl.name as string) || "Price List";
        const startDate = pl.start_date as string;
        const endDate = pl.end_date as string;
        const listType = pl.list_type as string;
        const items = Array.isArray(pl.items) ? pl.items : [];

        if (!startDate || !endDate) {
          throw new Error(
            `Price list "${listName}" must specify valid start and end dates.`,
          );
        }

        for (const item of items) {
          const itemId = item.item_id as string;
          const itemCode = (item.item_code as string) || "SKU";
          const UOM_ID = item.uom_id;

          if (!itemId) continue;

          // Check against other price lists for this party & list type with overlapping dates

          const overlapCheckQry = `
            SELECT pl.id, pl.name, pl.start_date, pl.end_date
            FROM price_lists pl
            JOIN price_list_items pli ON pli.price_list_id = pl.id
            WHERE pl.company_id = $1
              AND pl.party_id = $2 
              AND pl.list_type = $3
              AND pl.status = 1
              AND pli.item_id = $4
              AND pli.uom_id = $5
              AND pl.start_date <= $7::date
              AND pl.end_date >= $6::date
              AND ($8::uuid IS NULL OR pl.id <> $8::uuid)
            LIMIT 1`;

          const overlapCheckParam = [
            companyId,
            id,
            listType,
            itemId,
            UOM_ID,
            startDate,
            endDate,
            pl.id,
          ];

          const overlapCheck = await client.query(
            overlapCheckQry,
            overlapCheckParam,
          );

          if (overlapCheck.rows.length > 0) {
            const conflictListName = overlapCheck.rows[0].name;
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `Date overlap validation error: Item [${itemCode}] already has an active price offer in another list ("${conflictListName}") during the selected date range (${startDate} to ${endDate}).`,
              },
              { status: 409 },
            );
          }
        }
      }

      // 5. Sync Price Lists, Items, and Volume Discounts
      await client.query("DELETE FROM price_lists WHERE party_id = $1", [id]);

      for (const pl of rawPriceLists) {
        const plResult = await client.query(
          `
          INSERT INTO price_lists (
            company_id, name, list_type, party_id, salesperson_id, offer_method, start_date, end_date, currency_id, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id;
          `,
          [
            companyId,
            pl.name || "Price List",
            pl.list_type,
            id,
            toCleanOrNull(pl.salesperson_id),
            pl.offer_method || "Phone",// "Fixed Price",
            pl.start_date,
            pl.end_date,
            pl.currency_id,
            1, // Active status
          ],
        );

        const priceListId = plResult.rows[0].id;
        const items = Array.isArray(pl.items) ? pl.items : [];

        for (const item of items) {
          const itemResult = await client.query(
            `
            INSERT INTO price_list_items (
              price_list_id, item_id, uom_id, standard_price, offered_price, min_order_qty, max_order_qty, has_volume_discount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id;
            `,
            [
              priceListId,
              item.item_id,
              item.uom_id,
              item.standard_price || 0,
              item.offered_price || 0,
              item.min_order_qty || 0,
              item.max_order_qty || null,
              item.has_volume_discount || false,
            ],
          );

          const priceListItemId = itemResult.rows[0].id;
          const volumeDiscounts = Array.isArray(item.volume_discounts)
            ? item.volume_discounts
            : [];

          if (item.has_volume_discount && volumeDiscounts.length > 0) {
            for (const vd of volumeDiscounts) {
              await client.query(
                `
                INSERT INTO price_list_volume_discounts (
                  price_list_item_id, min_order_qty, discount_type, discount_value, discounted_price, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                `,
                [
                  priceListItemId,
                  vd.min_order_qty || 0,
                  vd.discount_type || "PERCENTAGE",
                  vd.discount_value || 0,
                  vd.discounted_price || 0,
                ],
              );
            }
          }
        }
      } */