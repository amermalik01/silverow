// app/api/sales/crm/create/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const { account, contacts = [], addresses = [] } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. INSERT ACCOUNT
    const accountRes = await client.query(
      `
      INSERT INTO parties (
        company_id,
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
      VALUES ($1,$2,'lead',$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
      `,
      [
        account.company_id,
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

    const accountId = accountRes.rows[0].id;

    // 2. PRIMARY CONTACT (from general tab)
    if (account.contact_person) {
      await client.query(
        `
        INSERT INTO crm_contacts (
          account_id, name, email, phone, is_primary
        )
        VALUES ($1,$2,$3,$4,true)
        `,
        [
          accountId,
          account.contact_person,
          account.cemail,
          account.cphone,
        ]
      );
    }

    // 3. PRIMARY ADDRESS
    if (account.address_1) {
      await client.query(
        `
        INSERT INTO crm_addresses (
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
        ]
      );
    }

    // 4. EXTRA CONTACTS
    for (const c of contacts) {
      await client.query(
        `
        INSERT INTO crm_contacts (
          account_id, name, email, phone, is_primary
        )
        VALUES ($1,$2,$3,$4,false)
        `,
        [accountId, c.name, c.email, c.phone]
      );
    }

    // 5. EXTRA ADDRESSES
    for (const a of addresses) {
      await client.query(
        `
        INSERT INTO crm_addresses (
          account_id,
          address_1,
          city,
          is_primary
        )
        VALUES ($1,$2,$3,false)
        `,
        [accountId, a.address_1, a.city]
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
}