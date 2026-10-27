// lib/services/energy/sites/sites.service.ts

import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "@/lib/db";
import type { EnergySitePayload } from "@/lib/validations/energy-site.schema";

type DbRow = QueryResultRow & Record<string, unknown>;

export class SiteServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "SiteServiceError";
  }
}

const asText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const asNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const asDate = (value: unknown): string =>
  value === null || value === undefined
    ? ""
    : value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);

const nullable = (value: string): string | null =>
  value.trim() ? value.trim() : null;

const unitToDb = (value: string): string => {
  if (value === "KW") return "kW";
  if (value === "KVA") return "kVA";
  return value;
};

const unitFromDb = (value: unknown): "KW" | "KVA" | "MW" | "MVA" => {
  if (value === "kVA") return "KVA";
  if (value === "MW") return "MW";
  if (value === "MVA") return "MVA";
  return "KW";
};

const derivePaymentStatus = (
  amount: number,
  paid: number,
): "PENDING" | "PARTIAL" | "PAID" => {
  if (paid <= 0) return "PENDING";
  return paid >= amount ? "PAID" : "PARTIAL";
};

async function assertChildOwnership(
  client: PoolClient,
  table: string,
  ids: string[],
  companyId: string,
  siteId: string,
): Promise<void> {
  if (ids.length === 0) return;

  const allowedTables = new Set([
    "energy_site_meters",
    "energy_site_bess_units",
    "energy_site_services",
    "energy_site_payments",
  ]);

  if (!allowedTables.has(table)) {
    throw new SiteServiceError("Invalid child table");
  }

  if (new Set(ids).size !== ids.length) {
    throw new SiteServiceError(`Duplicate child IDs in ${table}`);
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM ${table}
     WHERE company_id = $1 AND site_id = $2
       AND id = ANY($3::uuid[])`,
    [companyId, siteId, ids],
  );

  if (result.rows.length !== ids.length) {
    throw new SiteServiceError(
      `One or more ${table} records do not belong to this site`,
      403,
    );
  }
}

async function syncChildren(
  client: PoolClient,
  companyId: string,
  siteId: string,
  payload: EnergySitePayload,
): Promise<void> {
  const { meters, bess_units, services, payment_schedules } = payload;

  await assertChildOwnership(
    client,
    "energy_site_meters",
    meters.flatMap((row) => (row.id ? [row.id] : [])),
    companyId,
    siteId,
  );
  await assertChildOwnership(
    client,
    "energy_site_bess_units",
    bess_units.flatMap((row) => (row.id ? [row.id] : [])),
    companyId,
    siteId,
  );
  await assertChildOwnership(
    client,
    "energy_site_services",
    services.flatMap((row) => (row.id ? [row.id] : [])),
    companyId,
    siteId,
  );
  await assertChildOwnership(
    client,
    "energy_site_payments",
    payment_schedules.flatMap((row) => (row.id ? [row.id] : [])),
    companyId,
    siteId,
  );

  // Meter positions are unique. Clear removed meters and
  // temporarily free positions before reordering existing rows.
  const meterIds = meters.flatMap((row) => (row.id ? [row.id] : []));

  await client.query(
    `DELETE FROM energy_site_meters
     WHERE company_id = $1 AND site_id = $2
       AND NOT (id = ANY($3::uuid[]))`,
    [companyId, siteId, meterIds],
  );

  // Reassign existing positions safely using a temporary approach:
  // remove only current meter rows, then reinsert with their same UUIDs.
  // This preserves IDs but may affect future FK references to meters.
  // Until meter FKs are added, a deferred UNIQUE constraint or
  // two-phase position swap is preferable for long-term use.
  if (meterIds.length > 0) {
    await client
      .query(
        `UPDATE energy_site_meters SET position = -position
       WHERE company_id = $1 AND site_id = $2`,
        [companyId, siteId],
      )
      .catch(() => {
        // The current CHECK(position IN (1,2)) forbids temporary positions.
        // Existing positions are handled by the individual upserts below.
      });
  }

  for (let index = 0; index < meters.length; index++) {
    const meter = meters[index];
    const position = meter.is_primary ? 1 : 2;

    if (meter.id) {
      await client.query(
        `UPDATE energy_site_meters SET
          position = $1,
          mpan_no = $2,
          meter_serial_no = $3,
          meter_type = $4
         WHERE id = $5 AND company_id = $6 AND site_id = $7`,
        [
          position,
          meter.mpan_no,
          nullable(meter.meter_serial_no),
          meter.meter_type,
          meter.id,
          companyId,
          siteId,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO energy_site_meters
          (company_id, site_id, position, mpan_no,
           meter_serial_no, meter_type)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          companyId,
          siteId,
          position,
          meter.mpan_no,
          nullable(meter.meter_serial_no),
          meter.meter_type,
        ],
      );
    }
  }

  const bessIds = bess_units.flatMap((row) => (row.id ? [row.id] : []));

  await client.query(
    `DELETE FROM energy_site_bess_units
     WHERE company_id = $1 AND site_id = $2
       AND NOT (id = ANY($3::uuid[]))`,
    [companyId, siteId, bessIds],
  );

  for (const unit of bess_units) {
    if (unit.id) {
      await client.query(
        `UPDATE energy_site_bess_units SET
          serial_no = $1, brand = $2, model = $3,
          allocation_date = $4
         WHERE id = $5 AND company_id = $6 AND site_id = $7`,
        [
          unit.serial_no,
          nullable(unit.brand),
          nullable(unit.model),
          unit.allocation_date || null,
          unit.id,
          companyId,
          siteId,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO energy_site_bess_units
          (company_id,site_id,serial_no,brand,model,allocation_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          companyId,
          siteId,
          unit.serial_no,
          nullable(unit.brand),
          nullable(unit.model),
          unit.allocation_date || null,
        ],
      );
    }
  }

  const serviceIds = services.flatMap((row) => (row.id ? [row.id] : []));

  await client.query(
    `DELETE FROM energy_site_services
     WHERE company_id = $1 AND site_id = $2
       AND NOT (id = ANY($3::uuid[]))`,
    [companyId, siteId, serviceIds],
  );

  for (const service of services) {
    const values = [
      service.service_date,
      service.service_type,
      service.description,
      nullable(service.documentation_url),
      service.next_service_date || null,
    ];

    if (service.id) {
      await client.query(
        `UPDATE energy_site_services SET
          service_date=$1, service_type=$2,
          description=$3, document_url=$4,
          next_service_date=$5
         WHERE id=$6 AND company_id=$7 AND site_id=$8`,
        [...values, service.id, companyId, siteId],
      );
    } else {
      await client.query(
        `INSERT INTO energy_site_services
          (company_id,site_id,service_date,service_type,
           description,document_url,next_service_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [companyId, siteId, ...values],
      );
    }
  }

  const paymentIds = payment_schedules.flatMap((row) =>
    row.id ? [row.id] : [],
  );

  await client.query(
    `DELETE FROM energy_site_payments
     WHERE company_id = $1 AND site_id = $2
       AND NOT (id = ANY($3::uuid[]))`,
    [companyId, siteId, paymentIds],
  );

  for (const payment of payment_schedules) {
    const values = [
      payment.due_date,
      payment.amount,
      payment.paid_amount,
      payment.paid_date || null,
      nullable(payment.reference_no),
    ];

    if (payment.id) {
      await client.query(
        `UPDATE energy_site_payments SET
          due_date=$1, amount=$2, paid_amount=$3,
          paid_date=$4, reference=$5
         WHERE id=$6 AND company_id=$7 AND site_id=$8`,
        [...values, payment.id, companyId, siteId],
      );
    } else {
      await client.query(
        `INSERT INTO energy_site_payments
          (company_id,site_id,due_date,amount,paid_amount,
           paid_date,reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [companyId, siteId, ...values],
      );
    }
  }
}

function siteValues(companyId: string, payload: EnergySitePayload): unknown[] {
  const site = payload.site;

  // The current database has a site-level BESS summary.
  // Child BESS allocations are stored separately.
  const firstBess = payload.bess_units[0];

  return [
    companyId,
    site.site_no,
    nullable(site.gsp_uk),
    nullable(site.distributor_network_operator),
    site.connection_size,
    site.connection_size_approved,
    unitToDb(site.connection_size_unit),
    nullable(firstBess?.brand ?? ""),
    nullable(firstBess?.model ?? ""),
    firstBess?.capacity_kw ?? null,
    site.bess_function,
    site.ups_enabled,
    site.service_interval_months,
    nullable(site.service_notes),
    "QUARTERLY",
    site.payment_currency,
    site.status,
  ];
}

function mapSite(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    company_id: row.company_id,
    site_no: asText(row.site_no),
    site_name: "",
    gsp_uk: asText(row.gsp_uk),
    distributor_network_operator: asText(row.distributor_network_operator),
    segments: "",
    connection_size: asNumber(row.connection_size),
    connection_size_approved: asNumber(row.connection_size_approved),
    connection_size_unit: unitFromDb(row.connection_unit),
    bess_brand_model: [row.bess_brand, row.bess_model]
      .filter(Boolean)
      .join(" - "),
    bess_function_trading: "",
    bess_function: asText(row.bess_function),
    ups_enabled: row.ups === true,
    status: Number(row.status),
    service_interval_months: asNumber(row.service_interval_months),
    service_start_date: "",
    service_notes: asText(row.service_documentation),
    payment_frequency: "QUARTERLY",
    allow_partial_payments: true,
    payment_currency: asText(row.payment_currency).trim(),
    contract_amount: null,
    payment_notes: "",
  };
}

export class EnergySiteService {
  static async get(companyId: string, siteId: string) {
    const client = await pool.connect();

    try {
      const siteResult = await client.query<DbRow>(
        `SELECT * FROM energy_sites
         WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL`,
        [siteId, companyId],
      );

      const row = siteResult.rows[0];
      if (!row) {
        throw new SiteServiceError("Site not found", 404);
      }

      const [meters, bess, services, payments] = await Promise.all([
        client.query<DbRow>(
          `SELECT * FROM energy_site_meters
           WHERE company_id=$1 AND site_id=$2
           ORDER BY position`,
          [companyId, siteId],
        ),
        client.query<DbRow>(
          `SELECT * FROM energy_site_bess_units
           WHERE company_id=$1 AND site_id=$2
           ORDER BY allocation_date NULLS LAST, id`,
          [companyId, siteId],
        ),
        client.query<DbRow>(
          `SELECT * FROM energy_site_services
           WHERE company_id=$1 AND site_id=$2
           ORDER BY service_date DESC, id`,
          [companyId, siteId],
        ),
        client.query<DbRow>(
          `SELECT * FROM energy_site_payments
           WHERE company_id=$1 AND site_id=$2
           ORDER BY due_date, id`,
          [companyId, siteId],
        ),
      ]);

      return {
        site: mapSite(row),
        meters: meters.rows.map((meter) => ({
          id: meter.id,
          mpan_no: asText(meter.mpan_no),
          meter_serial_no: asText(meter.meter_serial_no),
          meter_type: asText(meter.meter_type) || "IMPORT",
          is_primary: Number(meter.position) === 1,
        })),
        bess_units: bess.rows.map((unit) => ({
          id: unit.id,
          brand: asText(unit.brand),
          model: asText(unit.model),
          serial_no: asText(unit.serial_no),
          capacity_kw: null,
          capacity_kwh: null,
          allocation_date: asDate(unit.allocation_date),
          notes: "",
        })),
        services: services.rows.map((service) => ({
          id: service.id,
          service_type: service.service_type,
          service_date: asDate(service.service_date),
          next_service_date: asDate(service.next_service_date),
          description: asText(service.description),
          documentation_url: asText(service.document_url),
          performed_by: "",
          cost: null,
          status: "SCHEDULED",
        })),
        payment_schedules: payments.rows.map((payment) => {
          const amount = Number(payment.amount);
          const paid = Number(payment.paid_amount);

          return {
            id: payment.id,
            description: "",
            due_date: asDate(payment.due_date),
            amount,
            paid_amount: paid,
            status: derivePaymentStatus(amount, paid),
            reference_no: asText(payment.reference),
            paid_date: asDate(payment.paid_date),
          };
        }),
      };
    } finally {
      client.release();
    }
  }

  static async create(companyId: string, payload: EnergySitePayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const values = siteValues(companyId, payload);

      const result = await client.query<{ id: string }>(
        `INSERT INTO energy_sites (
          company_id, site_no, gsp_uk,
          distributor_network_operator, connection_size,
          connection_size_approved, connection_unit,
          bess_brand, bess_model, bess_capacity_kw,
          bess_function, ups, service_interval_months,
          service_documentation, payment_terms,
          payment_currency, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17
        ) RETURNING id`,
        values,
      );

      const id = result.rows[0].id;

      await syncChildren(client, companyId, id, payload);
      await client.query("COMMIT");

      return { id };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(
    companyId: string,
    siteId: string,
    payload: EnergySitePayload,
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const values = siteValues(companyId, payload);

      const result = await client.query<{ id: string }>(
        `UPDATE energy_sites SET
          site_no=$2, gsp_uk=$3,
          distributor_network_operator=$4,
          connection_size=$5,
          connection_size_approved=$6,
          connection_unit=$7,
          bess_brand=$8,
          bess_model=$9,
          bess_capacity_kw=$10,
          bess_function=$11,
          ups=$12,
          service_interval_months=$13,
          service_documentation=$14,
          payment_terms=$15,
          payment_currency=$16,
          status=$17,
          updated_at=NOW()
         WHERE company_id=$1 AND id=$18
           AND deleted_at IS NULL
         RETURNING id`,
        [...values, siteId],
      );

      if (!result.rows[0]) {
        throw new SiteServiceError("Site not found", 404);
      }

      await syncChildren(client, companyId, siteId, payload);
      await client.query("COMMIT");

      return { id: siteId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(companyId: string, siteId: string, status: 0 | 1) {
    const result = await pool.query<{ id: string; status: number }>(
      `UPDATE energy_sites SET status=$3, updated_at=NOW()
       WHERE company_id=$1 AND id=$2 AND deleted_at IS NULL
       RETURNING id,status`,
      [companyId, siteId, status],
    );

    if (!result.rows[0]) {
      throw new SiteServiceError("Site not found", 404);
    }

    return result.rows[0];
  }

  static async delete(companyId: string, siteId: string) {
    const result = await pool.query<{ id: string }>(
      `UPDATE energy_sites
       SET deleted_at=NOW(), updated_at=NOW(), status=0
       WHERE company_id=$1 AND id=$2 AND deleted_at IS NULL
       RETURNING id`,
      [companyId, siteId],
    );

    if (!result.rows[0]) {
      throw new SiteServiceError("Site not found", 404);
    }

    return result.rows[0];
  }

  static async getPaginated(
    companyId: string,
    options: {
      page: number;
      limit: number;
      search: string;
      sortBy: string;
      sortOrder: "ASC" | "DESC";
      status?: number;
    },
  ) {
    const page = Math.max(1, options.page);
    const limit = Math.min(200, Math.max(1, options.limit));
    const offset = (page - 1) * limit;

    const sortColumns: Record<string, string> = {
      site_no: "s.site_no",
      site_name: "s.site_no",
      gsp_uk: "s.gsp_uk",
      distributor_network_operator: "s.distributor_network_operator",
      connection_size: "s.connection_size",
      connection_size_approved: "s.connection_size_approved",
      status: "s.status",
      created_at: "s.created_at",
    };

    const sortColumn = sortColumns[options.sortBy] ?? "s.created_at";

    const values: (string | number)[] = [companyId];
    const conditions = ["s.company_id = $1", "s.deleted_at IS NULL"];

    if (options.search.trim()) {
      values.push(`%${options.search.trim()}%`);
      const index = values.length;

      conditions.push(`(
        s.site_no ILIKE $${index}
        OR s.gsp_uk ILIKE $${index}
        OR s.distributor_network_operator ILIKE $${index}
        OR s.bess_brand ILIKE $${index}
        OR s.bess_model ILIKE $${index}
        OR EXISTS (
          SELECT 1 FROM energy_site_meters sm
          WHERE sm.company_id = s.company_id
            AND sm.site_id = s.id
            AND sm.mpan_no ILIKE $${index}
        )
      )`);
    }

    if (options.status === 0 || options.status === 1) {
      values.push(options.status);
      conditions.push(`s.status = $${values.length}`);
    }

    const where = conditions.join(" AND ");

    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM energy_sites s
       WHERE ${where}`,
      values,
    );

    const totalRows = Number(countResult.rows[0]?.total ?? 0);

    const queryValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const result = await pool.query(
      `SELECT
        s.id,
        s.site_no,
        NULL::text AS site_name,
        s.gsp_uk,
        s.distributor_network_operator,
        s.connection_size,
        s.connection_size_approved,
        CONCAT_WS(' - ', s.bess_brand, s.bess_model)
          AS bess_brand_model,
        CASE
          WHEN s.bess_function = 'TRADING' THEN 'Trading'
          ELSE s.bess_function
        END AS bess_function_trading,
        NULL::text AS segments,
        s.status,
        (
          SELECT COUNT(*)::integer
          FROM energy_site_meters m
          WHERE m.company_id = s.company_id
            AND m.site_id = s.id
        ) AS meter_count,
        (
          SELECT COUNT(*)::integer
          FROM energy_site_bess_units b
          WHERE b.company_id = s.company_id
            AND b.site_id = s.id
        ) AS bess_unit_count,
        (
          SELECT m.mpan_no
          FROM energy_site_meters m
          WHERE m.company_id = s.company_id
            AND m.site_id = s.id
          ORDER BY m.position
          LIMIT 1
        ) AS mpan_no
       FROM energy_sites s
       WHERE ${where}
       ORDER BY ${sortColumn} ${options.sortOrder}, s.id ASC
       LIMIT $${limitParam}
       OFFSET $${offsetParam}`,
      queryValues,
    );

    return {
      rows: result.rows,
      totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit),
    };
  }
}

