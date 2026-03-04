// app/api/admin/companies/[id]/route.ts

import { NextResponse } from "next/server";
import { pool, isDatabaseError } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.is_platform_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, plan, status } = await req.json();
    const { id } = await params;

    // Basic validation to ensure we don't send nulls to the DB
    if (!name || !plan || !status) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE companies 
       SET name = $1, plan = $2, status = $3, updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [name, plan, status, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    if (isDatabaseError(error)) {
      // Example: Handle unique constraint if user tried to change slug (though we disabled it in UI)
      if (error.code === '23505') {
        return NextResponse.json({ error: "Conflict: Data already exists" }, { status: 409 });
      }
    }

    console.error("PATCH Company Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.is_platform_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await pool.query("DELETE FROM companies WHERE id = $1", [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error: unknown) {
    if (isDatabaseError(error)) {
      // Handle foreign key violation (e.g., if company has users and ON DELETE CASCADE isn't set)
      if (error.code === '23503') {
        return NextResponse.json({ 
          error: "Cannot delete company with active records. Remove associated data first." 
        }, { status: 400 });
      }
    }

    console.error("DELETE Company Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}