// app/api/debit-notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await DebitNoteService.list(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Debit note list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load debit notes",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (!body || !body.debitNote || !Array.isArray(body.lines)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Debit Note payload.",
        },
        { status: 400 },
      );
    }

    const { lines } = body;

    await client.query("BEGIN");

    // 1. Create base document
    const createdNote = await DebitNoteService.create(client, companyId, body);

    if (!createdNote?.id) {
      throw new Error("Failed to generate Debit Note ID.");
    }

    const debitNoteID: string = createdNote.id;

    // 2. Fetch the newly created lines to extract their primary key IDs
    const savedLinesResult = await client.query(
      `
        SELECT
          id,
          item_id,
          warehouse_id,
          line_no
        FROM debit_note_lines
        WHERE debit_note_id = $1
          AND company_id = $2
          AND is_deleted = false
        ORDER BY line_no, id
        `,
      [createdNote.id, companyId],
    );

    const savedLines = savedLinesResult.rows;

    // 3. Match payload lines to real database IDs and save allocations
    for (let i = 0; i < (lines || []).length; i++) {
      const payloadLine = lines[i];
      const dbLine = savedLines[i];

      if (!dbLine) {
        throw new Error(
          `Unable to resolve saved Debit Note line ${i + 1}.`,
        );
      }

      // if (dbLine && payloadLine.allocations?.length > 0) {
      if (
        payloadLine.line_type === "ITEM"
      ) {
        if (!dbLine.item_id) {
          throw new Error(
            `Line ${i + 1}: Item is required.`,
          );
        }

        if (!dbLine.warehouse_id) {
          throw new Error(
            `Line ${i + 1}: Warehouse is required.`,
          );
        }
        await DebitNoteService.saveLineAllocations(
          client,
          companyId,
          debitNoteID,
          dbLine.id,
          dbLine.item_id,
          dbLine.warehouse_id,
          payloadLine.allocations ?? [],
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdNote },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Debit note create error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create debit note",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await DebitNoteService.list(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Debit note list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load debit notes",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    await client.query("BEGIN");

    // 1. Create base document
    const createdNote = await DebitNoteService.create(companyId, body);

    if (!createdNote || !createdNote.id) {
      throw new Error(
        "Failed to generate a valid debit note identification sequence.",
      );
    }

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdNote },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Debit note create error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create debit note",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
