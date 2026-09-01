// app/api/reports/favorites/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Company not found",
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID not found in session",
        },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT
          ufr.report_code,
          rr.name,
          rr.category,
          rr.route,
          rr.icon
        FROM user_favorite_reports ufr
        INNER JOIN ref_reports rr
          ON rr.code = ufr.report_code
        WHERE ufr.user_id = $1
          AND ufr.company_id = $2
          AND rr.status = true
        ORDER BY ufr.created_at ASC
        `,
        [userId, companyId],
      );

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[GET_REPORT_FAVORITES_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load favorite reports",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Company not found",
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID not found in session",
        },
        { status: 400 },
      );
    }

    const body = await req.json();

    const reportCode = body?.reportCode;

    if (!reportCode) {
      return NextResponse.json(
        {
          success: false,
          error: "reportCode is required",
        },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      // Make sure the report actually exists.
      const reportResult = await client.query(
        `
        SELECT code
        FROM ref_reports
        WHERE code = $1
          AND status = true
        `,
        [reportCode],
      );

      if (reportResult.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Report not found",
          },
          { status: 404 },
        );
      }

      await client.query(
        `
        INSERT INTO user_favorite_reports (
          user_id,
          company_id,
          report_code
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, company_id, report_code)
        DO NOTHING
        `,
        [userId, companyId, reportCode],
      );

      return NextResponse.json({
        success: true,
        message: "Report added to favorites",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[POST_REPORT_FAVORITE_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to add favorite report",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Company not found",
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    const body = await req.json();

    const reportCode = body?.reportCode;

    if (!reportCode) {
      return NextResponse.json(
        {
          success: false,
          error: "reportCode is required",
        },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query(
        `
        DELETE FROM user_favorite_reports
        WHERE user_id = $1
          AND company_id = $2
          AND report_code = $3
        `,
        [userId, companyId, reportCode],
      );

      return NextResponse.json({
        success: true,
        message: "Report removed from favorites",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[DELETE_REPORT_FAVORITE_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove favorite report",
      },
      { status: 500 },
    );
  }
}
