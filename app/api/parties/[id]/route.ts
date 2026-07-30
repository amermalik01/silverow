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

    // type RawContact = Record<string, unknown>;
    // type RawAddress = Record<string, unknown>;

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
          updated_at = NOW()
        WHERE id = $68 AND company_id = $69
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
        toCleanOrNull(validatedAccount.posting_group) || "UK",
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

        // Record & Tenant Keys ($68 - $69)
        id,
        companyId,
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