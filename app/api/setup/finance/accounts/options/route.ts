// app/api/setup/finance/accounts/options/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Corrected to use 'code' instead of 'account_code', and 'is_posting'/'is_active' flags
    const result = await pool.query(
      `SELECT id as value, CONCAT(code, ' - ', name) as label 
       FROM chart_of_accounts 
       WHERE company_id = $1 
         AND is_active = TRUE 
         AND is_posting = TRUE
       ORDER BY code ASC`,
      [session.user.company_id]
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    // Log the actual structural error to your server console for local debugging
    console.error("Database Error inside accounts/options:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch accounts lookup data" }, 
      { status: 500 }
    );
  }
}