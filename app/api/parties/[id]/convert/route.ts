// app/api/parties/[id]/convert/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type ConvertType = "to_customer" | "to_supplier";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Unauthorized operation sequence blocked." },
      { status: 401 },
    );
  }

  const { id: partyId } = await params;

  try {
    const body = await req.json();
    const targetType: ConvertType = body.targetType;

    if (!targetType || !["to_customer", "to_supplier"].includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid target conversion type requested." },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");


      const existingRes = await client.query(
        `SELECT id, is_crm_lead, is_srm_vendor, is_customer, is_supplier, 
                customer_code, supplier_code 
         FROM parties 
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [partyId, companyId],
      );

      if (existingRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Party record not found." },
          { status: 404 },
        );
      }

      const party = existingRes.rows[0];

      if (targetType === "to_customer") {
        if (party.is_customer) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Party is already a Customer." },
            { status: 400 },
          );
        }

        let customerCode = party.customer_code;
        if (!customerCode) {
          const custSeq = await client.query(
            "SELECT get_next_sequence($1, 'customer') AS code",
            [companyId],
          );
          customerCode = custSeq.rows[0]?.code || null;
        }

        const updateRes = await client.query(
          `UPDATE parties 
           SET is_customer = true, 
               customer_code = $1, 
               updated_at = now() 
           WHERE id = $2 AND company_id = $3 
           RETURNING *`,
          [customerCode, partyId, companyId],
        );

        await client.query("COMMIT");
        return NextResponse.json({
          message: "Successfully converted CRM record to Customer.",
          party: updateRes.rows[0],
        });
      } else if (targetType === "to_supplier") {
        if (party.is_supplier) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Party is already a Supplier." },
            { status: 400 },
          );
        }

        let supplierCode = party.supplier_code;
        if (!supplierCode) {
          const suppSeq = await client.query(
            "SELECT get_next_sequence($1, 'supplier') AS code",
            [companyId],
          );
          supplierCode = suppSeq.rows[0]?.code || null;
        }

        const updateRes = await client.query(
          `UPDATE parties 
           SET is_supplier = true, 
               supplier_code = $1, 
               updated_at = now() 
           WHERE id = $2 AND company_id = $3 
           RETURNING *`,
          [supplierCode, partyId, companyId],
        );

        await client.query("COMMIT");
        return NextResponse.json({
          message: "Successfully converted SRM record to Supplier.",
          party: updateRes.rows[0],
        });
      }
    } catch (dbErr) {
      await client.query("ROLLBACK");
      console.error("Conversion Transaction Error:", dbErr);
      const err = dbErr as { message?: string };
      return NextResponse.json(
        { error: err.message || "Failed to convert party record." },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Malformed payload body." },
      { status: 400 },
    );
  }
}
