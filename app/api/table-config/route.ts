// app/api/table-config/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { ColumnConfig } from "@/types/table";

import { getDefaultTableConfig } from "@/lib/constants/table-configs";

/* -------------------------------------------------------------------------- */
/* Dynamic Option Injection                                                   */
/* -------------------------------------------------------------------------- */

async function injectDynamicOptions(
  companyId: string,
  configs: ColumnConfig[],
): Promise<ColumnConfig[]> {
  const needsCurrencies = configs.some(
    (column) =>
      column.columnKey === "currency" || column.optionSource === "currencies",
  );

  const needsStages = configs.some(
    (column) =>
      column.columnKey === "current_stage" || column.optionSource === "stages",
  );

  /*
   * Nothing dynamic is required.
   */
  if (!needsCurrencies && !needsStages) {
    return configs;
  }

  try {
    const currencyPromise = needsCurrencies
      ? pool.query<{
          label: string;
          value: string;
        }>(
          `
              SELECT
                c.code AS label,
                c.code AS value
              FROM company_currencies cc
              INNER JOIN currencies c
                ON c.id = cc.currency_id
              WHERE
                cc.company_id = $1
                AND cc.status = 1
              ORDER BY c.code ASC
            `,
          [companyId],
        )
      : null;

    const stagesPromise = needsStages
      ? pool.query<{
          label: string;
          value: string;
        }>(
          `
              SELECT
                name AS label,
                name AS value
              FROM common_order_stages
              WHERE
                company_id = $1
                AND stage_type = 'purchase_order'
              ORDER BY
                rank ASC,
                name ASC
            `,
          [companyId],
        )
      : null;

    const [currenciesResult, stagesResult] = await Promise.all([
      currencyPromise,
      stagesPromise,
    ]);

    const currencyOptions = currenciesResult?.rows ?? [];

    const stageOptions = stagesResult?.rows ?? [];

    return configs.map((column) => {
      if (
        needsCurrencies &&
        (column.columnKey === "currency" ||
          column.optionSource === "currencies")
      ) {
        return {
          ...column,
          options: currencyOptions,
        };
      }

      if (
        needsStages &&
        (column.columnKey === "current_stage" ||
          column.optionSource === "stages")
      ) {
        return {
          ...column,
          options: stageOptions,
        };
      }

      return column;
    });
  } catch (error) {
    console.error("Failed to populate dynamic select options:", error);

    /*
     * Return configuration without
     * dynamic options rather than failing
     * the complete table configuration.
     */
    return configs;
  }
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const moduleKey = searchParams.get("moduleKey") || "purchase_orders";

  const companyId = await getCompanyId();

  /*
   * IMPORTANT:
   *
   * This is still your existing user
   * implementation.
   *
   * We can replace this with your real
   * authenticated user ID separately.
   */
  const userId = "DEFAULT_USER";

  try {
    const result = await pool.query<ColumnConfig>(
      `
          SELECT
            column_key AS "columnKey",
            label,
            data_type AS "dataType",
            is_visible AS "isVisible",
            is_pinned AS "isPinned",
            column_order AS "columnOrder",
            column_width AS "columnWidth",
            header_color AS "headerColor"
          FROM table_column_configs
          WHERE
            user_id = $1
            AND module_key = $2
          ORDER BY column_order ASC
        `,
      [userId, moduleKey],
    );

    let configs: ColumnConfig[] =
      result.rows.length > 0 ? result.rows : getDefaultTableConfig(moduleKey);

    /*
     * Always return a fresh array.
     * This avoids accidentally mutating
     * DEFAULT_CONFIGS.
     */
    configs = configs
      .map((column) => ({
        ...column,
        options: column.options ? [...column.options] : undefined,
      }))
      .sort((a, b) => a.columnOrder - b.columnOrder);

    if (companyId && configs.length > 0) {
      configs = await injectDynamicOptions(companyId, configs);
    }

    return NextResponse.json(configs);
  } catch (error) {
    console.error("GET table-config error:", error);

    const fallbackConfigs = getDefaultTableConfig(moduleKey);

    return NextResponse.json(fallbackConfigs);
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { moduleKey, configs } = body as {
      moduleKey?: string;
      configs?: ColumnConfig[];
    };

    const userId = "DEFAULT_USER";

    /* ---------------------------------------------------------------------- */
    /* Basic Validation                                                       */
    /* ---------------------------------------------------------------------- */

    if (!moduleKey || !Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
        },
        { status: 400 },
      );
    }

    /*
     * Get the known/default configuration.
     *
     * We use it to prevent the client from
     * creating completely arbitrary columns.
     */
    const defaultConfigs = getDefaultTableConfig(moduleKey);

    if (defaultConfigs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Unknown module key",
        },
        { status: 400 },
      );
    }

    const allowedColumns = new Map(
      defaultConfigs.map((column) => [column.columnKey, column]),
    );

    /* ---------------------------------------------------------------------- */
    /* Validate Configuration                                                 */
    /* ---------------------------------------------------------------------- */

    const invalidColumn = configs.find((column) => {
      const knownColumn = allowedColumns.get(column.columnKey);

      if (!knownColumn) {
        return true;
      }

      if (!Number.isInteger(column.columnOrder) || column.columnOrder < 1) {
        return true;
      }

      if (
        !Number.isInteger(column.columnWidth) ||
        column.columnWidth < 50 ||
        column.columnWidth > 1000
      ) {
        return true;
      }

      if (
        typeof column.isVisible !== "boolean" ||
        typeof column.isPinned !== "boolean"
      ) {
        return true;
      }

      return false;
    });

    if (invalidColumn) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid column configuration",
          columnKey: invalidColumn.columnKey,
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Prevent Duplicate Column Keys                                          */
    /* ---------------------------------------------------------------------- */

    const columnKeys = configs.map((column) => column.columnKey);

    const uniqueColumnKeys = new Set(columnKeys);

    if (uniqueColumnKeys.size !== columnKeys.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate column keys are not allowed",
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Prepare Bulk UPSERT                                                    */
    /* ---------------------------------------------------------------------- */

    const columnKeysArray: string[] = [];

    const labels: string[] = [];

    const dataTypes: string[] = [];

    const isVisibles: boolean[] = [];

    const isPinneds: boolean[] = [];

    const columnOrders: number[] = [];

    const columnWidths: number[] = [];

    const headerColors: (string | null)[] = [];

    configs.forEach((column) => {
      const knownColumn = allowedColumns.get(column.columnKey)!;

      columnKeysArray.push(column.columnKey);

      /*
       * Label/data type should come
       * from the known server-side
       * configuration rather than
       * blindly trusting the client.
       */
      labels.push(knownColumn.label);

      dataTypes.push(knownColumn.dataType);

      isVisibles.push(column.isVisible);

      isPinneds.push(column.isPinned);

      columnOrders.push(column.columnOrder);

      columnWidths.push(column.columnWidth);

      headerColors.push(column.headerColor || null);
    });

    /* ---------------------------------------------------------------------- */
    /* Bulk UPSERT                                                            */
    /* ---------------------------------------------------------------------- */

    const query = `
      INSERT INTO table_column_configs
        (
          user_id,
          module_key,
          column_key,
          label,
          data_type,
          is_visible,
          is_pinned,
          column_order,
          column_width,
          header_color
        )
      SELECT
        $1,
        $2,
        *
      FROM UNNEST(
        $3::text[],
        $4::text[],
        $5::text[],
        $6::boolean[],
        $7::boolean[],
        $8::int[],
        $9::int[],
        $10::text[]
      )
      ON CONFLICT (
        user_id,
        module_key,
        column_key
      )
      DO UPDATE SET
        label =
          EXCLUDED.label,
        data_type =
          EXCLUDED.data_type,
        is_visible =
          EXCLUDED.is_visible,
        is_pinned =
          EXCLUDED.is_pinned,
        column_order =
          EXCLUDED.column_order,
        column_width =
          EXCLUDED.column_width,
        header_color =
          EXCLUDED.header_color
    `;

    await pool.query(query, [
      userId,
      moduleKey,
      columnKeysArray,
      labels,
      dataTypes,
      isVisibles,
      isPinneds,
      columnOrders,
      columnWidths,
      headerColors,
    ]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Save table config error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save table configuration",
      },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ColumnConfig } from "@/types/table";
