// lib/bootstrap/index.ts

import { PoolClient } from "pg";

import { initializeSequences } from "./sequences";
import { initializeChartOfAccounts } from "./chartOfAccounts";
import { initializePostingGroups } from "./postingGroups";

import { initializeVatMasterData, initializeVatPostingSetup } from "./vat";

import { initializeCurrency } from "./currency";
import { initializeCurrencyMovementSetup } from "./currencySetup";
import { initializeFinanceSetup } from "./financeSetup";

import { initializeSalesDefaults } from "@/lib/bootstrap/sales";
import { initializePurchaseDefaults } from "@/lib/bootstrap/purchases";

export async function initializeCompany(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  // 1. Document sequences
  await initializeSequences(client, companyId);

  // 2. VAT master data
  await initializeVatMasterData(client, companyId);

  // 3. Company-specific chart of accounts
  await initializeChartOfAccounts(client, companyId);

  // 4. VAT posting setup
  await initializeVatPostingSetup(client, companyId);

  // 5. Posting groups
  await initializePostingGroups(client, companyId);

  // 6. Base currency
  await initializeCurrency(client, companyId);

  // 7. Currency movement accounts
  await initializeCurrencyMovementSetup(client, companyId);

  // 8. Finance control accounts
  await initializeFinanceSetup(client, companyId);

  // CRM and sales master data
  await initializeSalesDefaults(client, companyId);

  // Purchase master data
  await initializePurchaseDefaults(client, companyId);
}

/* import { PoolClient } from "pg";

import { initializeSequences } from "./sequences";
import { initializeChartOfAccounts } from "./chartOfAccounts";
import { initializePostingGroups } from "./postingGroups";

import {
  initializeVatMasterData,
  initializeVatPostingSetup,
} from "./vat";

// import { initializeVat } from "./vat";
import { initializeCurrency } from "./currency";
import { initializeCurrencyMovementSetup } from "./currencySetup";

export async function initializeCompany(client: PoolClient, companyId: string) {
  await initializeSequences(client, companyId);
  await initializeChartOfAccounts(client, companyId);
  await initializePostingGroups(client, companyId);
  await initializeVat(client, companyId);
  await initializeCurrency(client, companyId);
  await initializeCurrencyMovementSetup(client, companyId);
} */