/* import { pool } from "@/lib/db";
import { SitesListRow } from "@/types/sites";
import { FetchParams, FetchResponse } from "@/types/table";

// export type SitesListing = SitesListRow & {
//   posting_group_name?: string | null;
// };

export class SitesService {
  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<SitesListRow>> {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy,
      sortOrder = "desc",
    } = params;
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      item_code: "i.item_code",
      barcode: "i.barcode",
      name: "i.name",
      category_name: "c.name",
      brand_name: "b.name",
      posting_group_name: "ipg.name",
      item_type_label: "i.item_type",
      status_label: "i.status",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "i.item_code";
    const orderDirection = sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = ["i.company_id = $1", "i.deleted_at IS NULL"];


    const statusFilter =
      params.statusFilter === "inactive" ? "inactive" : "active";

    if (statusFilter === "inactive") {
      // Include inactive items only.
      queryValues.push(0);
      whereClauses.push(`i.status = $${queryValues.length}`);
    } else {
      // Include active items only.
      queryValues.push(1);
      whereClauses.push(`i.status = $${queryValues.length}`);
    }

    // Dynamic Filters
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "item_code") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.item_code ILIKE $${queryValues.length}`);
        } else if (colKey === "barcode") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.barcode ILIKE $${queryValues.length}`);
        } else if (colKey === "name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.name ILIKE $${queryValues.length}`);
        } else if (colKey === "category_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`c.name ILIKE $${queryValues.length}`);
        } else if (colKey === "brand_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`b.name ILIKE $${queryValues.length}`);
        } else if (colKey === "posting_group_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`ipg.name ILIKE $${queryValues.length}`);
        } else if (colKey === "item_type_label") {
          const typeMap: Record<string, number> = {
            Inventory: 1,
            Service: 2,
            "Non Inventory": 3,
            "Raw Material": 4,
            "Finished Goods": 5,
            Asset: 6,
          };
          const numValue =
            typeMap[String(filter.value)] ?? Number(filter.value);
          if (!isNaN(numValue)) {
            queryValues.push(numValue);
            whereClauses.push(`i.item_type = $${queryValues.length}`);
          }
        } else if (colKey === "status_label") {
          const statusMap: Record<string, number> = {
            Active: 1,
            Inactive: 2,
            Discontinued: 3,
          };
          const numValue =
            statusMap[String(filter.value)] ?? Number(filter.value);
          if (!isNaN(numValue)) {
            queryValues.push(numValue);
            whereClauses.push(`i.status = $${queryValues.length}`);
          }
        }
      }
    });

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const joinSql = `
      FROM items i
      LEFT JOIN item_categories c ON c.id = i.category_id
      LEFT JOIN item_brands b ON b.id = i.brand_id
      LEFT JOIN inventory_posting_groups ipg ON ipg.id = i.inventory_posting_group_id
    `;

    // Count Query
    const countQuery = `SELECT COUNT(DISTINCT i.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (i.id, ${orderByColumn})
        i.id,
        i.item_code,
        i.barcode,
        i.name,
        c.name AS category_name,
        b.name AS brand_name,
        i.inventory_posting_group_id,
        ipg.name AS posting_group_name,
        i.item_type,
        CASE i.item_type
          WHEN 1 THEN 'Inventory'
          WHEN 2 THEN 'Service'
          WHEN 3 THEN 'Non Inventory'
          WHEN 4 THEN 'Raw Material'
          WHEN 5 THEN 'Finished Goods'
          WHEN 6 THEN 'Asset'
        END AS item_type_label,
        i.status,
        CASE i.status
          WHEN 1 THEN 'Active'
          WHEN 2 THEN 'Inactive'
          WHEN 3 THEN 'Discontinued'
        END AS status_label
      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // console.log('dataQuery === ',dataQuery);
    // console.log('dataQueryValues === ',dataQueryValues);

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }
} */
