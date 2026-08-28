// app/api/table-config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ColumnConfig } from "@/types/table";
import { getDefaultTableConfig } from "@/lib/constants/table-configs";

/**
 * Conditionally resolves dynamic options (Currencies, Stages, etc.)
 * strictly when required by the configuration keys or optionSource.
 */
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
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ColumnConfig } from "@/types/table";
import { getDefaultTableConfig } from "@/lib/constants/table-configs";


async function injectDynamicOptions(
  companyId: string,
  configs: ColumnConfig[],
): Promise<ColumnConfig[]> {
  const client = await pool.connect();

  try {
    // 1. Fetch Company Currencies
    const currenciesRes = await client.query(
      `SELECT c.code AS label, c.code AS value
       FROM company_currencies cc
       INNER JOIN currencies c ON c.id = cc.currency_id
       WHERE cc.company_id = $1 AND cc.status = 1
       ORDER BY c.code ASC`,
      [companyId],
    );

    // 2. Fetch Common Order Stages
    const stagesRes = await client.query(
      `SELECT name AS label, name AS value
       FROM common_order_stages
       WHERE company_id = $1 AND stage_type = 'purchase_order'
       ORDER BY rank ASC, name ASC`,
      [companyId],
    );

    const currencyOptions = currenciesRes.rows;
    const stageOptions = stagesRes.rows;

    // 3. Map dynamic options into matching columns
    return configs.map((col) => {
      if (col.columnKey === "currency" || col.optionSource === "currencies") {
        return { ...col, options: currencyOptions };
      }
      if (col.columnKey === "current_stage" || col.optionSource === "stages") {
        return { ...col, options: stageOptions };
      }
      return col;
    });
  } catch (err) {
    console.error("Failed to populate dynamic select options:", err);
    return configs; // Fallback to raw config if query fails
  } finally {
    client.release();
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
      [userId, moduleKey],
    );

    let rawConfigs: ColumnConfig[] =
      res.rows.length > 0 ? res.rows : getDefaultTableConfig(moduleKey);

    // Populate dynamic options based on company master data
    if (companyId) {
      rawConfigs = await injectDynamicOptions(companyId, rawConfigs);
    }

    return NextResponse.json(rawConfigs);
  } catch (err) {
    console.error("GET table-config error:", err);
    let fallbackConfigs = getDefaultTableConfig(moduleKey);

    if (companyId) {
      fallbackConfigs = await injectDynamicOptions(companyId, fallbackConfigs);
    }

    return NextResponse.json(fallbackConfigs);
  }
}

export async function POST(req: NextRequest) {
  const { moduleKey, configs } = await req.json();
  const userId = "DEFAULT_USER";

  try {
    for (const col of configs as ColumnConfig[]) {
      await pool.query(
        `INSERT INTO table_column_configs (user_id, module_key, column_key, label, data_type, is_visible, is_pinned, column_order, column_width, header_color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, module_key, column_key) DO UPDATE SET
           is_visible = EXCLUDED.is_visible,
           is_pinned = EXCLUDED.is_pinned,
           column_order = EXCLUDED.column_order,
           column_width = EXCLUDED.column_width,
           header_color = EXCLUDED.header_color`,
        [
          userId,
          moduleKey,
          col.columnKey,
          col.label,
          col.dataType,
          col.isVisible,
          col.isPinned,
          col.columnOrder,
          col.columnWidth,
          col.headerColor || null,
        ],
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save config error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
 */