// app/api/parties/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
// import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";

import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";

import { z } from "zod";

type PartyContactInput = z.infer<typeof PartyContactSchema>;
type PartyAddressInput = z.infer<typeof PartyAddressSchema>;

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
      `SELECT * FROM parties WHERE id = $1 AND company_id = $2`,
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

    return NextResponse.json({
      account: party.rows[0],
      contacts: contacts.rows,
      addresses: addresses.rows,
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
        UPDATE parties
        SET 
          name = $1, status = $2, email = $3, phone = $4, mobile = $5, website = $6,
          credit_limit = $7, currency_id = $8, salesperson_id = $9, bucket_id = $10,
          vat_reg_no = $11, segment_id = $12, territory_id = $13, buying_group_id = $14,
          credit_rating_id = $15, ownership_type_id = $16, classification_id = $17, type_id = $18,
          status_id = $19, source_of_crm_id = $20, no_of_emp = $21, turnover = $22, comp_reg_no = $23,
          date_of_inc = $24, additional_information = $25, assign_person_id = $26, assign_person = $27,
          sales_posting_group_id = $28, purchase_posting_group_id = $29, purchase_posting_group_id = $30, purchase_posting_group_id = $31, updated_at = now()
        WHERE id = $32 AND company_id = $33
        RETURNING id
      `;

      const partyValues = [
        validatedAccount.name, // $1
        validatedAccount.status || "active", // $2
        toCleanOrNull(validatedAccount.email), // $3
        toCleanOrNull(validatedAccount.phone), // $4
        toCleanOrNull(validatedAccount.mobile), // $5
        toCleanOrNull(validatedAccount.website), // $6
        validatedAccount.credit_limit || 0, // $7

        toCleanOrNull(validatedAccount.currency_id), // $8
        toCleanOrNull(validatedAccount.salesperson_id), // $9
        toCleanOrNull(validatedAccount.bucket_id), // $10
        toCleanOrNull(validatedAccount.vat_reg_no), // $11
        toCleanOrNull(validatedAccount.segment_id), // $12
        toCleanOrNull(validatedAccount.territory_id), // $13
        toCleanOrNull(validatedAccount.buying_group_id), // $14
        toCleanOrNull(validatedAccount.credit_rating_id), // $15
        toCleanOrNull(validatedAccount.ownership_type_id), // $16
        toCleanOrNull(validatedAccount.classification_id), // $17
        toCleanOrNull(validatedAccount.type_id), // $18
        toCleanOrNull(validatedAccount.status_id), // $19
        toCleanOrNull(validatedAccount.source_of_crm_id), // $20

        validatedAccount.no_of_emp || 0, // $21
        validatedAccount.turnover || 0, // $22

        toCleanOrNull(validatedAccount.comp_reg_no), // $23
        toDateOrNull(validatedAccount.date_of_inc), // $24
        toCleanOrNull(validatedAccount.additional_information), // $25
        toCleanOrNull(validatedAccount.assign_person_id), // $26
        toCleanOrNull(validatedAccount.assign_person), // $27
        toCleanOrNull(validatedAccount.sales_posting_group_id), // $28
        toCleanOrNull(validatedAccount.purchase_posting_group_id), // $29
        validatedAccount.anonymous_supplier, // $30
        validatedAccount.anonymous_customer, // $31
        id, // $32
        companyId, // $33
      ];

      const partyResult = await client.query(partyUpdateQuery, partyValues);

      if (partyResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Party not found" }, { status: 404 });
      }

      // Sync Contacts
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

      // Sync Addresses
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
              a.country || "United Kingdom",
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

      // 2. Manage Contacts Delta
      /* const activeContactIds: string[] = validatedContacts
        .map((c) => c.id)
        .filter((contactId): contactId is string => Boolean(contactId));

      if (activeContactIds.length > 0) {
        const placeholders = activeContactIds
          .map((_, i) => `$${i + 2}`)
          .join(",");
        await client.query(
          `DELETE FROM party_contacts WHERE party_id = $1 AND id NOT IN (${placeholders})`,
          [id, ...activeContactIds],
        );
      } else {
        await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [
          id,
        ]);
      }

      for (const c of validatedContacts) {
        if (c.id) {
          await client.query(
            `UPDATE party_contacts 
             SET name = $1, job_title = $2, email = $3, phone = $4, mobile = $5, is_primary = $6, notes = $7
             WHERE id = $8 AND party_id = $9`,
            [
              c.name,
              c.job_title || null,
              c.email || null,
              c.phone || null,
              c.mobile || null,
              !!c.is_primary,
              c.notes || null,
              c.id,
              id,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO party_contacts (party_id, name, job_title, email, phone, mobile, is_primary, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              c.name,
              c.job_title || null,
              c.email || null,
              c.phone || null,
              c.mobile || null,
              !!c.is_primary,
              c.notes || null,
            ],
          );
        }
      }

      // 3. Manage Addresses Delta
      const activeAddressIds: string[] = validatedAddresses
        .map((a) => a.id)
        .filter((addressId): addressId is string => Boolean(addressId));

      if (activeAddressIds.length > 0) {
        const placeholders = activeAddressIds
          .map((_, i) => `$${i + 2}`)
          .join(",");
        await client.query(
          `DELETE FROM party_addresses WHERE party_id = $1 AND id NOT IN (${placeholders})`,
          [id, ...activeAddressIds],
        );
      } else {
        await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [
          id,
        ]);
      }

      for (const a of validatedAddresses) {
        if (a.id) {
          await client.query(
            `UPDATE party_addresses 
             SET label = $1, address_1 = $2, address_2 = $3, city = $4, state = $5, country = $6,
                 postcode = $7, phone = $8, email = $9, is_primary = $10, is_billing = $11,
                 is_shipping = $12
             WHERE id = $13 AND party_id = $14`,
            [
              a.label,
              a.address_1,
              a.address_2 || null,
              a.city,
              a.state || null,
              a.country,
              a.postcode,
              a.phone || null,
              a.email || null,
              a.is_primary || false,
              a.is_billing || false,
              a.is_shipping || false,
              a.id,
              id,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO party_addresses (
               party_id, label, address_1, address_2, city, state, country, postcode,
               phone, email, is_primary, is_billing, is_shipping
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              id,
              a.label,
              a.address_1,
              a.address_2 || null,
              a.city,
              a.state || null,
              a.country,
              a.postcode,
              a.phone || null,
              a.email || null,
              a.is_primary || false,
              a.is_billing || false,
              a.is_shipping || false,
            ],
          );
        }
      } */

      await client.query("COMMIT");
      return NextResponse.json(partyResult.rows[0], { status: 200 });
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

    // Clean up dependent child contacts & addresses first
    await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [id]);
    await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [id]);

    // Delete party record scoped to authorized tenant company
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

/* export async function PUT(req: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Explicitly type-cast the extracted arrays during destructuring
  const account = body.account as Partial<Party>;
  const contacts = (body.contacts || []) as PartyContactDraft[];
  const addresses = (body.addresses || []) as PartyAddressDraft[];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Core Profile Parameter Field Updates
    const partyUpdate = await client.query(
      `UPDATE parties
       SET name = $1, email = $2, phone = $3, mobile = $4, website = $5, status = $6, currency_id = $7
       WHERE id = $8 AND company_id = $9
       RETURNING id`,
      [
        account.name,
        account.email || null,
        account.phone || null,
        account.mobile || null,
        account.website || null,
        account.status || "active",
        account.currency_id || null, // <-- Added mapping reference
        id,
        companyId,
      ],
    );

    if (partyUpdate.rowCount === 0) {
      throw new Error(
        "Target record authorization mismatch or removed entity.",
      );
    }

    // 2. Safe Relational Contact Delta Management (No Blind Deletions)
    // TypeScript now safely infers 'c' is a PartyContactDraft
    const activeContactIds = contacts.map((c) => c.id).filter(Boolean);
    if (activeContactIds.length > 0) {
      await client.query(
        `DELETE FROM party_contacts WHERE party_id = $1 AND id NOT IN (${activeContactIds.map((_, i) => `$${i + 2}`).join(",")})`,
        [id, ...activeContactIds],
      );
    } else {
      await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [
        id,
      ]);
    }

    for (const c of contacts) {
      if (c.id) {
        await client.query(
          `UPDATE party_contacts 
           SET name = $1, email = $2, phone = $3, mobile = $4, is_primary = $5 
           WHERE id = $6 AND party_id = $7`,
          [
            c.name,
            c.email || null,
            c.phone || null,
            c.mobile || null,
            c.is_primary || false,
            c.id,
            id,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO party_contacts (party_id, name, email, phone, mobile, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            c.name,
            c.email || null,
            c.phone || null,
            c.mobile || null,
            c.is_primary || false,
          ],
        );
      }
    }

    // 3. Safe Relational Address Delta Management
    // TypeScript now safely infers 'a' is a PartyAddressDraft
    const activeAddressIds = addresses.map((a) => a.id).filter(Boolean);
    if (activeAddressIds.length > 0) {
      await client.query(
        `DELETE FROM party_addresses WHERE party_id = $1 AND id NOT IN (${activeAddressIds.map((_, i) => `$${i + 2}`).join(",")})`,
        [id, ...activeAddressIds],
      );
    } else {
      await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [
        id,
      ]);
    }

    for (const a of addresses) {
      if (a.id) {
        await client.query(
          `UPDATE party_addresses 
           SET address_1 = $1, city = $2, country = $3, is_primary = $4 
           WHERE id = $5 AND party_id = $6`,
          [
            a.address_1 || null,
            a.city || null,
            a.country || null,
            a.is_primary || false,
            a.id,
            id,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO party_addresses (party_id, address_1, city, country, is_primary)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            a.address_1 || null,
            a.city || null,
            a.country || null,
            a.is_primary || false,
          ],
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT Mutation Fatal Exception Error:", err);

    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Execution Transaction Refused" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
