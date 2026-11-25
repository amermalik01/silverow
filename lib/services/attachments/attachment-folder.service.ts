// lib/services/attachments/attachment-folder.service.ts

import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

/* ============================================================
   SCOPES
   Parties-type records (CRM, Customer, SRM, Supplier, Finance) share
   one folder set; every other module gets its own.
============================================================ */

export const PARTY_ATTACHMENT_MODULES = [
  "crm",
  "srm",
  "customer",
  "supplier",
  "finance",
] as const;

const PARTY_DEFAULT_FOLDERS = [
  "Contracts",
  "Pricing & Rebates",
  "Finance",
  "General",
];

const MODULE_DEFAULT_FOLDERS = ["General"];

export function folderScopeOf(module: string): string {
  const key = module.trim().toLowerCase();
  return (PARTY_ATTACHMENT_MODULES as readonly string[]).includes(key)
    ? "parties"
    : key;
}

/** Attachment `module` values that belong to a scope. */
function modulesOfScope(scope: string): string[] {
  return scope === "parties" ? [...PARTY_ATTACHMENT_MODULES] : [scope];
}

function defaultFoldersOf(scope: string): string[] {
  return scope === "parties" ? PARTY_DEFAULT_FOLDERS : MODULE_DEFAULT_FOLDERS;
}

export class AttachmentFolderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AttachmentFolderError";
  }
}

export type AttachmentFolderRow = {
  id: string;
  scope: string;
  name: string;
  sort_order: number;
  /** Files in this folder across all records of the scope. */
  file_count: number;
};

function cleanName(name: unknown): string {
  const value = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";

  if (!value) throw new AttachmentFolderError("Folder name is required.");
  if (value.length > 60) {
    throw new AttachmentFolderError("Folder name cannot exceed 60 characters.");
  }

  return value;
}

/* ============================================================
   SERVICE
============================================================ */

export class AttachmentFolderService {
  /** Folders for a module, creating the defaults on first use. */
  static async list(
    companyId: string,
    module: string,
  ): Promise<{ scope: string; folders: AttachmentFolderRow[] }> {
    const scope = folderScopeOf(module);

    await pool.query(
      `
      INSERT INTO attachment_folders (company_id, scope, name, sort_order)
      SELECT $1, $2, d.name, d.ord * 10
      FROM unnest($3::text[]) WITH ORDINALITY AS d(name, ord)
      WHERE NOT EXISTS (
        SELECT 1 FROM attachment_folders
        WHERE company_id = $1 AND scope = $2
      )
      ON CONFLICT DO NOTHING
      `,
      [companyId, scope, defaultFoldersOf(scope)],
    );

    const result = await pool.query<AttachmentFolderRow>(
      `
      SELECT
        f.id,
        f.scope,
        f.name,
        f.sort_order,
        (
          SELECT COUNT(*)::int
          FROM attachments a
          WHERE a.company_id = f.company_id
            AND a.module = ANY($3::text[])
            AND LOWER(a.folder) = LOWER(f.name)
        ) AS file_count
      FROM attachment_folders f
      WHERE f.company_id = $1
        AND f.scope = $2
      ORDER BY f.sort_order ASC, f.name ASC
      `,
      [companyId, scope, modulesOfScope(scope)],
    );

    return { scope, folders: result.rows };
  }

  static async create(
    companyId: string,
    userId: string | null,
    module: string,
    rawName: unknown,
  ): Promise<AttachmentFolderRow> {
    const scope = folderScopeOf(module);
    const name = cleanName(rawName);

    await this.assertNameFree(companyId, scope, name);

    const result = await pool.query<AttachmentFolderRow>(
      `
      INSERT INTO attachment_folders (company_id, scope, name, sort_order, created_by)
      VALUES (
        $1, $2, $3,
        COALESCE((SELECT MAX(sort_order) FROM attachment_folders
                  WHERE company_id = $1 AND scope = $2), 0) + 10,
        $4
      )
      RETURNING id, scope, name, sort_order, 0 AS file_count
      `,
      [companyId, scope, name, userId],
    );

    return result.rows[0];
  }

