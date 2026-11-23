// lib/services/sales/crm/prospect/prospect.service.ts

import { pool } from "@/lib/db";
import type { PoolClient, QueryResultRow } from "pg";
import type { FetchParams, FetchResponse } from "@/types/table";

import {
  ProspectActivitySchema,
  ProspectPayloadSchema,
  type ProspectActivityInput,
  type ProspectPayload,
  type ProspectStatus,
} from "@/lib/validations/prospect.schema";

import type {
  Prospect,
  ProspectActivity,
  ProspectAddress,
  ProspectContact,
  ProspectDetails,
  ProspectListRecord,
  ProspectNote,
  ProspectStatusHistory,
  ProspectStatusChangeOptions,
  ProspectConversionPayload,
} from "@/types/prospect";

/* ============================================================
   DATABASE TYPES
============================================================ */

interface ProspectRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;
  status: ProspectStatus;
  source: string | null;
  priority: "Low" | "Medium" | "High";
  assigned_to: string | null;
  assigned_to_name: string | null;
  estimated_deal_value: string | number;
  currency_id: string | null;
  currency_code: string | null;

  vat_business_group_id: string | null;

  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  converted_party_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
  lost_reason: string | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProspectContactRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProspectAddressRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_id: string;
  label: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_billing: boolean;
  is_shipping: boolean;
  created_at: string;
  updated_at: string;
}

interface ProspectActivityRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  activity_at: string;
  outcome: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface ProspectNoteRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_id: string;
  author_id: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
}

interface ProspectStatusHistoryRecord extends QueryResultRow {
  id: string;
  company_id: string;
  prospect_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  remarks: string | null;
}

interface SequenceRecord extends QueryResultRow {
  code: string;
}

interface PartyRecord extends QueryResultRow {
  id: string;
  name: string;
  customer_code: string;
  status: string;
  vat_business_group_id: string | null;
}

interface CountRecord extends QueryResultRow {
  total: number;
}

type ProspectHeaderInput = ProspectPayload["prospect"];

type NotePayload = {
  title?: string | null;
  content: string;
};

type ConversionInput = ProspectConversionPayload;

