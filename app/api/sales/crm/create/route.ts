// app/api/sales/crm/create/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {

  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const companyId = session.user.company_id;

  const { account, contacts = [], addresses = [] } = body;

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // 1️⃣ Generate CRM Code
    const seqResult = await client.query(
      `SELECT get_next_sequence($1,$2) AS code`,
      [companyId, "crm_lead"]
    );

    const crmCode = seqResult.rows[0].code;

    // 2️⃣ Insert Party (Lead)
    const partyRes = await client.query(
      `
      INSERT INTO parties (
        company_id,
        crm_code,
        name,
        type,
        email,
        phone,
        website,
        credit_limit,
        currency_id,
        salesperson_id,
        status
      )
      VALUES ($1,$2,$3,'lead',$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
      `,
      [
        companyId,
        crmCode,
        account.name,
        account.email,
        account.phone,
        account.website,
        account.credit_limit,
        account.currency_id,
        account.salesperson_id,
        account.status || "active",
      ]
    );

    const partyId = partyRes.rows[0].id;

    // 3️⃣ Primary Contact (General Tab)
    let primaryContactId = null;

    if (account.contact_person) {

      const contactRes = await client.query(
        `
        INSERT INTO party_contacts (
          party_id,
          name,
          email,
          phone,
          mobile,
          is_primary
        )
        VALUES ($1,$2,$3,$4,$5,true)
        RETURNING id
        `,
        [
          partyId,
          account.contact_person,
          account.cemail,
          account.cphone,
          account.cmobile
        ]
      );

      primaryContactId = contactRes.rows[0].id;
    }

    // 4️⃣ Primary Address
    let primaryAddressId = null;

    if (account.address_1) {

      const addrRes = await client.query(
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
          is_shipping
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)
        RETURNING id
        `,
        [
          partyId,
          "Primary",
          account.address_1,
          account.address_2,
          account.city,
          account.state,
          account.country,
          account.postcode,
          account.phone,
          account.email,
          account.is_billing || false,
          account.is_shipping || true
        ]
      );

      primaryAddressId = addrRes.rows[0].id;
    }

    // 5️⃣ Link Primary Contact to Address
    if (primaryAddressId && primaryContactId) {

      await client.query(
        `
        INSERT INTO party_address_contacts (
          address_id,
          contact_id
        )
        VALUES ($1,$2)
        `,
        [primaryAddressId, primaryContactId]
      );

    }

    // 6️⃣ Extra Contacts
    for (const c of contacts) {

      await client.query(
        `
        INSERT INTO party_contacts (
          party_id,
          name,
          email,
          phone,
          mobile,
          is_primary
        )
        VALUES ($1,$2,$3,$4,$5,false)
        `,
        [
          partyId,
          c.name,
          c.email,
          c.phone,
          c.mobile
        ]
      );

    }

    // 7️⃣ Extra Addresses
    for (const a of addresses) {

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
          is_primary
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false)
        `,
        [
          partyId,
          a.label,
          a.address_1,
          a.address_2,
          a.city,
          a.state,
          a.country,
          a.postcode
        ]
      );

    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      id: partyId,
      crm_code: crmCode
    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  } finally {

    client.release();

  }

}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const companyId = session.user.company_id;

  const { account, contacts = [], addresses = [] } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Generate CRM Code from sequence
    const seqResult = await pool.query(
      `SELECT get_next_sequence($1,$2) AS code`,
      [companyId, "crm_lead"], // module name from sequences table
    );

    const crmCode = seqResult.rows[0].code;

    // 1. INSERT ACCOUNT
    const accountRes = await client.query(
      `
      INSERT INTO parties (
        company_id,
        crm_code,
        name,
        type,
        email,
        phone,
        website,
        credit_limit,
        currency_id,
        salesperson_id,
        status
      )
      VALUES ($1,$2,$3,'lead',$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
      `,
      [
        companyId,
        crmCode,
        account.name,
        account.email,
        account.phone,
        account.website,
        account.credit_limit,
        account.currency_id,
        account.salesperson_id,
        account.status || "active",
      ],
    );

    const accountId = accountRes.rows[0].id;

    // 2. PRIMARY CONTACT (from general tab)
    if (account.contact_person) {
      await client.query(
        `
        INSERT INTO party_contacts (
          account_id, name, email, phone, is_primary
        )
        VALUES ($1,$2,$3,$4,true)
        `,
        [accountId, account.contact_person, account.cemail, account.cphone],
      );
    }

    // 3. PRIMARY ADDRESS
    if (account.address_1) {
      await client.query(
        `
        INSERT INTO party_addresses (
          account_id,
          address_1,
          address_2,
          city,
          county,
          postcode,
          country_id,
          is_primary,
          is_billing,
          is_shipping
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9)
        `,
        [
          accountId,
          account.address_1,
          account.address_2,
          account.city,
          account.county,
          account.postcode,
          account.country_id,
          account.is_billing || false,
          account.is_shipping || false,
        ],
      );
    }

    // 4. EXTRA CONTACTS
    for (const c of contacts) {
      await client.query(
        `
        INSERT INTO party_contacts (
          account_id, name, email, phone, is_primary
        )
        VALUES ($1,$2,$3,$4,false)
        `,
        [accountId, c.name, c.email, c.phone],
      );
    }

    // 5. EXTRA ADDRESSES
    for (const a of addresses) {
      await client.query(
        `
        INSERT INTO party_addresses (
          account_id,
          address_1,
          city,
          is_primary
        )
        VALUES ($1,$2,$3,false)
        `,
        [accountId, a.address_1, a.city],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      id: accountId,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json({ error: "Server error" }, { status: 500 });

    // return NextResponse.json(
    //   { message: err.message },
    //   { status: 500 }
    // );
  } finally {
    client.release();
  }
} */