  /** Renames a folder and moves its files (all records in the scope). */
  static async rename(
    companyId: string,
    folderId: string,
    rawName: unknown,
  ): Promise<{ id: string; name: string; previousName: string }> {
    const name = cleanName(rawName);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await this.lock(client, companyId, folderId);

      if (current.name === name) {
        await client.query("COMMIT");
        return { id: folderId, name, previousName: current.name };
      }

      if (current.name.toLowerCase() !== name.toLowerCase()) {
        await this.assertNameFree(companyId, current.scope, name, client);
      }

      await client.query(
        `
        UPDATE attachment_folders
        SET name = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        `,
        [name, folderId, companyId],
      );

      await client.query(
        `
        UPDATE attachments
        SET folder = $1
        WHERE company_id = $2
          AND module = ANY($3::text[])
          AND LOWER(folder) = LOWER($4)
        `,
        [name, companyId, modulesOfScope(current.scope), current.name],
      );

      await client.query("COMMIT");

      return { id: folderId, name, previousName: current.name };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a folder. Its files move to `moveToFolderId` (or the first
   * remaining folder). The last folder of a scope cannot be deleted.
   */
  static async remove(
    companyId: string,
    folderId: string,
    moveToFolderId?: string | null,
  ): Promise<{ movedFiles: number; movedTo: string | null }> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await this.lock(client, companyId, folderId);

      const others = await client.query<{ id: string; name: string }>(
        `
        SELECT id, name
        FROM attachment_folders
        WHERE company_id = $1
          AND scope = $2
          AND id <> $3
        ORDER BY sort_order ASC, name ASC
        `,
        [companyId, current.scope, folderId],
      );

      if (!others.rows.length) {
        throw new AttachmentFolderError("At least one folder must remain.");
      }

      const target = moveToFolderId
        ? others.rows.find((folder) => folder.id === moveToFolderId)
        : others.rows[0];

      if (!target) {
        throw new AttachmentFolderError("Select a valid folder to move files to.");
      }

      const moved = await client.query(
        `
        UPDATE attachments
        SET folder = $1
        WHERE company_id = $2
          AND module = ANY($3::text[])
          AND LOWER(folder) = LOWER($4)
        `,
        [target.name, companyId, modulesOfScope(current.scope), current.name],
      );

      await client.query(
        `DELETE FROM attachment_folders WHERE id = $1 AND company_id = $2`,
        [folderId, companyId],
      );

      await client.query("COMMIT");

      return { movedFiles: moved.rowCount ?? 0, movedTo: target.name };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /* ------------------------------------------------------------ */

  private static async lock(
    client: PoolClient | typeof pool,
    companyId: string,
    folderId: string,
  ): Promise<{ scope: string; name: string }> {
    const result = await client.query<{ scope: string; name: string }>(
      `
      SELECT scope, name
      FROM attachment_folders
      WHERE id = $1 AND company_id = $2
      FOR UPDATE
      `,
      [folderId, companyId],
    );

    if (!result.rows[0]) {
      throw new AttachmentFolderError("Folder not found.", 404);
    }

    return result.rows[0];
  }

  private static async assertNameFree(
    companyId: string,
    scope: string,
    name: string,
    client: PoolClient | typeof pool = pool,
  ): Promise<void> {
    const existing = await client.query(
      `
      SELECT 1
      FROM attachment_folders
      WHERE company_id = $1
        AND scope = $2
        AND LOWER(name) = LOWER($3)
      LIMIT 1
      `,
      [companyId, scope, name],
    );

    if (existing.rows.length) {
      throw new AttachmentFolderError(`A folder named "${name}" already exists.`, 409);
    }
  }
}
