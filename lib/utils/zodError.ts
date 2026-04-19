//  lib/utils/zodError.ts

import { z } from "zod";

export function getZodErrorMessages(err: unknown): string[] {
  if (err instanceof z.ZodError) {
    return err.issues.map((e) => e.message);
  }
  return ["Invalid input"];
}