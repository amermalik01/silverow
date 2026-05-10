// app/api/setup/permissions/route.ts
import { NextResponse } from "next/server";

import { PermissionService } from "@/lib/services/auth/permission.service";

export async function GET() {
  try {
    const data = await PermissionService.list();

    return NextResponse.json({
      data,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load permissions",
      },
      {
        status: 500,
      },
    );
  }
}
