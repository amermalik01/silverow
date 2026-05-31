// app/api/parties/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";

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

export async function PUT(req: Request, { params }: Props) {
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
}

/* export async function PUT(req: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { account, contacts = [], addresses = [] } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Core Profile Parameter Field Updates
    const partyUpdate = await client.query(
      `UPDATE parties
       SET name = $1, email = $2, phone = $3, mobile = $4, website = $5, status = $6
       WHERE id = $7 AND company_id = $8
       RETURNING id`,
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

    if (partyUpdate.rowCount === 0) {
      throw new Error(
        "Target record authorization mismatch or removed entity.",
      );
    }

    // 2. Safe Relational Contact Delta Management (No Blind Deletions)
    const activeContactIds = contacts.map((c: any) => c.id).filter(Boolean);
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
    const activeAddressIds = addresses.map((a: any) => a.id).filter(Boolean);
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

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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
} */