/* ============================================================
   HELPERS
============================================================ */

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizePage(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getNotePayload(rawPayload: unknown): NotePayload {
  if (
    !rawPayload ||
    typeof rawPayload !== "object" ||
    Array.isArray(rawPayload)
  ) {
    throw new Error("Invalid note payload.");
  }

  const payload = rawPayload as Record<string, unknown>;

  if (typeof payload.content !== "string" || !payload.content.trim()) {
    throw new Error("Note content is required.");
  }

  return {
    title:
      typeof payload.title === "string"
        ? payload.title.trim()
        : "General Note Entry",
    content: payload.content.trim(),
  };
}

function getConversionPayload(rawPayload: unknown): ConversionInput {
  if (
    !rawPayload ||
    typeof rawPayload !== "object" ||
    Array.isArray(rawPayload)
  ) {
    return { customerStatus: "active" };
  }

  const payload = rawPayload as Record<string, unknown>;

  const customerName =
    typeof payload.customerName === "string"
      ? payload.customerName.trim()
      : undefined;

  const customerStatus =
    payload.customerStatus === "inactive" ? "inactive" : "active";

  return {
    customerName: customerName || undefined,
    customerStatus,
  };
}

function getRecord<T>(rows: T[], message: string): T {
  const record = rows[0];

  if (!record) {
    throw new Error(message);
  }

  return record;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ============================================================
   SERVICE
============================================================ */

export class ProspectService {
  /* ==========================================================
     GET BY ID
  ========================================================== */

  static async getById(
    companyId: string,
    id: string,
  ): Promise<ProspectDetails | null> {
    const prospectResult = await pool.query<ProspectRecord>(
      `
        SELECT
            p.*,
            c.code AS currency_code
        FROM public.prospects p
        LEFT JOIN public.currencies c ON c.id = p.currency_id
        WHERE p.id = $1
            AND p.company_id = $2
        LIMIT 1
        `,
      [id, companyId],
    );

    const prospectRecord = prospectResult.rows[0];

    if (!prospectRecord) return null;

    const [
      contactsResult,
      addressesResult,
      activitiesResult,
      notesResult,
      historyResult,
    ] = await Promise.all([
      pool.query<ProspectContactRecord>(
        `
        SELECT *
        FROM prospect_contacts
        WHERE company_id = $1
          AND prospect_id = $2
        ORDER BY is_primary DESC, created_at ASC
        `,
        [companyId, id],
      ),

      pool.query<ProspectAddressRecord>(
        `
        SELECT *
        FROM prospect_addresses
        WHERE company_id = $1
          AND prospect_id = $2
        ORDER BY is_primary DESC, created_at ASC
        `,
        [companyId, id],
      ),

      pool.query<ProspectActivityRecord>(
        `
        SELECT
          a.*,
          a.created_by_name AS created_by_name
        FROM prospect_activities a
        WHERE a.company_id = $1
          AND a.prospect_id = $2
        ORDER BY a.activity_at DESC, a.created_at DESC
        `,
        [companyId, id],
      ),

      pool.query<ProspectNoteRecord>(
        `
        SELECT *
        FROM prospect_notes
        WHERE company_id = $1
          AND prospect_id = $2
        ORDER BY created_at DESC
        `,
        [companyId, id],
      ),

      pool.query<ProspectStatusHistoryRecord>(
        `
        SELECT *
        FROM prospect_status_history
        WHERE company_id = $1
          AND prospect_id = $2
        ORDER BY changed_at DESC
        `,
        [companyId, id],
      ),
    ]);

    const prospect: Prospect = {
      ...prospectRecord,
      source: prospectRecord.source as Prospect["source"],
      currency_code: prospectRecord.currency_code ?? null,
    };

    return {
      prospect,
      contacts: contactsResult.rows,
      addresses: addressesResult.rows.map((address) => ({
        ...address,
        label: address.label ?? "Head Office",
      })),
      activities: activitiesResult.rows as ProspectActivity[],
      notes: notesResult.rows,
      statusHistory: historyResult.rows as ProspectStatusHistory[],
    };
  }

  /* ==========================================================
     CREATE
  ========================================================== */

  static async create(
    companyId: string,
    userId: string,
    rawPayload: unknown,
  ): Promise<ProspectRecord> {
    const payload = ProspectPayloadSchema.parse(rawPayload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await this.validateReferences(client, companyId, payload.prospect);

      const sequenceResult = await client.query<SequenceRecord>(
        `
        SELECT get_next_sequence($1, $2) AS code
        `,
        [companyId, "prospect"],
      );

      const prospectNo = sequenceResult.rows[0]?.code;

      if (!prospectNo) {
        throw new Error("Unable to generate prospect number.");
      }

      const prospect = await this.insertProspect(
        client,
        companyId,
        userId,
        prospectNo,
        payload.prospect,
      );

      await this.syncContacts(client, companyId, prospect.id, payload.contacts);

      await this.syncAddresses(
        client,
        companyId,
        prospect.id,
        payload.addresses,
      );

      //   await this.insertNewNotes(
      //     client,
      //     companyId,
      //     prospect.id,
      //     userId,
      //     payload.notes,
      //   );

      await this.insertStatusHistory(
        client,
        companyId,
        prospect.id,
        null,
        prospect.status,
        userId,
        "Prospect created.",
      );

      await client.query("COMMIT");

      return prospect;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     UPDATE
  ========================================================== */

  static async update(
    companyId: string,
    userId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<ProspectRecord> {
    const payload = ProspectPayloadSchema.parse(rawPayload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<ProspectRecord>(
        `
        SELECT *
        FROM prospects
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [id, companyId],
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw new Error("Prospect not found.");
      }

      if (existing.converted_party_id || existing.status === "Converted") {
        throw new Error(
          "A converted prospect cannot be edited. Open the customer record instead.",
        );
      }

      await this.validateReferences(client, companyId, payload.prospect);

      const prospect = await this.updateProspect(
        client,
        companyId,
        userId,
        id,
        payload.prospect,
      );

      await this.syncContacts(client, companyId, id, payload.contacts);

      await this.syncAddresses(client, companyId, id, payload.addresses);

      //   await this.insertNewNotes(client, companyId, id, userId, payload.notes);

      if (existing.status !== prospect.status) {
        await this.insertStatusHistory(
          client,
          companyId,
          id,
          existing.status,
          prospect.status,
          userId,
          null,
        );
      }

      await client.query("COMMIT");

      return prospect;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     LIST ACTIVITIES
  ========================================================== */

  static async listActivities(
    companyId: string,
    prospectId: string,
  ): Promise<ProspectActivityRecord[]> {
    const result = await pool.query<ProspectActivityRecord>(
      `
      SELECT a.*
      FROM prospect_activities a
      WHERE a.company_id = $1
        AND a.prospect_id = $2
      ORDER BY a.activity_at DESC, a.created_at DESC
      `,
      [companyId, prospectId],
    );

    return result.rows;
  }

  /* ==========================================================
     CREATE ACTIVITY
  ========================================================== */

  static async createActivity(
    companyId: string,
    userId: string,
    userName: string,
    prospectId: string,
    rawPayload: unknown,
  ): Promise<ProspectActivityRecord> {
    const activity: ProspectActivityInput =
      ProspectActivitySchema.parse(rawPayload);

    const nextFollowUpProvided =
      isPlainObject(rawPayload) &&
      Object.prototype.hasOwnProperty.call(rawPayload, "next_follow_up_at");

    const reminderProvided =
      isPlainObject(rawPayload) &&
      Object.prototype.hasOwnProperty.call(rawPayload, "reminder_enabled");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospectResult = await client.query<ProspectRecord>(
        `
        SELECT *
        FROM prospects
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [prospectId, companyId],
      );

      const prospect = prospectResult.rows[0];

      if (!prospect) {
        throw new Error("Prospect not found.");
      }

      if (prospect.converted_party_id || prospect.status === "Converted") {
        throw new Error(
          "This prospect has been converted. Record future activity against the customer.",
        );
      }

      if (activity.contact_id) {
        const contactResult = await client.query<{ id: string }>(
          `
          SELECT id
          FROM prospect_contacts
          WHERE id = $1
            AND company_id = $2
            AND prospect_id = $3
          LIMIT 1
          `,
          [activity.contact_id, companyId, prospectId],
        );

        if (!contactResult.rows.length) {
          throw new Error("Selected prospect contact was not found.");
        }
      }

      const result = await client.query<ProspectActivityRecord>(
        `
        INSERT INTO prospect_activities (
          company_id,
          prospect_id,
          activity_type,
          subject,
          description,
          activity_at,
          outcome,
          contact_id,
          created_by,
          created_by_name
        )
        VALUES (
          $1, $2, $3, $4, $5,
          COALESCE($6::timestamptz, NOW()),
          $7, $8, $9, $10
        )
        RETURNING *
        `,
        [
          companyId,
          prospectId,
          activity.activity_type,
          activity.subject,
          normalizeText(activity.description),
          activity.activity_at ?? null,
          normalizeText(activity.outcome),
          activity.contact_id ?? null,
          userId,
          normalizeText(userName) ?? "Current User",
        ],
      );

      const activityRecord = getRecord(
        result.rows,
        "Failed to create prospect activity.",
      );

      await client.query(
        `
        UPDATE prospects
        SET
          last_contacted_at = CASE
            WHEN $1 IN ('Email', 'Call', 'Meeting')
              THEN $2::timestamptz
            ELSE last_contacted_at
          END,

          next_follow_up_at = CASE
            WHEN $3::boolean THEN $4::timestamptz
            ELSE next_follow_up_at
          END,

          reminder_enabled = CASE
            WHEN $5::boolean THEN $6::boolean
            ELSE reminder_enabled
          END,

          updated_by = $7,
          updated_at = NOW()

        WHERE id = $8
          AND company_id = $9
        `,
        [
          activity.activity_type,
          activityRecord.activity_at,
          nextFollowUpProvided,
          activity.next_follow_up_at ?? null,
          reminderProvided,
          activity.reminder_enabled,
          userId,
          prospectId,
          companyId,
        ],
      );

      await client.query("COMMIT");

      return activityRecord;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     CREATE NOTE
  ========================================================== */

  static async createNote(
    companyId: string,
    userId: string,
    author: string,
    prospectId: string,
    rawPayload: unknown,
  ): Promise<ProspectNoteRecord> {
    const payload = getNotePayload(rawPayload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospectResult = await client.query<ProspectRecord>(
        `
        SELECT id, status, converted_party_id
        FROM prospects
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [prospectId, companyId],
      );

      const prospect = prospectResult.rows[0];

      if (!prospect) {
        throw new Error("Prospect not found.");
      }

      if (prospect.converted_party_id || prospect.status === "Converted") {
        throw new Error(
          "This prospect has been converted. Add notes to the customer record.",
        );
      }

      const result = await client.query<ProspectNoteRecord>(
        `
        INSERT INTO prospect_notes (
          company_id,
          prospect_id,
          author_id,
          author,
          title,
          content
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          companyId,
          prospectId,
          userId,
          normalizeText(author) ?? "Current User",
          normalizeText(payload.title) ?? "General Note Entry",
          payload.content,
        ],
      );

      const note = getRecord(result.rows, "Failed to create prospect note.");

      await client.query("COMMIT");

      return note;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     CONVERT TO CUSTOMER
  ========================================================== */

  /* ============================================================
     CONVERT TO CUSTOMER
  ============================================================ */

  static async convertToCustomer(
    companyId: string,
    userId: string,
    prospectId: string,
    rawPayload?: unknown,
  ): Promise<{
    prospect: ProspectRecord;
    customer: PartyRecord;
  }> {
    const payload = getConversionPayload(rawPayload);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /*
       * 1. Lock and retrieve the prospect.
       */
      const prospectResult = await client.query<ProspectRecord>(
        `
        SELECT *
        FROM public.prospects
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [prospectId, companyId],
      );

      const prospect = prospectResult.rows[0];

      if (!prospect) {
        throw new Error("Prospect not found.");
      }

      if (prospect.converted_party_id || prospect.status === "Converted") {
        throw new Error("Prospect has already been converted.");
      }

      /*
       * 2. Validate VAT business posting group.
       *
       * A group may have been deactivated since the prospect
       * was originally created or updated.
       */
      if (prospect.vat_business_group_id) {
        const vatBusinessGroupResult = await client.query<{
          id: string;
        }>(
          `
          SELECT id
          FROM public.vat_business_posting_groups
          WHERE id = $1
            AND company_id = $2
            AND is_active = TRUE
          LIMIT 1
          `,
          [prospect.vat_business_group_id, companyId],
        );

        if (!vatBusinessGroupResult.rows.length) {
          throw new Error(
            "The prospect's VAT business posting group is no longer active or available. Please update the prospect before converting it.",
          );
        }
      }

      /*
       * 3. Retrieve contacts and addresses.
       */
      const [contactsResult, addressesResult] = await Promise.all([
        client.query<ProspectContactRecord>(
          `
          SELECT *
          FROM public.prospect_contacts
          WHERE company_id = $1
            AND prospect_id = $2
          ORDER BY is_primary DESC, created_at ASC
          `,
          [companyId, prospectId],
        ),

        client.query<ProspectAddressRecord>(
          `
          SELECT *
          FROM public.prospect_addresses
          WHERE company_id = $1
            AND prospect_id = $2
          ORDER BY is_primary DESC, created_at ASC
          `,
          [companyId, prospectId],
        ),
      ]);

      const contacts = contactsResult.rows;
      const addresses = addressesResult.rows;

      const primaryContact =
        contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null;

      const customerName =
        normalizeText(payload.customerName) ??
        normalizeText(prospect.company_name);

      if (!customerName) {
        throw new Error("A customer name is required.");
      }

      /*
       * 4. Generate customer code.
       */
      const sequenceResult = await client.query<SequenceRecord>(
        `
        SELECT get_next_sequence($1, $2) AS code
        `,
        [companyId, "customer"],
      );

      const customerCode = sequenceResult.rows[0]?.code;

      if (!customerCode) {
        throw new Error("Unable to generate customer number.");
      }

      /*
       * 5. Create customer party.
       *
       * VAT business group is copied from the prospect.
       *
       * sales_posting_group_id remains independent because
       * it represents a different accounting configuration.
       */
      const partyResult = await client.query<PartyRecord>(
        `
        INSERT INTO public.parties (
          company_id,
          name,
          type,
          status,

          is_crm_lead,
          is_srm_vendor,
          is_customer,
          is_supplier,

          customer_code,

          email,
          phone,
          mobile,
          website,

          currency_id,
          vat_business_group_id,

          assign_person_id,
          assign_person,

          created_at,
          updated_at
        )
        VALUES (
          $1, $2, 'customer', $3,

          FALSE,
          FALSE,
          TRUE,
          FALSE,

          $4,

          $5,
          $6,
          $7,
          $8,

          $9,
          $10,

          $11,
          $12,

          NOW(),
          NOW()
        )
        RETURNING
          id,
          name,
          customer_code,
          status,
          vat_business_group_id
        `,
        [
          companyId,
          customerName,
          payload.customerStatus ?? "active",

          customerCode,

          primaryContact?.email ?? null,
          primaryContact?.phone ?? null,
          primaryContact?.mobile ?? null,
          prospect.website,

          prospect.currency_id,
          prospect.vat_business_group_id,

          prospect.assigned_to,
          prospect.assigned_to_name,
        ],
      );

      const customer = getRecord(
        partyResult.rows,
        "Failed to create customer record.",
      );

      /*
       * 6. Copy all contacts to the new customer.
       */
      for (const contact of contacts) {
        await client.query(
          `
          INSERT INTO public.party_contacts (
            party_id,
            name,
            job_title,
            email,
            phone,
            mobile,
            is_primary,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            customer.id,
            contact.name,
            contact.job_title,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary,
            contact.notes,
          ],
        );
      }

      /*
       * 7. Copy all addresses.
       *
       * Preserve billing and shipping flags.
       */
      for (const address of addresses) {
        await client.query(
          `
          INSERT INTO public.party_addresses (
            party_id,
            label,
            address_1,
            address_2,
            city,
            state,
            country,
            postcode,
            phone,
            email,
            is_primary,
            is_billing,
            is_shipping
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13
          )
          `,
          [
            customer.id,
            address.label,
            address.address_1,
            address.address_2,
            address.city,
            address.state,
            address.country,
            address.postcode,
            address.phone,
            address.email,
            address.is_primary,
            address.is_billing,
            address.is_shipping,
          ],
        );
      }

      /*
       * 8. Update prospect conversion details.
       */
      const convertedResult = await client.query<ProspectRecord>(
        `
        UPDATE public.prospects
        SET
          status = 'Converted',
          converted_party_id = $1,
          converted_at = NOW(),
          converted_by = $2,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $3
          AND company_id = $4
          AND converted_party_id IS NULL
          AND status <> 'Converted'
        RETURNING *
        `,
        [customer.id, userId, prospectId, companyId],
      );

      const convertedProspect = getRecord(
        convertedResult.rows,
        "The prospect could not be converted. It may have been converted by another user.",
      );

      /*
       * 9. Insert status history.
       */
      await this.insertStatusHistory(
        client,
        companyId,
        prospectId,
        prospect.status,
        "Converted",
        userId,
        `Converted to customer ${customerCode}.`,
      );

      /*
       * 10. Commit.
       */
      await client.query("COMMIT");

      return {
        prospect: convertedProspect,
        customer,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     DELETE
  ========================================================== */

  static async delete(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
        DELETE FROM prospects
        WHERE id = $1
          AND company_id = $2
          AND converted_party_id IS NULL
          AND status <> 'Converted'
        RETURNING id
        `,
        [id, companyId],
      );

      if (!result.rowCount) {
        const existingResult = await client.query<{
          id: string;
          status: string;
        }>(
          `
          SELECT id, status
          FROM prospects
          WHERE id = $1
            AND company_id = $2
          LIMIT 1
          `,
          [id, companyId],
        );

        const existing = existingResult.rows[0];

        if (!existing) {
          throw new Error("Prospect not found.");
        }

        throw new Error("A converted prospect cannot be deleted.");
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
   VALIDATE REFERENCES
========================================================== */

  private static async validateReferences(
    client: PoolClient,
    companyId: string,
    prospect: ProspectHeaderInput,
  ): Promise<void> {
    if (prospect.assigned_to) {
      const employeeResult = await client.query<{ id: string }>(
        `
      SELECT id
      FROM employees
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
        [prospect.assigned_to, companyId],
      );

      if (!employeeResult.rows.length) {
        throw new Error("Selected assigned employee was not found.");
      }
    }

    if (prospect.currency_id) {
      const currencyResult = await client.query<{ id: string }>(
        `
      SELECT c.id
      FROM public.currencies c
      INNER JOIN public.company_currencies cc
        ON cc.currency_id = c.id
       AND cc.company_id = $2
       AND cc.status = 1
      WHERE c.id = $1
        AND c.status = 1
      LIMIT 1
      `,
        [prospect.currency_id, companyId],
      );

      if (!currencyResult.rows.length) {
        throw new Error("Selected currency was not found.");
      }
    }

    /*
     * VAT business posting group validation.
     *
     * Only active groups belonging to the current company
     * can be assigned to a prospect.
     */
    if (prospect.vat_business_group_id) {
      const vatBusinessGroupResult = await client.query<{
        id: string;
      }>(
        `
      SELECT id
      FROM public.vat_business_posting_groups
      WHERE id = $1
        AND company_id = $2
        AND is_active = TRUE
      LIMIT 1
      `,
        [prospect.vat_business_group_id, companyId],
      );

      if (!vatBusinessGroupResult.rows.length) {
        throw new Error(
          "Selected VAT business posting group was not found, is inactive, or does not belong to this company.",
        );
      }
    }
  }

  /* ==========================================================
   INSERT PROSPECT
========================================================== */

  private static async insertProspect(
    client: PoolClient,
    companyId: string,
    userId: string,
    prospectNo: string,
    prospect: ProspectHeaderInput,
  ): Promise<ProspectRecord> {
    const result = await client.query<ProspectRecord>(
      `
    INSERT INTO public.prospects (
      company_id,
      prospect_no,
      company_name,
      website,
      status,
      source,
      priority,
      assigned_to,
      assigned_to_name,
      estimated_deal_value,
      currency_id,
      vat_business_group_id,
      last_contacted_at,
      next_follow_up_at,
      reminder_enabled,
      description,
      lost_reason,
      created_by,
      updated_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19
    )
    RETURNING *
    `,
      [
        companyId,
        prospectNo,
        prospect.company_name,
        prospect.website,
        prospect.status,
        prospect.source,
        prospect.priority,
        prospect.assigned_to,
        prospect.assigned_to_name,
        prospect.estimated_deal_value,
        prospect.currency_id,
        prospect.vat_business_group_id,
        prospect.last_contacted_at,
        prospect.next_follow_up_at,
        prospect.reminder_enabled,
        prospect.description,
        prospect.status === "Lost" ? prospect.lost_reason : null,
        userId,
        userId,
      ],
    );

    return getRecord(result.rows, "Failed to create prospect.");
  }

  /* ==========================================================
   UPDATE PROSPECT
========================================================== */

  private static async updateProspect(
    client: PoolClient,
    companyId: string,
    userId: string,
    id: string,
    prospect: ProspectHeaderInput,
  ): Promise<ProspectRecord> {
    const result = await client.query<ProspectRecord>(
      `
    UPDATE public.prospects
    SET
      company_name = $1,
      website = $2,
      status = $3,
      source = $4,
      priority = $5,
      assigned_to = $6,
      assigned_to_name = $7,
      estimated_deal_value = $8,
      currency_id = $9,
      vat_business_group_id = $10,
      last_contacted_at = $11,
      next_follow_up_at = $12,
      reminder_enabled = $13,
      description = $14,
      lost_reason = $15,
      updated_by = $16,
      updated_at = NOW()
    WHERE id = $17
      AND company_id = $18
    RETURNING *
    `,
      [
        prospect.company_name,
        prospect.website,
        prospect.status,
        prospect.source,
        prospect.priority,
        prospect.assigned_to,
        prospect.assigned_to_name,
        prospect.estimated_deal_value,
        prospect.currency_id,
        prospect.vat_business_group_id,
        prospect.last_contacted_at,
        prospect.next_follow_up_at,
        prospect.reminder_enabled,
        prospect.description,
        prospect.status === "Lost" ? prospect.lost_reason : null,
        userId,
        id,
        companyId,
      ],
    );

    return getRecord(result.rows, "Prospect not found.");
  }

  /* ==========================================================
     SYNC CONTACTS
     Payload is treated as the complete current contact list.
  ========================================================== */

  private static async syncContacts(
    client: PoolClient,
    companyId: string,
    prospectId: string,
    contacts: ProspectPayload["contacts"],
  ): Promise<void> {
    const existingResult = await client.query<{ id: string }>(
      `
      SELECT id
      FROM prospect_contacts
      WHERE company_id = $1
        AND prospect_id = $2
      FOR UPDATE
      `,
      [companyId, prospectId],
    );

    const existingIds = new Set(existingResult.rows.map((row) => row.id));

    /*
     * First clear primary flags to avoid partial unique-index
     * conflicts when the primary contact is changed.
     */
    await client.query(
      `
      UPDATE prospect_contacts
      SET is_primary = false,
          updated_at = NOW()
      WHERE company_id = $1
        AND prospect_id = $2
      `,
      [companyId, prospectId],
    );

    const retainedIds = new Set<string>();

    for (const contact of contacts) {
      if (contact.id) {
        if (!existingIds.has(contact.id)) {
          throw new Error(
            "One of the selected contacts does not belong to this prospect.",
          );
        }

        const result = await client.query<{ id: string }>(
          `
          UPDATE prospect_contacts
          SET
            name = $1,
            job_title = $2,
            email = $3,
            phone = $4,
            mobile = $5,
            is_primary = $6,
            notes = $7,
            updated_at = NOW()
          WHERE id = $8
            AND company_id = $9
            AND prospect_id = $10
          RETURNING id
          `,
          [
            contact.name,
            contact.job_title,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary,
            contact.notes,
            contact.id,
            companyId,
            prospectId,
          ],
        );

        retainedIds.add(
          getRecord(result.rows, "Unable to update prospect contact.").id,
        );
      } else {
        const result = await client.query<{ id: string }>(
          `
          INSERT INTO prospect_contacts (
            company_id,
            prospect_id,
            name,
            job_title,
            email,
            phone,
            mobile,
            is_primary,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
          `,
          [
            companyId,
            prospectId,
            contact.name,
            contact.job_title,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary,
            contact.notes,
          ],
        );

        retainedIds.add(
          getRecord(result.rows, "Unable to create prospect contact.").id,
        );
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !retainedIds.has(id));

    if (idsToDelete.length) {
      await client.query(
        `
        DELETE FROM prospect_contacts
        WHERE company_id = $1
          AND prospect_id = $2
          AND id = ANY($3::uuid[])
        `,
        [companyId, prospectId, idsToDelete],
      );
    }
  }

  /* ==========================================================
     SYNC ADDRESSES
     Payload is treated as the complete current address list.
  ========================================================== */

  private static async syncAddresses(
    client: PoolClient,
    companyId: string,
    prospectId: string,
    addresses: ProspectPayload["addresses"],
  ): Promise<void> {
    const existingResult = await client.query<{ id: string }>(
      `
      SELECT id
      FROM prospect_addresses
      WHERE company_id = $1
        AND prospect_id = $2
      FOR UPDATE
      `,
      [companyId, prospectId],
    );

    const existingIds = new Set(existingResult.rows.map((row) => row.id));

    /*
     * Clear primary flags before assigning the new primary.
     */
    await client.query(
      `
      UPDATE prospect_addresses
      SET is_primary = false,
          updated_at = NOW()
      WHERE company_id = $1
        AND prospect_id = $2
      `,
      [companyId, prospectId],
    );

    const retainedIds = new Set<string>();

    for (const address of addresses) {
      if (address.id) {
        if (!existingIds.has(address.id)) {
          throw new Error(
            "One of the selected addresses does not belong to this prospect.",
          );
        }

        const result = await client.query<{ id: string }>(
          `
          UPDATE prospect_addresses
          SET
            label = $1,
            address_1 = $2,
            address_2 = $3,
            city = $4,
            state = $5,
            country = $6,
            postcode = $7,
            phone = $8,
            email = $9,
            is_primary = $10,
            is_billing = $11,
            is_shipping = $12,
            updated_at = NOW()
          WHERE id = $13
            AND company_id = $14
            AND prospect_id = $15
          RETURNING id
          `,
          [
            address.label,
            address.address_1,
            address.address_2,
            address.city,
            address.state,
            address.country,
            address.postcode,
            address.phone,
            address.email,
            address.is_primary,
            address.is_billing,
            address.is_shipping,
            address.id,
            companyId,
            prospectId,
          ],
        );

        retainedIds.add(
          getRecord(result.rows, "Unable to update prospect address.").id,
        );
      } else {
        const result = await client.query<{ id: string }>(
          `
          INSERT INTO prospect_addresses (
            company_id,
            prospect_id,
            label,
            address_1,
            address_2,
            city,
            state,
            country,
            postcode,
            phone,
            email,
            is_primary,
            is_billing,
            is_shipping
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14
          )
          RETURNING id
          `,
          [
            companyId,
            prospectId,
            address.label,
            address.address_1,
            address.address_2,
            address.city,
            address.state,
            address.country,
            address.postcode,
            address.phone,
            address.email,
            address.is_primary,
            address.is_billing,
            address.is_shipping,
          ],
        );

        retainedIds.add(
          getRecord(result.rows, "Unable to create prospect address.").id,
        );
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !retainedIds.has(id));

    if (idsToDelete.length) {
      await client.query(
        `
        DELETE FROM prospect_addresses
        WHERE company_id = $1
          AND prospect_id = $2
          AND id = ANY($3::uuid[])
        `,
        [companyId, prospectId, idsToDelete],
      );
    }
  }

  /* ==========================================================
     INSERT NEW NOTES
  ========================================================== */

  /* private static async insertNewNotes(
    client: PoolClient,
    companyId: string,
    prospectId: string,
    userId: string,
    notes: ProspectPayload["notes"],
  ): Promise<void> {
    for (const note of notes) {
      // Existing notes are not modified or duplicated here.
      if (note.id) continue;

      await client.query(
        `
        INSERT INTO prospect_notes (
          company_id,
          prospect_id,
          author_id,
          author,
          title,
          content
        )
        VALUES (
          $1,
          $2,
          $3,
          COALESCE(
            (
              SELECT u.name
              FROM users u
              WHERE u.id = $3
                AND u.company_id = $1
              LIMIT 1
            ),
            'Current User'
          ),
          $4,
          $5
        )
        `,
        [
          companyId,
          prospectId,
          userId,
          normalizeText(note.title) ?? "General Note Entry",
          note.content.trim(),
        ],
      );
    }
  } */

  /* ==========================================================
   LIST NOTES
========================================================== */

  static async listNotes(
    companyId: string,
    prospectId: string,
  ): Promise<ProspectNoteRecord[]> {
    const result = await pool.query<ProspectNoteRecord>(
      `
    SELECT *
    FROM prospect_notes
    WHERE company_id = $1
      AND prospect_id = $2
    ORDER BY created_at DESC
    `,
      [companyId, prospectId],
    );

    return result.rows;
  }

  /* ==========================================================
    UPDATE NOTE
    ========================================================== */

  static async updateNote(
    companyId: string,
    prospectId: string,
    noteId: string,
    rawPayload: unknown,
  ): Promise<ProspectNoteRecord> {
    const payload = getNotePayload(rawPayload);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospectResult = await client.query<{
        id: string;
        status: ProspectStatus;
        converted_party_id: string | null;
      }>(
        `
        SELECT id, status, converted_party_id
        FROM prospects
        WHERE id = $1
            AND company_id = $2
        FOR UPDATE
        `,
        [prospectId, companyId],
      );

      const prospect = prospectResult.rows[0];

      if (!prospect) {
        throw new Error("Prospect not found.");
      }

      if (prospect.converted_party_id || prospect.status === "Converted") {
        throw new Error(
          "This prospect has been converted. Update notes on the customer record.",
        );
      }

      const result = await client.query<ProspectNoteRecord>(
        `
        UPDATE prospect_notes
        SET
            title = $1,
            content = $2
        WHERE id = $3
            AND company_id = $4
            AND prospect_id = $5
        RETURNING *
      `,
        [
          normalizeText(payload.title) ?? "General Note Entry",
          payload.content,
          noteId,
          companyId,
          prospectId,
        ],
      );

      const note = result.rows[0];

      if (!note) {
        throw new Error("Prospect note not found.");
      }

      await client.query("COMMIT");

      return note;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
   DELETE NOTE
========================================================== */

  static async deleteNote(
    companyId: string,
    prospectId: string,
    noteId: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const prospectResult = await client.query<{
        id: string;
        status: ProspectStatus;
        converted_party_id: string | null;
      }>(
        `
      SELECT id, status, converted_party_id
      FROM prospects
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
      `,
        [prospectId, companyId],
      );

      const prospect = prospectResult.rows[0];

      if (!prospect) {
        throw new Error("Prospect not found.");
      }

      if (prospect.converted_party_id || prospect.status === "Converted") {
        throw new Error(
          "This prospect has been converted. Manage notes on the customer record.",
        );
      }

      const result = await client.query(
        `
      DELETE FROM prospect_notes
      WHERE id = $1
        AND company_id = $2
        AND prospect_id = $3
      RETURNING id
      `,
        [noteId, companyId, prospectId],
      );

      if (result.rowCount === 0) {
        throw new Error("Prospect note not found.");
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ==========================================================
     LIST
  ========================================================== */

  static async list(companyId: string): Promise<ProspectRecord[]> {
    const result = await pool.query<ProspectRecord>(
      `
      SELECT p.*
      FROM prospects p
      WHERE p.company_id = $1
        AND p.converted_party_id IS NULL
        AND p.status <> 'Converted'
      ORDER BY p.created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  /* ==========================================================
     PAGINATED LIST
  ========================================================== */

  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<ProspectListRecord>> {
    const page = normalizePage(params.page, 1);

    const pageSize = Math.min(
      100,
      Math.max(1, normalizePage(params.pageSize, 20)),
    );

    const offset = (page - 1) * pageSize;

    const values: (string | number)[] = [companyId];
    /*
     * Converted prospects live on as customers (parties module) and are
     * excluded from the prospect listing.
     */
    const whereClauses = [
      "p.company_id = $1",
      "p.converted_party_id IS NULL",
      "p.status <> 'Converted'",
    ];

    const addValue = (value: string | number): number => {
      values.push(value);
      return values.length;
    };

    const search =
      typeof params.search === "string" ? params.search.trim() : "";

    if (search) {
      const index = addValue(`%${search}%`);

      whereClauses.push(`
        (
          p.prospect_no ILIKE $${index}
          OR p.company_name ILIKE $${index}
          OR COALESCE(p.status, '') ILIKE $${index}
          OR COALESCE(p.source, '') ILIKE $${index}
          OR COALESCE(p.priority, '') ILIKE $${index}
          OR COALESCE(p.assigned_to_name, '') ILIKE $${index}
          OR EXISTS (
            SELECT 1
            FROM prospect_contacts pc_search
            WHERE pc_search.company_id = p.company_id
              AND pc_search.prospect_id = p.id
              AND (
                pc_search.name ILIKE $${index}
                OR COALESCE(pc_search.email, '') ILIKE $${index}
                OR COALESCE(pc_search.phone, '') ILIKE $${index}
                OR COALESCE(pc_search.mobile, '') ILIKE $${index}
              )
          )
          OR EXISTS (
            SELECT 1
            FROM prospect_addresses pa_search
            WHERE pa_search.company_id = p.company_id
              AND pa_search.prospect_id = p.id
              AND (
                COALESCE(pa_search.city, '') ILIKE $${index}
                OR COALESCE(pa_search.country, '') ILIKE $${index}
                OR COALESCE(pa_search.postcode, '') ILIKE $${index}
              )
          )
        )
      `);
    }

    const filters = params.filters ?? {};

    const filterableFields: Record<string, string> = {
      prospect_no: "p.prospect_no",
      company_name: "p.company_name",
      status: "p.status",
      source: "p.source",
      priority: "p.priority",
      assigned_to_name: "p.assigned_to_name",
    };

    for (const [key, filter] of Object.entries(filters)) {
      if (!isPlainObject(filter)) continue;

      const filterValue = filter.value;

      if (
        filterableFields[key] &&
        filterValue !== undefined &&
        filterValue !== null &&
        String(filterValue).trim()
      ) {
        const index = addValue(`%${String(filterValue).trim()}%`);

        whereClauses.push(`${filterableFields[key]} ILIKE $${index}`);
      }

      if (key === "created_at" || key === "next_follow_up_at") {
        const dateColumn =
          key === "created_at" ? "p.created_at" : "p.next_follow_up_at";

        const from = filter.from;
        const to = filter.to;

        if (typeof from === "string" && from.trim()) {
          const index = addValue(from);
          whereClauses.push(`${dateColumn} >= $${index}::date`);
        }

        if (typeof to === "string" && to.trim()) {
          const index = addValue(to);

          whereClauses.push(
            `${dateColumn} < ($${index}::date + INTERVAL '1 day')`,
          );
        }
      }
    }

    const sortFields: Record<string, string> = {
      prospect_no: "p.prospect_no",
      company_name: "p.company_name",
      status: "p.status",
      source: "p.source",
      priority: "p.priority",
      estimated_deal_value: "p.estimated_deal_value",
      assigned_to_name: "p.assigned_to_name",
      last_contacted_at: "p.last_contacted_at",
      next_follow_up_at: "p.next_follow_up_at",
      created_at: "p.created_at",
      primary_contact_name: "pc.name",
      primary_email: "pc.email",
      primary_phone: "COALESCE(pc.phone, pc.mobile)",
      primary_city: "pa.city",
    };

    const sortColumn =
      params.sortBy && sortFields[params.sortBy]
        ? sortFields[params.sortBy]
        : "p.created_at";

    const sortDirection =
      params.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const fromSql = `
      FROM prospects p

      LEFT JOIN LATERAL (
        SELECT
          c.name,
          c.email,
          c.phone,
          c.mobile
        FROM prospect_contacts c
        WHERE c.company_id = p.company_id
          AND c.prospect_id = p.id
        ORDER BY c.is_primary DESC, c.created_at ASC
        LIMIT 1
      ) pc ON TRUE

      LEFT JOIN LATERAL (
        SELECT a.city
        FROM prospect_addresses a
        WHERE a.company_id = p.company_id
          AND a.prospect_id = p.id
        ORDER BY a.is_primary DESC, a.created_at ASC
        LIMIT 1
      ) pa ON TRUE

      WHERE ${whereClauses.join(" AND ")}
    `;

    const countResult = await pool.query<CountRecord>(
      `
      SELECT COUNT(*)::int AS total
      ${fromSql}
      `,
      values,
    );

    const dataResult = await pool.query<ProspectListRecord>(
      `
      SELECT
        p.id,
        p.prospect_no,
        p.company_name,
        p.website,
        p.status,
        p.source,
        p.priority,
        p.estimated_deal_value,
        p.currency_id,
        NULL::varchar AS currency_code,
        p.assigned_to,
        p.assigned_to_name,
        p.last_contacted_at,
        p.next_follow_up_at,
        p.reminder_enabled,
        p.created_at,

        pc.name AS primary_contact_name,
        pc.email AS primary_email,
        COALESCE(pc.phone, pc.mobile) AS primary_phone,
        pa.city AS primary_city,

        (
          SELECT COUNT(*)::int
          FROM prospect_activities act
          WHERE act.company_id = p.company_id
            AND act.prospect_id = p.id
        ) AS activities_count

      ${fromSql}

      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST,
               p.created_at DESC

      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset],
    );

    return {
      data: dataResult.rows,
      totalRecords: countResult.rows[0]?.total ?? 0,
    };
  }

  /* ==========================================================
     INSERT STATUS HISTORY
  ========================================================== */

  private static async insertStatusHistory(
    client: PoolClient,
    companyId: string,
    prospectId: string,
    previousStatus: ProspectStatus | null,
    newStatus: ProspectStatus,
    userId: string,
    remarks: string | null,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO prospect_status_history (
        company_id,
        prospect_id,
        previous_status,
        new_status,
        changed_by,
        remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        companyId,
        prospectId,
        previousStatus,
        newStatus,
        userId,
        normalizeText(remarks),
      ],
    );
  }

  /* ==========================================================
     CHANGE STATUS
  ========================================================== */

  static async changeStatus(
    companyId: string,
    userId: string,
    id: string,
    status: ProspectStatus,
    options: ProspectStatusChangeOptions = {},
  ): Promise<ProspectRecord> {
    if (status === "Converted") {
      throw new Error(
        "Use the Convert to Customer action to convert a prospect.",
      );
    }

    if (status === "Lost" && !normalizeText(options.lostReason)) {
      throw new Error("Please provide a reason for losing this prospect.");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<ProspectRecord>(
        `
        SELECT *
        FROM prospects
        WHERE id = $1
          AND company_id = $2
        FOR UPDATE
        `,
        [id, companyId],
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw new Error("Prospect not found.");
      }

      if (existing.converted_party_id || existing.status === "Converted") {
        throw new Error("This prospect has already been converted.");
      }

      if (existing.status === status) {
        await client.query("COMMIT");
        return existing;
      }

      const updateResult = await client.query<ProspectRecord>(
        `
        UPDATE prospects
        SET
            status = $1::VARCHAR(30),
            lost_reason = CASE
            WHEN $1::VARCHAR(30) = 'Lost'
                THEN $2::TEXT
            ELSE NULL::TEXT
            END,
            updated_by = $3,
            updated_at = NOW()
        WHERE id = $4
            AND company_id = $5
        RETURNING *
        `,
        [
          status,
          status === "Lost" ? normalizeText(options.lostReason) : null,
          userId,
          id,
          companyId,
        ],
      );

      const updated = getRecord(updateResult.rows, "Prospect not found.");

      await this.insertStatusHistory(
        client,
        companyId,
        id,
        existing.status,
        status,
        userId,
        options.remarks ?? null,
      );

      await client.query("COMMIT");

      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