import { getDefaultTableConfig } from "@/lib/constants/table-configs";


async function injectDynamicOptions(
  companyId: string,
  configs: ColumnConfig[]
): Promise<ColumnConfig[]> {
  // 1. Determine which dynamic option sources are actually needed
  const needsCurrencies = configs.some(
    (col) => col.columnKey === "currency" || col.optionSource === "currencies"
  );
  const needsStages = configs.some(
    (col) => col.columnKey === "current_stage" || col.optionSource === "stages"
  );

  // Early return if no dynamic options are needed for this module
  if (!needsCurrencies && !needsStages) {
    return configs;
  }

  try {
    const fetchPromises: [
      Promise<{ rows: { label: string; value: string }[] }> | null,
      Promise<{ rows: { label: string; value: string }[] }> | null
    ] = [null, null];

    // 2. Fetch only necessary master data concurrently
    if (needsCurrencies) {
      fetchPromises[0] = pool.query(
        `SELECT c.code AS label, c.code AS value
         FROM company_currencies cc
         INNER JOIN currencies c ON c.id = cc.currency_id
         WHERE cc.company_id = $1 AND cc.status = 1
         ORDER BY c.code ASC`,
        [companyId]
      );
    }

    if (needsStages) {
      fetchPromises[1] = pool.query(
        `SELECT name AS label, name AS value
         FROM common_order_stages
         WHERE company_id = $1 AND stage_type = 'purchase_order'
         ORDER BY rank ASC, name ASC`,
        [companyId]
      );
    }

    const [currenciesRes, stagesRes] = await Promise.all(fetchPromises);

    const currencyOptions = currenciesRes?.rows || [];
    const stageOptions = stagesRes?.rows || [];

    // 3. Inject options into matching columns
    return configs.map((col) => {
      if (
        needsCurrencies &&
        (col.columnKey === "currency" || col.optionSource === "currencies")
      ) {
        return { ...col, options: currencyOptions };
      }
      if (
        needsStages &&
        (col.columnKey === "current_stage" || col.optionSource === "stages")
      ) {
        return { ...col, options: stageOptions };
      }
      return col;
    });
  } catch (err) {
    console.error("Failed to populate dynamic select options:", err);
    return configs; // Graceful fallback
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleKey = searchParams.get("moduleKey") || "purchase_orders";
  const companyId = await getCompanyId();
  const userId = "DEFAULT_USER";

  try {
    const res = await pool.query(
      `SELECT column_key as "columnKey", label, data_type as "dataType", 
              is_visible as "isVisible", is_pinned as "isPinned", 
              column_order as "columnOrder", column_width as "columnWidth", 
              header_color as "headerColor"
       FROM table_column_configs
       WHERE user_id = $1 AND module_key = $2
       ORDER BY column_order ASC`,
      [userId, moduleKey]
    );

    let rawConfigs: ColumnConfig[] =
      res.rows.length > 0 ? res.rows : getDefaultTableConfig(moduleKey);

    if (companyId && rawConfigs.length > 0) {
      rawConfigs = await injectDynamicOptions(companyId, rawConfigs);
    }

    return NextResponse.json(rawConfigs);
  } catch (err) {
    console.error("GET table-config error:", err);
    const fallbackConfigs = getDefaultTableConfig(moduleKey);
    return NextResponse.json(fallbackConfigs);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { moduleKey, configs } = (await req.json()) as {
      moduleKey: string;
      configs: ColumnConfig[];
    };
    const userId = "DEFAULT_USER";

    if (!moduleKey || !Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Single query batch UPSERT using PostgreSQL unnest for bulk updates
    const query = `
      INSERT INTO table_column_configs 
        (user_id, module_key, column_key, label, data_type, is_visible, is_pinned, column_order, column_width, header_color)
      SELECT $1, $2, * FROM UNNEST(
        $3::text[], $4::text[], $5::text[], $6::boolean[], $7::boolean[], $8::int[], $9::int[], $10::text[]
      )
      ON CONFLICT (user_id, module_key, column_key) DO UPDATE SET
        is_visible = EXCLUDED.is_visible,
        is_pinned = EXCLUDED.is_pinned,
        column_order = EXCLUDED.column_order,
        column_width = EXCLUDED.column_width,
        header_color = EXCLUDED.header_color;
    `;

    const columnKeys: string[] = [];
    const labels: string[] = [];
    const dataTypes: string[] = [];
    const isVisibles: boolean[] = [];
    const isPinneds: boolean[] = [];
    const columnOrders: number[] = [];
    const columnWidths: number[] = [];
    const headerColors: (string | null)[] = [];

    configs.forEach((col) => {
      columnKeys.push(col.columnKey);
      labels.push(col.label);
      dataTypes.push(col.dataType);
      isVisibles.push(col.isVisible);
      isPinneds.push(col.isPinned);
      columnOrders.push(col.columnOrder);
      columnWidths.push(col.columnWidth);
      headerColors.push(col.headerColor || null);
    });

    await pool.query(query, [
      userId,
      moduleKey,
      columnKeys,
      labels,
      dataTypes,
      isVisibles,
      isPinneds,
      columnOrders,
      columnWidths,
      headerColors,
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save config error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
} */
