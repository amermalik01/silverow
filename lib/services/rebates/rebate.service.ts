// lib/services/rebate.service.ts

import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { rebateSchema } from "@/lib/validations/rebate.schema";
import type { RebateDraft, RebateType } from "@/types/rebate";

export class RebateError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type RebateInput = RebateDraft;

const headerFields = [
  "name",
  "rebate_type",
  "scope",
  "calculation_method",
  "price_type",
  "rebate_value",
  "rebate_base",
  "settlement_method",
  "currency_id",
  "start_date",
  "end_date",
  "priority",
  "is_stackable",
  "notes",
] as const;

const headerColumns = headerFields.join(", ");

const selectDetails = `SELECT ra.*, COALESCE((SELECT json_agg(json_build_object('id',rc.id,'category_id',rc.category_id)) FROM rebate_categories rc WHERE rc.rebate_id=ra.id),'[]'::json) AS categories, COALESCE((SELECT json_agg(json_build_object('id',ri.id,'item_id',ri.item_id,'uom_id',ri.uom_id)) FROM rebate_items ri WHERE ri.rebate_id=ra.id),'[]'::json) AS items, COALESCE((SELECT json_agg(json_build_object('id',rt.id,'min_quantity',rt.min_quantity,'max_quantity',rt.max_quantity,'rebate_value',rt.rebate_value) ORDER BY rt.min_quantity) FROM rebate_tiers rt WHERE rt.rebate_id=ra.id),'[]'::json) AS tiers FROM rebate_agreements ra`;

async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function verifyParty(
  client: PoolClient,
  companyId: string,
  partyId: string,
  type: RebateType,
) {
  const p = await client.query(
    "SELECT id, is_customer, is_supplier FROM parties WHERE id=$1 AND company_id=$2",
    [partyId, companyId],
  );
  if (p.rowCount !== 1)
    throw new RebateError("Party not found or not uniquely identifiable", 404);
  if (type === "SALES" ? !p.rows[0].is_customer : !p.rows[0].is_supplier)
    throw new RebateError(
      "Party does not have the required customer/supplier role",
      422,
    );
}

function parse(input: unknown): RebateDraft {
  const result = rebateSchema.safeParse(input);
  if (!result.success)
    throw new RebateError(
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
      422,
    );
  return result.data as RebateDraft;
}

async function getOne(
  client: PoolClient,
  companyId: string,
  id: string,
  lock = false,
): Promise<RebateDraft> {
  const result = await client.query(
    `${selectDetails} WHERE ra.company_id=$1 AND ra.id=$2 AND ra.deleted_at IS NULL ${lock ? "FOR UPDATE OF ra" : ""}`,
    [companyId, id],
  );
  if (!result.rows.length) throw new RebateError("Rebate not found", 404);
  return result.rows[0] as RebateDraft;
}

async function audit(
  client: PoolClient,
  companyId: string,
  id: string,
  action: string,
  oldData: unknown,
  newData: unknown,
  userId: string | null,
) {
  await client.query(
    "INSERT INTO rebate_history(company_id,rebate_id,action,old_data,new_data,changed_by) VALUES ($1,$2,$3,$4,$5,$6)",
    [
      companyId,
      id,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      userId,
    ],
  );
}

async function syncChildren(
  client: PoolClient,
  companyId: string,
  id: string,
  data: RebateDraft,
) {
  // Safe only for DRAFT agreements; activated agreements are immutable.
  await client.query(
    "DELETE FROM rebate_categories WHERE company_id=$1 AND rebate_id=$2",
    [companyId, id],
  );
  await client.query(
    "DELETE FROM rebate_items WHERE company_id=$1 AND rebate_id=$2",
    [companyId, id],
  );
  await client.query(
    "DELETE FROM rebate_tiers WHERE company_id=$1 AND rebate_id=$2",
    [companyId, id],
  );
  for (const c of data.categories)
    await client.query(
      "INSERT INTO rebate_categories(company_id,rebate_id,category_id) VALUES($1,$2,$3)",
      [companyId, id, c.category_id],
    );
  for (const i of data.items) {
    const owned = await client.query(
      "SELECT id FROM items WHERE id=$1 AND company_id=$2",
      [i.item_id, companyId],
    );
    if (!owned.rowCount)
      throw new RebateError("Selected item is not in this company", 422);
    await client.query(
      "INSERT INTO rebate_items(company_id,rebate_id,item_id,uom_id) VALUES($1,$2,$3,$4)",
      [companyId, id, i.item_id, i.uom_id ?? null],
    );
  }
  for (const t of data.tiers)
    await client.query(
      "INSERT INTO rebate_tiers(company_id,rebate_id,min_quantity,max_quantity,rebate_value) VALUES($1,$2,$3,$4,$5)",
      [companyId, id, t.min_quantity, t.max_quantity, t.rebate_value],
    );
}

