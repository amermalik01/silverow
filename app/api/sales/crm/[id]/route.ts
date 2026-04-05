// app/api/sales/crm/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const account = await pool.query(`SELECT * FROM parties WHERE id=$1`, [id]);

  const contacts = await pool.query(
    `SELECT * FROM party_contacts WHERE party_id=$1`,
    [id],
  );

  const addresses = await pool.query(
    `SELECT * FROM party_addresses WHERE party_id=$1`,
    [id],
  );

  return NextResponse.json({
    account: account.rows[0],
    contacts: contacts.rows,
    addresses: addresses.rows,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = await req.json();

  const { account, contacts = [], addresses = [] } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE parties
      SET
        name = $1,
        email = $2,
        phone = $3,
        website = $4,
        credit_limit = $5,
        currency_id = $6,
        salesperson_id = $7,
        status = $8
      WHERE id = $9
      `,
      [
        account.name,
        account.email || null,
        account.phone || null,
        account.website || null,
        account.credit_limit || null,
        account.currency_id || null,
        account.salesperson_id || null,
        account.status,
        id,
      ],
    );

    await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [id]);

    for (const c of contacts) {
      await client.query(
        `
        INSERT INTO party_contacts
        (party_id,name,email,phone,is_primary)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [id, c.name, c.email, c.phone, c.is_primary || false],
      );
    }

    await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [id]);

    for (const a of addresses) {
      await client.query(
        `
        INSERT INTO party_addresses
        (party_id,address_1,city,is_primary)
        VALUES ($1,$2,$3,$4)
        `,
        [id, a.address_1, a.city, a.is_primary || false],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
