// lib/bootstrap/index.ts

import { PoolClient } from "pg";

import { initializeSequences } from "./sequences";
import { initializeChartOfAccounts } from "./chartOfAccounts";
import { initializePostingGroups } from "./postingGroups";
import { initializeVat } from "./vat";

export async function initializeCompany(
  client: PoolClient,
  companyId: string
) {
  await initializeSequences(client, companyId);
  await initializeChartOfAccounts(client, companyId);
  await initializePostingGroups(client, companyId);
  await initializeVat(client, companyId);
}