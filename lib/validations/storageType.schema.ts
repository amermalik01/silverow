// lib/validations/storageType.schema.ts

import { z } from "zod";

export const storageTypeSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  status: z.number().optional(),
});

export type StorageTypeInput = z.infer<typeof storageTypeSchema>;