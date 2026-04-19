// app/api/setup/warehouses/[id]/contacts/[contactId]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import { apiHandler } from "@/lib/utils/apiHandler";

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  job_title: z.string().optional(),
  type: z.enum(["MANAGER", "SUPERVISOR", "DELIVERY", "BILLING"]).optional(),
  status: z.number().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  return apiHandler(async () => {
    const { id: warehouse_id, contactId } = await params;
    const body = await req.json();

    const cleanedBody = {
      ...body,
      email: body.email || undefined,
      phone: body.phone || undefined,
      mobile: body.mobile || undefined,
      job_title: body.job_title || undefined,
    };

    const data = updateContactSchema.parse(cleanedBody);

    // 🔒 Ensure contact belongs to warehouse
    const check = await pool.query(
      `SELECT id FROM warehouse_contacts WHERE id = $1 AND warehouse_id = $2`,
      [contactId, warehouse_id],
    );

    if (check.rowCount === 0) {
      return NextResponse.json(
        { message: "Contact not found in this warehouse" },
        { status: 404 },
      );
    }

    const res = await pool.query(
      `
      UPDATE warehouse_contacts
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        mobile = COALESCE($4, mobile),
        job_title = COALESCE($5, job_title),
        type = COALESCE($6, type),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
      `,
      [
        data.name ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.mobile ?? null,
        data.job_title ?? null,
        data.type ?? null,
        data.status ?? null,
        contactId,
      ],
    );

    return NextResponse.json(res.rows[0]);
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  return apiHandler(async () => {
    const { id: warehouse_id, contactId } = await params;

    // 🔒 Check ownership
    const check = await pool.query(
      `SELECT id FROM warehouse_contacts WHERE id = $1 AND warehouse_id = $2`,
      [contactId, warehouse_id],
    );

    if (check.rowCount === 0) {
      return NextResponse.json(
        { message: "Contact not found" },
        { status: 404 },
      );
    }

    await pool.query(`DELETE FROM warehouse_contacts WHERE id = $1`, [
      contactId,
    ]);

    return NextResponse.json({ success: true });
  });
}
