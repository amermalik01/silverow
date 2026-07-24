// lib/services/warehouse.service.ts

import { pool } from "@/lib/db";
import {
  Warehouse,
  WarehouseLocation,
  WarehouseContact,
} from "@/types/warehouse";

export interface CreateWarehouseInput {
  name: string;
  type?: string;
  status?: number;
  is_default?: boolean;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  contact_person?: string | null;
  job_title?: string | null;
  telephone?: string | null;
  direct_line?: string | null;
  mobile?: string | null;
  email?: string | null;
  fax?: string | null;
  e_dispatch_email?: boolean;
  warehouse_storage_type?: string | null;
  parent_location_id?: string | null;
  start_date?: string | Date | null;
  unit_of_measure?: string | null;
  cost_frequency?: string | null;
  currency_id?: string | null;
  cost?: number | string | null;
  comments?: string | null;
  storage_type_id?: string | null;
}

export interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  primary_location_id?: string | null;
}

export interface UpdateWarehousePayload {
  warehouse?: UpdateWarehouseInput;
  name?: string;
  type?: string;
  status?: number;
  is_default?: boolean;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  contact_person?: string | null;
  job_title?: string | null;
  telephone?: string | null;
  direct_line?: string | null;
  mobile?: string | null;
  email?: string | null;
  fax?: string | null;
  e_dispatch_email?: boolean;
  warehouse_storage_type?: string | null;
  parent_location_id?: string | null;
  primary_location_id?: string | null;
  start_date?: string | Date | null;
  unit_of_measure?: string | null;
  cost_frequency?: string | null;
  currency_id?: string | null;
  cost?: number | string | null;
  comments?: string | null;
  storage_type_id?: string | null;
}

export interface CreateLocationInput {
  title: string;
  parent_id?: string | null;
  type?: string;
  code?: string | null;
  is_primary?: boolean;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  capacity_uom_id?: number | string | null;
  start_date?: string | Date | null;
  unit_of_measure?: string | null;
  cost_frequency?: string | null;
  currency?: string | null;
  cost?: number | string | null;
  comments?: string | null;
  status?: number;
}

// export interface UpdateLocationInput extends Partial<CreateLocationInput> {}
export type UpdateLocationInput = Partial<CreateLocationInput>;

export interface CreateContactInput {
  name: string;
  job_title?: string | null;
  location_name?: string | null;
  email?: string | null;
  phone?: string | null;
  telephone?: string | null;
  direct_line?: string | null;
  mobile?: string | null;
  fax?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  type?: string;
  status?: number;
}

// export interface UpdateContactInput extends Partial<CreateContactInput> {}
export type UpdateContactInput = Partial<CreateContactInput>;

export async function getAllWarehouses(companyId: string): Promise<Warehouse[]> {
  const res = await pool.query<Warehouse>(
    `
    SELECT w.*, l.title as primary_location_name
    FROM warehouses w
    LEFT JOIN warehouse_locations l ON w.primary_location_id = l.id
    WHERE w.company_id = $1
    ORDER BY w.created_at DESC
  `,
    [companyId]
  );
  return res.rows;
}

