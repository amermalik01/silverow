// app/api/sales/crm/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {

  const id = params.id;

  const account = await pool.query(
    `SELECT * FROM parties WHERE id=$1`,
    [id]
  );

  const contacts = await pool.query(
    `SELECT * FROM party_contacts WHERE party_id=$1`,
    [id]
  );

  const addresses = await pool.query(
    `SELECT * FROM party_addresses WHERE party_id=$1`,
    [id]
  );

  return NextResponse.json({
    account: account.rows[0],
    contacts: contacts.rows,
    addresses: addresses.rows
  });

}