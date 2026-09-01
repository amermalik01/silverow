// app/api/uploadthing/core.ts

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

const f = createUploadthing();

export const OurFileRouter = {
  attachmentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .input(
      z.object({
        module: z.string(),
        recordId: z.string(),
      }),
    )
    .middleware(async ({ input }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.company_id) {
        throw new UploadThingError("Unauthorized access to company tenant");
      }

      return {
        companyId: session.user.company_id,
        userId: session.user.id,
        module: input.module,
        recordId: input.recordId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Auto-insert record into PostgreSQL upon successful UploadThing upload
      const dbPath = file.ufsUrl || file.url; // Remote UploadThing CDN URL

      await pool.query(
        `INSERT INTO attachments (company_id, module, record_id, file_name, file_path, file_size, mime_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          metadata.companyId,
          metadata.module,
          metadata.recordId,
          file.name,
          dbPath,
          file.size,
          file.type,
          metadata.userId,
        ],
      );

      return { uploadedBy: metadata.userId, filePath: dbPath };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof OurFileRouter;
