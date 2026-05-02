// app/api/parties/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET SINGLE PARTY
========================= */
export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await pool.connect();

  try {
    const party = await client.query(
      `
      SELECT * FROM parties
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (!party.rows[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contacts = await client.query(
      `SELECT * FROM party_contacts WHERE party_id = $1`,
      [id],
    );

    const addresses = await client.query(
      `SELECT * FROM party_addresses WHERE party_id = $1`,
      [id],
    );

    return NextResponse.json({
      account: party.rows[0],
      contacts: contacts.rows,
      addresses: addresses.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch party" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* =========================
   UPDATE PARTY
========================= */
export async function PUT(req: Request, { params }: Props) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        mobile = $4,
        website = $5,
        status = $6
      WHERE id = $7 AND company_id = $8
      `,
      [
        account.name,
        account.email || null,
        account.phone || null,
        account.mobile || null,
        account.website || null,
        account.status || "active",
        id,
        companyId,
      ],
    );

    /* contacts */
    await client.query(`DELETE FROM party_contacts WHERE party_id = $1`, [id]);

    for (const c of contacts) {
      await client.query(
        `
        INSERT INTO party_contacts
        (party_id,name,email,phone,mobile,is_primary)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
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

    /* addresses */
    await client.query(`DELETE FROM party_addresses WHERE party_id = $1`, [id]);

    for (const a of addresses) {
      await client.query(
        `
        INSERT INTO party_addresses
        (party_id,address_1,city,country,is_primary)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          id,
          a.address_1 || null,
          a.city || null,
          a.country || null,
          a.is_primary || false,
        ],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

/* =========================
   DELETE PARTY
========================= */
export async function DELETE(_: Request, { params }: Props) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await pool.connect();

  try {
    await client.query(
      `
      DELETE FROM parties
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
