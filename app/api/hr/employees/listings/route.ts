// app/api/hr/employees/listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EmployeeService } from "@/lib/services/hr/employee.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const result = await EmployeeService.listPaginated(companyId, body);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load employee listings:", err);
    return NextResponse.json(
      { error: "Failed to load employee listings" },
      { status: 500 },
    );
  }
}