export async function getWarehouseById(
  id: string,
  companyId: string
): Promise<Warehouse | null> {
  const res = await pool.query<Warehouse>(
    `SELECT * FROM warehouses WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  );
  return res.rows[0] || null;
}

export async function createWarehouse(
  companyId: string,
  data: CreateWarehouseInput,
): Promise<{ warehouse: Warehouse; primaryLocation: WarehouseLocation }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Fetch next sequence code
    const seqRes = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "warehouse"],
    );
    const code =
      seqRes.rows[0]?.code || `WH-${Date.now().toString().slice(-6)}`;

    // 2. Clear previous defaults if is_default is true
    if (data.is_default) {
      await client.query(
        `UPDATE warehouses SET is_default = false WHERE company_id = $1`,
        [companyId],
      );
    }

    // 3. Create Warehouse
    const insertWarehouseSql = `
      INSERT INTO warehouses (
        company_id, code, name, type, status, is_default,
        address_line_1, address_line_2, city, county, postcode, country,
        contact_person, job_title, telephone, direct_line, mobile, email, fax, e_dispatch_email,
        warehouse_storage_type, parent_location_id, start_date, unit_of_measure, cost_frequency,
        currency_id, cost, comments, storage_type_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29
      )
      RETURNING *
    `;

    const warehouseRes = await client.query<Warehouse>(insertWarehouseSql, [
      companyId,
      code,
      data.name,
      data.type || "DISTRIBUTION",
      data.status ?? 1,
      Boolean(data.is_default),
      data.address_line_1 || null,
      data.address_line_2 || null,
      data.city || null,
      data.county || null,
      data.postcode || null,
      data.country || null,
      data.contact_person || null,
      data.job_title || null,
      data.telephone || null,
      data.direct_line || null,
      data.mobile || null,
      data.email || null,
      data.fax || null,
      Boolean(data.e_dispatch_email),
      data.warehouse_storage_type || null,
      data.parent_location_id || null,
      data.start_date || null,
      data.unit_of_measure || null,
      data.cost_frequency || null,
      data.currency_id || null,
      data.cost ? Number(data.cost) : null,
      data.comments || null,
      data.storage_type_id || null,
    ]);

    const warehouse = warehouseRes.rows[0];

    // 4. Automatically create primary root location
    const locRes = await client.query(
      `
      INSERT INTO warehouse_locations (
        warehouse_id, company_id, type, title, is_primary,
        address_line_1, address_line_2, city, county, postcode, country
      )
      VALUES ($1, $2, 'WAREHOUSE', $3, true, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        warehouse.id,
        companyId,
        `${data.name} Main`,
        data.address_line_1 || null,
        data.address_line_2 || null,
        data.city || null,
        data.county || null,
        data.postcode || null,
        data.country || null,
      ],
    );

    const location = locRes.rows[0];

    // 5. Link primary location back to warehouse
    await client.query(
      `UPDATE warehouses SET primary_location_id = $1 WHERE id = $2`,
      [location.id, warehouse.id],
    );
    warehouse.primary_location_id = location.id;

    await client.query("COMMIT");
    return { warehouse, primaryLocation: location };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateWarehouse(
  id: string,
  companyId: string,
  payload: UpdateWarehousePayload,
): Promise<Warehouse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const warehouseData = payload.warehouse || payload;

    // 1. Reset defaults if marking current as default
    if (warehouseData.is_default) {
      await client.query(
        `UPDATE warehouses SET is_default = false WHERE company_id = $1 AND id != $2`,
        [companyId, id],
      );
    }

    // 2. Validate primary location if supplied
    if (warehouseData.primary_location_id) {
      const check = await client.query(
        `SELECT 1 FROM warehouse_locations WHERE id = $1 AND warehouse_id = $2`,
        [warehouseData.primary_location_id, id],
      );

      if (check.rowCount === 0) {
        throw new Error("Primary location must belong to the same warehouse.");
      }
    }

    // 3. Update Warehouse
    const updateSql = `
      UPDATE warehouses
      SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        status = COALESCE($3, status),
        is_default = COALESCE($4, is_default),
        address_line_1 = $5,
        address_line_2 = $6,
        city = $7,
        county = $8,
        postcode = $9,
        country = $10,
        contact_person = $11,
        job_title = $12,
        telephone = $13,
        direct_line = $14,
        mobile = $15,
        email = $16,
        fax = $17,
        e_dispatch_email = $18,
        warehouse_storage_type = $19,
        parent_location_id = $20,
        primary_location_id = $21,
        start_date = $22,
        unit_of_measure = $23,
        cost_frequency = $24,
        currency_id = $25,
        cost = $26,
        comments = $27,
        storage_type_id = $28,
        updated_at = NOW()
      WHERE id = $29 AND company_id = $30
      RETURNING *
    `;

    const res = await client.query<Warehouse>(updateSql, [
      warehouseData.name || null,
      warehouseData.type || null,
      warehouseData.status ?? null,
      warehouseData.is_default ?? null,
      warehouseData.address_line_1 || null,
      warehouseData.address_line_2 || null,
      warehouseData.city || null,
      warehouseData.county || null,
      warehouseData.postcode || null,
      warehouseData.country || null,
      warehouseData.contact_person || null,
      warehouseData.job_title || null,
      warehouseData.telephone || null,
      warehouseData.direct_line || null,
      warehouseData.mobile || null,
      warehouseData.email || null,
      warehouseData.fax || null,
      Boolean(warehouseData.e_dispatch_email),
      warehouseData.warehouse_storage_type || null,
      warehouseData.parent_location_id || null,
      warehouseData.primary_location_id || null,
      warehouseData.start_date || null,
      warehouseData.unit_of_measure || null,
      warehouseData.cost_frequency || null,
      warehouseData.currency_id || null,
      warehouseData.cost ? Number(warehouseData.cost) : null,
      warehouseData.comments || null,
      warehouseData.storage_type_id || null,
      id,
      companyId,
    ]);

    await client.query("COMMIT");
    return res.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteWarehouse(
  id: string,
  companyId: string,
): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM warehouses WHERE id = $1 AND company_id = $2 RETURNING id`,
    [id, companyId],
  );
  return (res.rowCount ?? 0) !== 0;
}

// ---------------- Location Services ----------------

export async function getWarehouseLocations(
  warehouseId: string,
): Promise<WarehouseLocation[]> {
  const res = await pool.query<WarehouseLocation>(
    `
    SELECT * FROM warehouse_locations
    WHERE warehouse_id = $1
    ORDER BY parent_id NULLS FIRST, title ASC
    `,
    [warehouseId],
  );
  return res.rows;
}

export async function createWarehouseLocation(
  warehouseId: string,
  companyId: string,
  data: CreateLocationInput,
): Promise<WarehouseLocation> {
  const res = await pool.query<WarehouseLocation>(
    `
    INSERT INTO warehouse_locations (
      warehouse_id, company_id, parent_id, type, title, code, is_primary,
      address_line_1, address_line_2, city, county, postcode, country,
      latitude, longitude, capacity, capacity_uom_id,
      start_date, unit_of_measure, cost_frequency, currency, cost, comments, status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24
    )
    RETURNING *
    `,
    [
      warehouseId,
      companyId,
      data.parent_id || null,
      data.type || "ZONE",
      data.title,
      data.code || null,
      Boolean(data.is_primary),
      data.address_line_1 || null,
      data.address_line_2 || null,
      data.city || null,
      data.county || null,
      data.postcode || null,
      data.country || null,
      data.latitude || null,
      data.longitude || null,
      data.capacity || null,
      data.capacity_uom_id || null,
      data.start_date || null,
      data.unit_of_measure || null,
      data.cost_frequency || null,
      data.currency || null,
      data.cost ? Number(data.cost) : null,
      data.comments || null,
      data.status ?? 1,
    ],
  );
  return res.rows[0];
}

export async function updateWarehouseLocation(
  locId: string,
  warehouseId: string,
  data: UpdateLocationInput,
): Promise<WarehouseLocation> {
  const res = await pool.query<WarehouseLocation>(
    `
    UPDATE warehouse_locations
    SET
      title = COALESCE($1, title),
      type = COALESCE($2, type),
      code = $3,
      parent_id = $4,
      is_primary = COALESCE($5, is_primary),
      capacity = $6,
      start_date = $7,
      unit_of_measure = $8,
      cost_frequency = $9,
      currency = $10,
      cost = $11,
      comments = $12,
      status = COALESCE($13, status),
      updated_at = NOW()
    WHERE id = $14 AND warehouse_id = $15
    RETURNING *
    `,
    [
      data.title || null,
      data.type || null,
      data.code || null,
      data.parent_id || null,
      data.is_primary ?? null,
      data.capacity || null,
      data.start_date || null,
      data.unit_of_measure || null,
      data.cost_frequency || null,
      data.currency || null,
      data.cost ? Number(data.cost) : null,
      data.comments || null,
      data.status ?? null,
      locId,
      warehouseId,
    ],
  );
  return res.rows[0];
}

export async function deleteWarehouseLocation(
  locId: string,
  warehouseId: string,
): Promise<boolean> {
  await pool.query(
    `DELETE FROM warehouse_locations WHERE id = $1 AND warehouse_id = $2`,
    [locId, warehouseId],
  );
  return true;
}

// ---------------- Contact Services ----------------

export async function getWarehouseContacts(
  warehouseId: string,
): Promise<WarehouseContact[]> {
  const res = await pool.query<WarehouseContact>(
    `SELECT * FROM warehouse_contacts WHERE warehouse_id = $1 ORDER BY name ASC`,
    [warehouseId],
  );
  return res.rows;
}

export async function createWarehouseContact(
  warehouseId: string,
  companyId: string,
  data: CreateContactInput,
): Promise<WarehouseContact> {
  const res = await pool.query<WarehouseContact>(
    `
    INSERT INTO warehouse_contacts (
      warehouse_id, company_id, name, job_title, location_name, email,
      phone, telephone, direct_line, mobile, fax, address_line_1,
      address_line_2, city, county, postcode, country, type, status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19
    )
    RETURNING *
    `,
    [
      warehouseId,
      companyId,
      data.name,
      data.job_title || null,
      data.location_name || null,
      data.email || null,
      data.phone || null,
      data.telephone || null,
      data.direct_line || null,
      data.mobile || null,
      data.fax || null,
      data.address_line_1 || null,
      data.address_line_2 || null,
      data.city || null,
      data.county || null,
      data.postcode || null,
      data.country || null,
      data.type || "MANAGER",
      data.status ?? 1,
    ],
  );
  return res.rows[0];
}

export async function updateWarehouseContact(
  contactId: string,
  warehouseId: string,
  data: UpdateContactInput,
): Promise<WarehouseContact> {
  const res = await pool.query<WarehouseContact>(
    `
    UPDATE warehouse_contacts
    SET
      name = COALESCE($1, name),
      job_title = $2,
      location_name = $3,
      email = $4,
      phone = $5,
      telephone = $6,
      direct_line = $7,
      mobile = $8,
      fax = $9,
      address_line_1 = $10,
      address_line_2 = $11,
      city = $12,
      county = $13,
      postcode = $14,
      country = $15,
      type = COALESCE($16, type),
      status = COALESCE($17, status),
      updated_at = NOW()
    WHERE id = $18 AND warehouse_id = $19
    RETURNING *
    `,
    [
      data.name || null,
      data.job_title || null,
      data.location_name || null,
      data.email || null,
      data.phone || null,
      data.telephone || null,
      data.direct_line || null,
      data.mobile || null,
      data.fax || null,
      data.address_line_1 || null,
      data.address_line_2 || null,
      data.city || null,
      data.county || null,
      data.postcode || null,
      data.country || null,
      data.type || null,
      data.status ?? null,
      contactId,
      warehouseId,
    ],
  );
  return res.rows[0];
}

export async function deleteWarehouseContact(
  contactId: string,
  warehouseId: string,
): Promise<boolean> {
  await pool.query(
    `DELETE FROM warehouse_contacts WHERE id = $1 AND warehouse_id = $2`,
    [contactId, warehouseId],
  );
  return true;
}

/* import { pool } from "@/lib/db";
import { CreateWarehouseInput } from "@/types/warehouse";

export async function createWarehouse(data: CreateWarehouseInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const seqRes = await client.query(
      `SELECT get_next_sequence($1,$2) AS code`,
      [data.company_id, "warehouse"],
    );

    const code = seqRes.rows[0].code;

    const warehouseRes = await client.query(
      `
      INSERT INTO warehouses (
        company_id, code, name, type, status, currency_id, storage_type_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        data.company_id,
        code,
        data.name,
        data.type,
        data.status || 1,
        data.currency_id,
        data.storage_type_id,
      ],
    );

    const warehouse = warehouseRes.rows[0];

    const locRes = await client.query(
      `
      INSERT INTO warehouse_locations
      (warehouse_id, company_id, type, title, is_primary)
      VALUES ($1, $2, 'WAREHOUSE', $3, true)
      RETURNING *
      `,
      [warehouse.id, data.company_id, `${data.name} Main`],
    );

    const location = locRes.rows[0];

    await client.query(
      `
      UPDATE warehouses
      SET primary_location_id = $1
      WHERE id = $2
      `,
      [location.id, warehouse.id],
    );

    await client.query("COMMIT");

    return { warehouse, location };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
} */
