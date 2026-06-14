// app/api/hr/employees/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EmployeeService } from "@/lib/services/hr/employee.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await EmployeeService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Explicitly parse database JSON array properties aggregated via SQL sub-queries
    const { contacts, addresses, ...employeeData } = data;

    return NextResponse.json({
      employee: employeeData,
      contacts: contacts || [],
      addresses: addresses || [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load employee" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    await EmployeeService.update(companyId, id, body);

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update employee",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await EmployeeService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete employee",
      },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EmployeeService } from "@/lib/services/hr/employee.service";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await EmployeeService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      employee: data,
      contacts: data.contacts || [],
      addresses: data.addresses || [],
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load employee",
      },
      {
        status: 500,
      },
    );
  }
}


export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();

    await EmployeeService.update(companyId, id, body);

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update employee",
      },
      {
        status: 500,
      },
    );
  }
}



export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await EmployeeService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete employee",
      },
      {
        status: 500,
      },
    );
  }
} */
