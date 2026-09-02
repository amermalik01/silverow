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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "text/plain": { maxFileSize: "2MB", maxFileCount: 5 },
  })
    .input(
      z.object({
        module: z.string().min(1).max(100),
        recordId: z.string().min(1).max(200),
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
      const fileUrl = file.ufsUrl ?? file.url;

      try {
        const result = await pool.query(
          `INSERT INTO attachments (company_id, module, record_id, file_name, file_key, file_path, file_size, mime_type, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, file_name, file_key, file_path, file_size, mime_type, created_at`,
          [
            metadata.companyId,
            metadata.module,
            metadata.recordId,
            file.name,
            file.key,
            fileUrl,
            file.size,
            file.type,
            metadata.userId,
          ],
        );
        console.log("Attachment saved:", result.rows[0]);

        return {
          attachmentId: result.rows[0].id,
          fileKey: file.key,
          fileUrl,
        };
      } catch (error) {
        console.error("Failed to save attachment:", error);
        throw new UploadThingError(
          "File uploaded but attachment record could not be saved",
        );
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof OurFileRouter;
