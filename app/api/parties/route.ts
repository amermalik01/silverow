// app/api/parties/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";

const ALLOWED_ROLES = [
  "is_crm_lead",
  "is_srm_vendor",
  "is_customer",
  "is_supplier",
];

/* ==========================================================
   ACQUIRE FILTERED DIRECTORY RECORDS (ROLE-BOUND MATRICES)
============================================================ */
export async function GET(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Access Denied. Unauthorized Session Check." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || 10)),
  );
  const search = searchParams.get("search")?.trim() || "";
  const targetedRole = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";

  const offset = (page - 1) * limit;

  // Primary filtering query targeting the unique company scope
  const whereClauses: string[] = ["company_id = $1"];
  const values: (string | number | boolean)[] = [companyId];
  let paramIndex = 2;

  // 1. Enforce strict role filter verification mapping directly to database column schema
  if (targetedRole) {
    if (!ALLOWED_ROLES.includes(targetedRole)) {
      return NextResponse.json(
        { error: "Malformed security parameter configuration payload." },
        { status: 400 },
      );
    }
    whereClauses.push(`${targetedRole} = true`);
  }

  // 2. Process search patterns safely across all codes and metadata fields
  if (search) {
    whereClauses.push(`(
      name ILIKE $${paramIndex} OR 
      crm_code ILIKE $${paramIndex} OR 
      srm_code ILIKE $${paramIndex} OR 
      customer_code ILIKE $${paramIndex} OR 
      supplier_code ILIKE $${paramIndex} OR 
      email ILIKE $${paramIndex} OR 
      phone ILIKE $${paramIndex}
    )`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  // 3. Optional lifecycle filter tracking integration
  if (status) {
    whereClauses.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const combinedWhereClause = `WHERE ${whereClauses.join(" AND ")}`;

  // Construct final page query statements safely injecting tracked control arguments
  const dataQuery = `
    SELECT id, name, crm_code, srm_code, customer_code, supplier_code,
           is_crm_lead, is_srm_vendor, is_customer, is_supplier,
           email, phone, status, created_at
    FROM parties
    ${combinedWhereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const totalQuery = `
    SELECT COUNT(*)::int AS count 
    FROM parties 
    ${combinedWhereClause}
  `;

  const client = await pool.connect();
  try {
    // Clone arguments array tracking limits context boundaries safely
    const dataValues = [...values, limit, offset];

    const [dataResult, totalResult] = await Promise.all([
      client.query(dataQuery, dataValues),
      client.query(totalQuery, values),
    ]);

    return NextResponse.json({
      data: dataResult.rows,
      total: totalResult.rows[0].count,
      page,
      limit,
    });
  } catch (err) {
    console.error("Critical Engine Core Processing Error context: ", err);
    return NextResponse.json(
      { error: "Internal structural error fetching registry tracking data." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* ==========================================================
   2. ADD PARTY (POST /api/parties)
============================================================ */
export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Unauthorized operation sequence blocked." },
      { status: 401 },
    );
  }

  try {
    const rawBody = await req.json();
    const validatedAccount = PartySchema.parse(rawBody.account);

    // Validate relational items

    type RawContact = Record<string, unknown>;
    type RawAddress = Record<string, unknown>;

    const rawContacts: RawContact[] = Array.isArray(rawBody.contacts)
      ? rawBody.contacts
      : [];
    const validatedContacts = rawContacts
      .filter(
        (c) => c && typeof c === "object" && (c.name || c.email || c.phone),
      )
      .map((c: unknown) => PartyContactSchema.parse(c));

    const rawAddresses: RawAddress[] = Array.isArray(rawBody.addresses)
      ? rawBody.addresses
      : [];
    const validatedAddresses = rawAddresses
      .filter(
        (a) =>
          a && typeof a === "object" && (a.address_1 || a.city || a.postcode),
      )
      .map((a: unknown) => PartyAddressSchema.parse(a));

    const { is_crm_lead, is_srm_vendor, is_customer, is_supplier } =
      validatedAccount;

    if (!is_crm_lead && !is_srm_vendor && !is_customer && !is_supplier) {
      return NextResponse.json(
        { error: "Initial target deployment role definition state required." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let crm_code = validatedAccount.crm_code || null;
      let srm_code = validatedAccount.srm_code || null;
      let customer_code = validatedAccount.customer_code || null;
      let supplier_code = validatedAccount.supplier_code || null;

      if (is_crm_lead && !crm_code) {
        const leadSeq = await client.query(
          "SELECT get_next_sequence($1, 'crm_lead') AS code",
          [companyId],
        );
        crm_code = leadSeq.rows[0]?.code || null;
      }

      if (is_srm_vendor && !srm_code) {
        const vendorSeq = await client.query(
          "SELECT get_next_sequence($1, 'srm_vendor') AS code",
          [companyId],
        );
        srm_code = vendorSeq.rows[0]?.code || null;
      }

      if (is_customer && !customer_code) {
        const custSeq = await client.query(
          "SELECT get_next_sequence($1, 'customer') AS code",
          [companyId],
        );
        customer_code = custSeq.rows[0]?.code || null;
      }

      if (is_supplier && !supplier_code) {
        const suppSeq = await client.query(
          "SELECT get_next_sequence($1, 'supplier') AS code",
          [companyId],
        );
        supplier_code = suppSeq.rows[0]?.code || null;
      }

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

      const partyInsertQuery = `
        INSERT INTO parties (
          company_id, name, status,
          is_crm_lead, is_srm_vendor, is_customer, is_supplier,
          crm_code, srm_code, customer_code, supplier_code,
          email, phone, mobile, website,
          credit_limit, currency_id, salesperson_id, bucket_id,
          vat_reg_no, segment_id, territory_id, buying_group_id,
          credit_rating_id, ownership_type_id, classification_id, type_id,
          status_id, source_of_crm_id, no_of_emp, turnover, comp_reg_no,
          date_of_inc, additional_information, assign_person_id, assign_person,
          sales_posting_group_id, purchase_posting_group_id,anonymous_supplier,anonymous_customer,

          -- Finance & Ledger Columns
          finance_contact_person, finance_email, finance_phone, finance_fax,
          finance_alt_contact, finance_alt_email,
          payment_terms, payment_method, company_reg_no, supplier_vat_no, payable_bank,
          gl_account_receivable, gl_account_payable, posting_group,
          finance_charge, has_finance_charge, insurance_charge, has_insurance_charge,
          exclude_from_aging_report,
          
          -- E-Document Flags
          e_reminder, e_statement, e_invoice, e_purchase_order, e_debit_note, e_remittance_advice,


          
          -- Bank Account Details
          bank_account_name, bank_sort_code, bank_account_no, bank_swift_bic, bank_iban, bank_name, bank_address,

          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
          $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, 
          $71, $72, now(), now()
        ) RETURNING *
      `;

      const partyValues = [
        companyId, // $1
        validatedAccount.name, // $2
        validatedAccount.status || "active", // $3
        is_crm_lead, // $4
        is_srm_vendor, // $5
        is_customer, // $6
        is_supplier, // $7
        crm_code, // $8
        srm_code, // $9
        customer_code, // $10
        supplier_code, // $11
        toCleanOrNull(validatedAccount.email), // $12
        toCleanOrNull(validatedAccount.phone), // $13
        toCleanOrNull(validatedAccount.mobile), // $14
        toCleanOrNull(validatedAccount.website), // $15
        validatedAccount.credit_limit || 0, // $16
        toCleanOrNull(validatedAccount.currency_id), // $17
        toCleanOrNull(validatedAccount.salesperson_id), // $18
        toCleanOrNull(validatedAccount.bucket_id), // $19
        toCleanOrNull(validatedAccount.vat_reg_no), // $20
        toCleanOrNull(validatedAccount.segment_id), // $21
        toCleanOrNull(validatedAccount.territory_id), // $22
        toCleanOrNull(validatedAccount.buying_group_id), // $23
        toCleanOrNull(validatedAccount.credit_rating_id), // $24
        toCleanOrNull(validatedAccount.ownership_type_id), // $25
        toCleanOrNull(validatedAccount.classification_id), // $26
        toCleanOrNull(validatedAccount.type_id), // $27
        toCleanOrNull(validatedAccount.status_id), // $28
        toCleanOrNull(validatedAccount.source_of_crm_id), // $29
        validatedAccount.no_of_emp || 0, // $30
        validatedAccount.turnover || 0, // $31
        toCleanOrNull(validatedAccount.comp_reg_no), // $32
        toDateOrNull(validatedAccount.date_of_inc) || null, // $33 (Fixed Date Sanitizer)
        toCleanOrNull(validatedAccount.additional_information), // $34
        toCleanOrNull(validatedAccount.assign_person_id), // $35
        toCleanOrNull(validatedAccount.assign_person), // $36
        toCleanOrNull(validatedAccount.sales_posting_group_id), // $37
        toCleanOrNull(validatedAccount.purchase_posting_group_id), // $38
        validatedAccount.anonymous_supplier ?? false, // $39
        validatedAccount.anonymous_customer ?? false, // $40

        // Finance Fields ($41 - $59)
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

        // E-Document Flags ($60 - $65)
        validatedAccount.e_reminder ?? false,
        validatedAccount.e_statement ?? false,
        validatedAccount.e_invoice ?? false,
        validatedAccount.e_purchase_order ?? false,
        validatedAccount.e_debit_note ?? false,
        validatedAccount.e_remittance_advice ?? false,

        // Bank Account Details ($66 - $72)
        toCleanOrNull(validatedAccount.bank_account_name),
        toCleanOrNull(validatedAccount.bank_sort_code),
        toCleanOrNull(validatedAccount.bank_account_no),
        toCleanOrNull(validatedAccount.bank_swift_bic),
        toCleanOrNull(validatedAccount.bank_iban),
        toCleanOrNull(validatedAccount.bank_name),
        toCleanOrNull(validatedAccount.bank_address),
      ];

      const partyResult = await client.query(partyInsertQuery, partyValues);
      const newParty = partyResult.rows[0];
      const partyId = newParty.id;

      // Save Primary Contacts
      if (validatedContacts.length > 0) {
        const contactQuery = `
          INSERT INTO party_contacts (party_id, name, job_title, email, phone, mobile, is_primary, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        for (const c of validatedContacts) {
          if (c.name && c.name.trim() !== "") {
            await client.query(contactQuery, [
              partyId,
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

      // Save Addresses
      if (validatedAddresses.length > 0) {
        const addressQuery = `
          INSERT INTO party_addresses (
            party_id, label, address_1, address_2, city, state, country, postcode,
            phone, email, is_primary, is_billing, is_shipping
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        for (const a of validatedAddresses) {
          if (
            (a.address_1 && a.address_1.trim() !== "") ||
            (a.city && a.city.trim() !== "")
          ) {
            await client.query(addressQuery, [
              partyId,
              a.label || "Main Address",
              a.address_1,
              a.address_2 || null,
              a.city,
              a.state || null,
              a.country,
              a.postcode,
              a.phone || null,
              a.email || null,
              !!a.is_primary,
              !!a.is_billing,
              !!a.is_shipping,
            ]);
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, id: partyId });
      // return NextResponse.json(newParty, { status: 201 });
    } catch (txErr) {
      await client.query("ROLLBACK");
      console.error("Transaction failure trace: ", txErr);
      const dbError = txErr as { message?: string };
      return NextResponse.json(
        {
          error:
            dbError.message ||
            "Database engine failure executing persistence profiles.",
        },
        { status: 400 },
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
