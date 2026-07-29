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

    // const rawContacts = Array.isArray(rawBody.contacts) ? rawBody.contacts : [];
    // const validatedContacts = rawContacts.map((c: unknown) =>
    //   PartyContactSchema.parse(c),
    // );

    // const rawAddresses = Array.isArray(rawBody.addresses)
    //   ? rawBody.addresses
    //   : [];
    // const validatedAddresses = rawAddresses.map((a: unknown) =>
    //   PartyAddressSchema.parse(a),
    // );

    // Modern Validation Check: At least one role flag must evaluate to true
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

      // System sequence code handling
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

      // Helper to cleanly return valid UUID/String or NULL
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
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, now(), now()
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
        toDateOrNull(validatedAccount.date_of_inc), // $33 (Fixed Date Sanitizer)
        toCleanOrNull(validatedAccount.additional_information), // $34
        toCleanOrNull(validatedAccount.assign_person_id), // $35
        toCleanOrNull(validatedAccount.assign_person), // $36
        toCleanOrNull(validatedAccount.sales_posting_group_id), // $37
        toCleanOrNull(validatedAccount.purchase_posting_group_id), // $38
        validatedAccount.anonymous_supplier, // $39
        validatedAccount.anonymous_customer, // $40
      ];

      const partyResult = await client.query(partyInsertQuery, partyValues);
      const newParty = partyResult.rows[0];

      // Save Primary Contacts
      if (validatedContacts.length > 0) {
        const contactQuery = `
          INSERT INTO party_contacts (party_id, name, job_title, email, phone, mobile, is_primary, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        for (const c of validatedContacts) {
          if (c.name && c.name.trim() !== "") {
            await client.query(contactQuery, [
              newParty.id,
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
              newParty.id,
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
      return NextResponse.json(newParty, { status: 201 });
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

/* ==========================================================
   PERSIST TRANSACTIONAL DIRECTORY OBJECT RECORD (POST METHOD)
============================================================ */
/* export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Unauthorized operation sequence blocked." },
      { status: 401 },
    );
  }

  try {
    const { account, contacts = [], addresses = [] } = await req.json();
    const {
      name,
      status = "active",
      email,
      phone,
      mobile,
      website,
      credit_limit,
      currency_id,
      salesperson_id,
      bucket_id,
      // Destructure the boolean parameters out of the payload:
      is_crm_lead = false,
      is_srm_vendor = false,
      is_customer = false,
      is_supplier = false,
    } = account || {};

    // Immediate sanity checks
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Corporate name is required." },
        { status: 400 },
      );
    }

    // Modern Validation Check: At least one role flag must evaluate to true
    if (!is_crm_lead && !is_srm_vendor && !is_customer && !is_supplier) {
      return NextResponse.json(
        { error: "Initial target deployment role definition state required." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Initialize empty placeholders for system sequence codes
      let crm_code = null,
        srm_code = null,
        customer_code = null,
        supplier_code = null;

      // Programmatically pull sequential numbering blocks based on your matching flags
      if (is_crm_lead) {
        const leadSeq = await client.query(
          "SELECT get_next_sequence($1, 'crm_lead') AS code",
          [companyId],
        );
        crm_code = leadSeq.rows[0].code;
      }
      if (is_srm_vendor) {
        const vendorSeq = await client.query(
          "SELECT get_next_sequence($1, 'srm_vendor') AS code",
          [companyId],
        );
        srm_code = vendorSeq.rows[0].code;
      }
      if (is_customer) {
        const custSeq = await client.query(
          "SELECT get_next_sequence($1, 'customer') AS code",
          [companyId],
        );
        customer_code = custSeq.rows[0].code;
      }
      if (is_supplier) {
        const suppSeq = await client.query(
          "SELECT get_next_sequence($1, 'supplier') AS code",
          [companyId],
        );
        supplier_code = suppSeq.rows[0].code;
      }

      const partyInsertQuery = `
        INSERT INTO parties (
          company_id, name, status,
          is_crm_lead, is_srm_vendor, is_customer, is_supplier,
          crm_code, srm_code, customer_code, supplier_code,
          email, phone, mobile, website,
          credit_limit, currency_id, salesperson_id, bucket_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, now(), now()
        ) RETURNING *
      `;

      const partyResult = await client.query(partyInsertQuery, [
        companyId,
        name.trim(),
        status,
        is_crm_lead,
        is_srm_vendor,
        is_customer,
        is_supplier,
        crm_code,
        srm_code,
        customer_code,
        supplier_code,
        email || null,
        phone || null,
        mobile || null,
        website || null,
        credit_limit || 0.0,
        currency_id || null,
        salesperson_id || null,
        bucket_id || null,
      ]);

      const newParty = partyResult.rows[0];

      // Insert associated directory payload structures (contacts & addresses)
      if (contacts.length > 0) {
        const contactQuery = `
          INSERT INTO party_contacts (party_id, name, job_title, email, phone, mobile, is_primary, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        for (const c of contacts) {
          if (!c.name) continue;
          await client.query(contactQuery, [
            newParty.id,
            c.name,
            c.job_title,
            c.email,
            c.phone,
            c.mobile,
            !!c.is_primary,
            c.notes,
          ]);
        }
      }

      if (addresses.length > 0) {
        const addressQuery = `
          INSERT INTO party_addresses (party_id, label, address_1, address_2, city, state, country, postcode, phone, email, is_primary, is_billing, is_shipping)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        for (const a of addresses) {
          if (!a.label || !a.address_1 || !a.city || !a.country) continue;
          await client.query(addressQuery, [
            newParty.id,
            a.label,
            a.address_1,
            a.address_2,
            a.city,
            a.state,
            a.country,
            a.postcode,
            a.phone,
            a.email,
            !!a.is_primary,
            !!a.is_billing,
            !!a.is_shipping,
          ]);
        }
      }

      await client.query("COMMIT");
      return NextResponse.json(newParty, { status: 201 });
    } catch (txErr) {
      await client.query("ROLLBACK");

      const dbError = txErr as { code?: string; message?: string };
      console.error("Transaction operational crash trace: ", txErr);
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
  } catch (parseErr) {
    console.log("parseErr ==== ", parseErr);
    return NextResponse.json(
      { error: "Malformed payload parsing parameters." },
      { status: 400 },
    );
  }
} */

// Map incoming legacy UI type requests to our new multi-role layout parameters
/* switch (account.roleType) {
        case "lead":
          is_crm_lead = true;
          const leadSeq = await client.query(
            "SELECT get_next_sequence($1, 'crm_lead') AS code",
            [companyId],
          );
          crm_code = leadSeq.rows[0].code;
          break;
        case "vendor":
          is_srm_vendor = true;
          const vendorSeq = await client.query(
            "SELECT get_next_sequence($1, 'srm_vendor') AS code",
            [companyId],
          );
          srm_code = vendorSeq.rows[0].code;
          break;
        case "customer":
          is_customer = true;
          const custSeq = await client.query(
            "SELECT get_next_sequence($1, 'customer') AS code",
            [companyId],
          );
          customer_code = custSeq.rows[0].code;
          break;
        case "supplier":
          is_supplier = true;
          const suppSeq = await client.query(
            "SELECT get_next_sequence($1, 'supplier') AS code",
            [companyId],
          );
          supplier_code = suppSeq.rows[0].code;
          break;
        case "both":
          is_customer = true;
          is_supplier = true;
          const cSeq = await client.query(
            "SELECT get_next_sequence($1, 'customer') AS code",
            [companyId],
          );
          const sSeq = await client.query(
            "SELECT get_next_sequence($1, 'supplier') AS code",
            [companyId],
          );
          customer_code = cSeq.rows[0].code;
          supplier_code = sSeq.rows[0].code;
          break;
        default:
          throw new Error(
            "Invalid initialization category profile rule specified.",
          );
      } */
/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";


export async function GET(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);

  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";

  const offset = (page - 1) * limit;

  let where = `WHERE company_id = $1`;
  const values: (string | number)[] = [companyId];

  let i = 2;

  if (search) {
    where += `
      AND (
        name ILIKE $${i}
        OR crm_code ILIKE $${i}
        OR srm_code ILIKE $${i}
        OR customer_code ILIKE $${i}
        OR email ILIKE $${i}
        OR phone ILIKE $${i}
      )
    `;
    values.push(`%${search}%`);
    i++;
  }

  if (type) {
    where += ` AND type = $${i}`;
    values.push(type);
    i++;
  }

  if (status) {
    where += ` AND status = $${i}`;
    values.push(status);
    i++;
  }

  const dataQuery = `
    SELECT *
    FROM parties
    ${where}
    ORDER BY created_at DESC
    LIMIT $${i}
    OFFSET $${i + 1}
  `;

  values.push(limit, offset);

  const totalQuery = `
    SELECT COUNT(*)::int AS count
    FROM parties
    ${where}
  `;

  const client = await pool.connect();

  try {
    const data = await client.query(dataQuery, values);
    const total = await client.query(totalQuery, values.slice(0, i - 1));

    return NextResponse.json({
      data: data.rows,
      total: total.rows[0].count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}


export async function POST(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { account, contacts = [], addresses = [] } = await req.json();

  const {
    name,
    type,
    status = "active",

    email,
    phone,
    mobile,
    website,

    credit_limit,
    currency_id,

    salesperson_id,
    bucket_id,
  } = account || {};

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!type) {
    return NextResponse.json({ error: "Type is required" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =========================
    //    AUTO GENERATED CODES
    // =========================

    let crm_code: string | null = null;
    let customer_code: string | null = null;
    let srm_code: string | null = null;
    let supplier_code: string | null = null;

    // =========================
    //    LEAD
    // =========================
    if (type === "lead") {
      const seqResult = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "crm_lead"],
      );

      crm_code = seqResult.rows[0].code;
    }

    if (type === "vendor") {
      const seqResult = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "srm_vendor"],
      );

      srm_code = seqResult.rows[0].code;
    }

    // =========================
    //    CUSTOMER
    // =========================
    if (type === "customer") {
      const seqResult = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "customer"],
      );

      customer_code = seqResult.rows[0].code;
    }

    // =========================
    //    SUPPLIER
    // =========================
    if (type === "supplier") {
      const seqResult = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "supplier"],
      );

      supplier_code = seqResult.rows[0].code;
    }

    // =========================
    //    BOTH
    // =========================
    if (type === "both") {
      const customerSeq = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "customer"],
      );

      customer_code = customerSeq.rows[0].code;

      const supplierSeq = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, "supplier"],
      );

      supplier_code = supplierSeq.rows[0].code;
    }

    // =========================
    //    INSERT PARTY
    // =========================

    const partyResult = await client.query(
      `
      INSERT INTO parties (
        company_id,

        crm_code,
        customer_code,
        srm_code,
        supplier_code,

        name,
        type,
        status,

        email,
        phone,
        mobile,

        website,

        credit_limit,
        currency_id,

        salesperson_id,
        bucket_id,

        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,
        $13,$14,
        $15,$16,
        now()
      )
      RETURNING *
      `,
      [
        companyId,

        crm_code || null,
        customer_code || null,
        srm_code || null,
        supplier_code || null,

        name,
        type,
        status,

        email || null,
        phone || null,
        mobile || null,

        website || null,

        credit_limit || null,
        currency_id || null,

        salesperson_id || null,
        bucket_id || null,
      ],
    );

    const party = partyResult.rows[0];

    // =========================
    //    INSERT CONTACTS
    // =========================

    for (const contact of contacts) {
      await client.query(
        `
        INSERT INTO party_contacts (
          party_id,

          name,
          job_title,

          email,
          phone,
          mobile,

          is_primary,
          notes,

          created_at
        )
        VALUES (
          $1,$2,$3,
          $4,$5,$6,
          $7,$8,
          now()
        )
        `,
        [
          party.id,

          contact.name || null,
          contact.job_title || null,

          contact.email || null,
          contact.phone || null,
          contact.mobile || null,

          contact.is_primary || false,
          contact.notes || null,
        ],
      );
    }

    // =========================
    //    INSERT ADDRESSES
    // =========================

    for (const address of addresses) {
      await client.query(
        `
        INSERT INTO party_addresses (
          party_id,

          label,

          address_1,
          address_2,

          city,
          state,
          country,
          postcode,

          phone,
          email,

          is_primary,
          is_billing,
          is_shipping,

          created_at
        )
        VALUES (
          $1,$2,
          $3,$4,
          $5,$6,$7,$8,
          $9,$10,
          $11,$12,$13,
          now()
        )
        `,
        [
          party.id,

          address.label || null,

          address.address_1 || null,
          address.address_2 || null,

          address.city || null,
          address.state || null,
          address.country || null,
          address.postcode || null,

          address.phone || null,
          address.email || null,

          address.is_primary || false,
          address.is_billing || false,
          address.is_shipping || false,
        ],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(party);
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */

/* 



  const sequenceConfig = {
    lead: [
      {
        module: "crm_lead",
        field: "crm_code",
      },
    ],

    vendor: [
      {
        module: "srm_vendor",
        field: "srm_code",
      },
    ],

    customer: [
      {
        module: "customer",
        field: "customer_code",
      },
    ],

    supplier: [
      {
        module: "supplier",
        field: "supplier_code",
      },
    ],

    both: [
      {
        module: "customer",
        field: "customer_code",
      },
      {
        module: "supplier",
        field: "supplier_code",
      },
    ],
  } as const;

  

    const generatedCodes = {
      crm_code: null,
      customer_code: null,
      srm_code: null,
      supplier_code: null,
    };

    const configs = sequenceConfig[type] || [];

    for (const config of configs) {
      const seqResult = await client.query(
        `
    SELECT get_next_sequence($1,$2) AS code
    `,
        [companyId, config.module],
      );

      generatedCodes[config.field as keyof typeof generatedCodes] =
        seqResult.rows[0].code;
    }
*/
