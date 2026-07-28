//  app/api/migration/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { parseXlsx } from "@/lib/migration/xlsx.parser";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseXlsx(buffer);

  return NextResponse.json({
    rows,
  });
}
