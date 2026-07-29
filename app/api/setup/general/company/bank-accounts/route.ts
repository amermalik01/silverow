// app/api/setup/general/company/bank-accounts/route.ts 

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type ParamType = string | number | boolean | null;

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    let query = `SELECT * FROM bank_accounts WHERE company_id = $1`;
    const params: ParamType[] = [companyId];

    if (search) {
      query += ` AND (
        account_name ILIKE $2 OR 
        preferred_name ILIKE $2 OR 
        bank_name ILIKE $2 OR 
        account_no ILIKE $2 OR 
        sort_code ILIKE $2
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Bank Accounts GET Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve bank accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const {
      account_name,
      preferred_name,
      sort_code,
      account_no,
      swift_code,
      iban,
      currency,
      gl_no,
      bank_name,
      address_line1,
      address_line2,
      city,
      county,
      postal_code,
      country_code,
      contact_name,
      mobile,
      telephone,
      fax,
      email,
    } = body;

    const query = `
      INSERT INTO bank_accounts (
        company_id, account_name, preferred_name, sort_code, account_no, swift_code, iban,
        currency, gl_no, bank_name, address_line1, address_line2, city, county,
        postal_code, country_code, contact_name, mobile, telephone, fax, email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *;
    `;

    const values: ParamType[] = [
      companyId,
      account_name,
      preferred_name || null,
      sort_code || null,
      account_no,
      swift_code || null,
      iban || null,
      currency || "British Pound",
      gl_no || null,
      bank_name,
      address_line1 || null,
      address_line2 || null,
      city || null,
      county || null,
      postal_code || null,
      country_code || null,
      contact_name || null,
      mobile || null,
      telephone || null,
      fax || null,
      email || null,
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Bank Accounts POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      account_name,
      preferred_name,
      sort_code,
      account_no,
      swift_code,
      iban,
      currency,
      gl_no,
      bank_name,
      address_line1,
      address_line2,
      city,
      county,
      postal_code,
      country_code,
      contact_name,
      mobile,
      telephone,
      fax,
      email,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const query = `
      UPDATE bank_accounts
      SET 
        account_name = $1, preferred_name = $2, sort_code = $3, account_no = $4,
        swift_code = $5, iban = $6, currency = $7, gl_no = $8, bank_name = $9,
        address_line1 = $10, address_line2 = $11, city = $12, county = $13,
        postal_code = $14, country_code = $15, contact_name = $16, mobile = $17,
        telephone = $18, fax = $19, email = $20, updated_at = NOW()
      WHERE id = $21 AND company_id = $22
      RETURNING *;
    `;

    const values: ParamType[] = [
      account_name,
      preferred_name || null,
      sort_code || null,
      account_no,
      swift_code || null,
      iban || null,
      currency || "British Pound",
      gl_no || null,
      bank_name,
      address_line1 || null,
      address_line2 || null,
      city || null,
      county || null,
      postal_code || null,
      country_code || null,
      contact_name || null,
      mobile || null,
      telephone || null,
      fax || null,
      email || null,
      id,
      companyId,
    ];

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Bank Accounts PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing account ID" }, { status: 400 });
    }

    await pool.query(
      "DELETE FROM bank_accounts WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bank Accounts DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
}
