// lib/auth/getCompanyId.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCompanyId() {
  const session = await getServerSession(authOptions);

  if (!session) return null;

  return session.user.company_id || null;
}