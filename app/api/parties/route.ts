// app/api/parties/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

/* =========================
   GET LIST
========================= */
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

/* =========================
   CREATE PARTY
========================= */
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
}

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