function validateTiers(data: RebateDraft) {
  if (data.calculation_method === "FLAT" && data.tiers.length)
    throw new RebateError("Flat rebates cannot contain tiers", 422);
  const tiers = [...data.tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (let i = 0; i < tiers.length; i++) {
    if (data.price_type === "PERCENTAGE" && tiers[i].rebate_value > 100)
      throw new RebateError("Tier percentage exceeds 100", 422);
    if (
      i > 0 &&
      (tiers[i - 1].max_quantity === null ||
        tiers[i - 1].max_quantity! >= tiers[i].min_quantity)
    )
      throw new RebateError("Rebate tiers overlap", 422);
  }
  if (
    data.scope === "UNIVERSAL" &&
    (data.items.length || data.categories.length)
  )
    throw new RebateError(
      "Universal rebates cannot have scope selections",
      422,
    );
  if (data.scope === "CATEGORY" && data.items.length)
    throw new RebateError("Category rebates cannot have item selections", 422);
  if (data.scope === "ITEM" && data.categories.length)
    throw new RebateError("Item rebates cannot have category selections", 422);
}

async function checkActiveConflicts(
  client: PoolClient,
  companyId: string,
  rebate: RebateDraft,
) {
  // Conservative: require explicit priority/specificity policy for any overlapping active non-stackable agreements.
  const matches = await client.query(
    `SELECT id, rebate_no FROM rebate_agreements WHERE company_id=$1 AND party_id=$2 AND rebate_type=$3 AND status='ACTIVE' AND deleted_at IS NULL AND id<>$4 AND start_date<=$6::date AND end_date>=$5::date AND scope=$7 AND (NOT is_stackable OR NOT $8::boolean) LIMIT 1`,
    [
      companyId,
      rebate.party_id,
      rebate.rebate_type,
      rebate.id,
      rebate.start_date,
      rebate.end_date,
      rebate.scope,
      rebate.is_stackable,
    ],
  );
  if (matches.rowCount)
    throw new RebateError(
      `Conflicting active ${rebate.scope} rebate: ${matches.rows[0].rebate_no}`,
      409,
    );
}

export const RebateService = {
  list: async (companyId: string, partyId: string, type: RebateType) => {
    const client = await pool.connect();
    try {
      await verifyParty(client, companyId, partyId, type);
      const r = await client.query(
        `${selectDetails} WHERE ra.company_id=$1 AND ra.party_id=$2 AND ra.rebate_type=$3 AND ra.deleted_at IS NULL ORDER BY ra.created_at DESC`,
        [companyId, partyId, type],
      );
      return r.rows as RebateDraft[];
    } finally {
      client.release();
    }
  },
  get: async (companyId: string, id: string) => {
    const c = await pool.connect();
    try {
      return await getOne(c, companyId, id);
    } finally {
      c.release();
    }
  },
  create: async (
    companyId: string,
    partyId: string,
    raw: unknown,
    userId: string | null,
  ) =>
    withTransaction(async (c) => {
      const data = parse(raw);
      if (data.party_id !== partyId)
        throw new RebateError("Party mismatch", 422);
      validateTiers(data);
      await verifyParty(c, companyId, partyId, data.rebate_type);
      // Tenant-scoped advisory lock serializes sequence generation; use your get_next_sequence implementation.
      const seq = await c.query(
        "SELECT get_next_sequence($1::uuid,$2::text) AS code",
        [
          companyId,
          data.rebate_type === "SALES" ? "sales_rebate" : "purchase_rebate",
        ],
      );
      const vals = headerFields.map((k) => data[k] ?? null);
      const r = await c.query(
        `INSERT INTO rebate_agreements(company_id,party_id,rebate_no,${headerColumns},created_by,updated_by) VALUES($1,$2,$3,${headerFields.map((_, i) => `$${i + 4}`).join(",")},$${headerFields.length + 4},$${headerFields.length + 5}) RETURNING id`,
        [companyId, partyId, seq.rows[0].code, ...vals, userId, userId],
      );
      const id = r.rows[0].id as string;
      await syncChildren(c, companyId, id, data);
      const saved = await getOne(c, companyId, id);
      await audit(c, companyId, id, "CREATED", null, saved, userId);
      return saved;
    }),
  update: async (
    companyId: string,
    id: string,
    raw: unknown,
    userId: string | null,
  ) =>
    withTransaction(async (c) => {
      const old = await getOne(c, companyId, id, true);
      if (old.status !== "DRAFT")
        throw new RebateError("Only draft agreements may be edited", 409);
      const data = parse(raw);
      validateTiers(data);
      if (
        data.party_id !== old.party_id ||
        data.rebate_type !== old.rebate_type
      )
        throw new RebateError("Cannot change party or rebate side", 422);
      await verifyParty(c, companyId, data.party_id, data.rebate_type);
      const sets = headerFields.map((k, i) => `${k}=$${i + 3}`).join(",");
      await c.query(
        `UPDATE rebate_agreements SET ${sets},updated_by=$${headerFields.length + 3},updated_at=NOW() WHERE company_id=$1 AND id=$2`,
        [companyId, id, ...headerFields.map((k) => data[k] ?? null), userId],
      );
      await syncChildren(c, companyId, id, data);
      const saved = await getOne(c, companyId, id);
      await audit(c, companyId, id, "UPDATED", old, saved, userId);
      return saved;
    }),
  transition: async (
    companyId: string,
    id: string,
    action: "ACTIVATED" | "CANCELLED",
    userId: string | null,
  ) =>
    withTransaction(async (c) => {
      // Serialize activations per company/party and prevent concurrent conflicting activations.
      const old = await getOne(c, companyId, id, true);
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))", [
        companyId,
        old.party_id,
      ]);
      if (action === "ACTIVATED") {
        if (old.status !== "DRAFT")
          throw new RebateError("Only drafts can be activated", 409);
        validateTiers(old);
        await verifyParty(c, companyId, old.party_id, old.rebate_type);
        await checkActiveConflicts(c, companyId, old);
      } else if (!["DRAFT", "ACTIVE", "SUSPENDED"].includes(old.status ?? ""))
        throw new RebateError("Agreement cannot be cancelled", 409);
      const status = action === "ACTIVATED" ? "ACTIVE" : "CANCELLED";
      await c.query(
        "UPDATE rebate_agreements SET status=$3,updated_by=$4,updated_at=NOW() WHERE company_id=$1 AND id=$2",
        [companyId, id, status, userId],
      );
      const saved = await getOne(c, companyId, id);
      await audit(c, companyId, id, action, old, saved, userId);
      return saved;
    }),
  history: async (companyId: string, id: string) => {
    const c = await pool.connect();
    try {
      await getOne(c, companyId, id);
      const r = await c.query(
        "SELECT * FROM rebate_history WHERE company_id=$1 AND rebate_id=$2 ORDER BY changed_at DESC",
        [companyId, id],
      );
      return r.rows;
    } finally {
      c.release();
    }
  },
  transactions: async (companyId: string, id: string) => {
    const c = await pool.connect();
    try {
      await getOne(c, companyId, id);
      const r = await c.query(
        "SELECT * FROM rebate_transactions WHERE company_id=$1 AND rebate_id=$2 ORDER BY posting_date DESC,created_at DESC",
        [companyId, id],
      );
      return r.rows;
    } finally {
      c.release();
    }
  },
};
