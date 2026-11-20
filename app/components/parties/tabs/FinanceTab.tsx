// app/components/parties/tabs/FinanceTab.tsx

// app/components/parties/tabs/FinanceTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party } from "@/types/erp";
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import NumericTextInput from "@/components/ui/NumericTextInput";

type Option = {
  id: string | number;
  name: string;
};

export type CompanyCurrency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type OptionBank = {
  id: string | number;
  bank_name: string;
};

type MasterData = {
  postingGroups: Option[];
  payableBanks: OptionBank[];
  paymentTerms: Option[];
  paymentMethods: Option[];
};

export interface FinanceSummaryMetrics {
  creditLimitFormatted?: string;
  outstandingFormatted?: string;
  availableCreditFormatted?: string;
  paymentTermsLabel?: string;
  lastPaymentFormatted?: string;
  lastPaymentDate?: string;
  lastInvoiceFormatted?: string;
  lastInvoiceDate?: string;
  outstandingInvoicesCount?: number | string;
  overdueInvoicesCount?: number | string;
}

type Props = {
  account: Partial<Party>;
  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;
  isReadonly?: boolean;
  errors?: Record<string, string>;
  currencies?: CompanyCurrency[];
  financeMetrics?: FinanceSummaryMetrics;
};

interface SwitchPillProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function SwitchPill({ checked, disabled, onChange, label }: SwitchPillProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "bg-emerald-600 border-emerald-600"
            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

export default function FinanceTab({
  account,
  setAccount,
  isReadonly = false,
  errors = {},
  currencies = [],
  financeMetrics,
}: Props) {
  const [masterData, setMasterData] = useState<MasterData>({
    postingGroups: [],
    payableBanks: [],
    paymentTerms: [],
    paymentMethods: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedReceivableGL, setSelectedReceivableGL] =
    useState<GLAccountLookupRecord | null>(null);
  const [selectedPayableGL, setSelectedPayableGL] =
    useState<GLAccountLookupRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    const targetModule = account.is_customer ? "sales" : "purchases";

    async function fetchMasterData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/parties/finance-master-data?moduleType=${targetModule}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMasterData(data);
          }
        }
      } catch (err) {
        console.error("Failed to load finance master data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, [account.is_customer]);

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setAccount((prev) => ({
      ...prev,
      e_invoice: prev.e_invoice ?? true,
      e_purchase_order: prev.e_purchase_order ?? true,
      e_debit_note: prev.e_debit_note ?? true,
    }));
  }, [setAccount]);

  const isCustomer = !!account.is_customer;
  const activeGlField = isCustomer
    ? "gl_account_receivable"
    : "gl_account_payable";

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/20 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const handleSelectGLAccount = (gl: GLAccountLookupRecord) => {
    if (isCustomer) {
      setSelectedReceivableGL(gl);
      updateField("gl_account_receivable", gl.id);
    } else {
      setSelectedPayableGL(gl);
      updateField("gl_account_payable", gl.id);
    }
    setIsModalOpen(false);
  };

  const getGlDisplayLabel = () => {
    if (isCustomer) {
      if (selectedReceivableGL) {
        return `${selectedReceivableGL.code} - ${selectedReceivableGL.name}`;
      }
      if (
        account.gl_account_receivable_code &&
        account.gl_account_receivable_name
      ) {
        return `${account.gl_account_receivable_code} - ${account.gl_account_receivable_name}`;
      }
      return account.gl_account_receivable || "";
    }

    if (selectedPayableGL) {
      return `${selectedPayableGL.code} - ${selectedPayableGL.name}`;
    }
    if (account.gl_account_payable_code && account.gl_account_payable_name) {
      return `${account.gl_account_payable_code} - ${account.gl_account_payable_name}`;
    }
    return account.gl_account_payable || "";
  };

  const selectedPaymentTermLabel = useMemo(() => {
    if (financeMetrics?.paymentTermsLabel) {
      return financeMetrics.paymentTermsLabel;
    }
    const found = masterData.paymentTerms.find(
      (t) => String(t.id) === String(account.payment_terms || ""),
    );
    return found?.name || "—";
  }, [
    financeMetrics?.paymentTermsLabel,
    masterData.paymentTerms,
    account.payment_terms,
  ]);

  const selectedCurrency = useMemo(
    () =>
      currencies.find(
        (c) => String(c.id) === String(account.currency_id || ""),
      ),
    [currencies, account.currency_id],
  );

  const metrics: FinanceSummaryMetrics = {
    creditLimitFormatted:
      financeMetrics?.creditLimitFormatted ??
      (account.credit_limit != null
        ? Number(account.credit_limit).toLocaleString("en-GB", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00"),
    outstandingFormatted: financeMetrics?.outstandingFormatted ?? "0.00",
    availableCreditFormatted:
      financeMetrics?.availableCreditFormatted ??
      (account.credit_limit != null
        ? Number(account.credit_limit).toLocaleString("en-GB", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00"),
    paymentTermsLabel: selectedPaymentTermLabel,
    lastPaymentFormatted: financeMetrics?.lastPaymentFormatted ?? "—",
    lastPaymentDate: financeMetrics?.lastPaymentDate ?? "",
    lastInvoiceFormatted: financeMetrics?.lastInvoiceFormatted ?? "—",
    lastInvoiceDate: financeMetrics?.lastInvoiceDate ?? "",
    outstandingInvoicesCount: financeMetrics?.outstandingInvoicesCount ?? 0,
    overdueInvoicesCount: financeMetrics?.overdueInvoicesCount ?? 0,
  };

  const cardClass =
    "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] p-4 shadow-2xs transition-colors";

  const sectionHeaderClass =
    "flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5";

  const creditHoldValue = Boolean(
    (account as Partial<Party> & { credit_hold?: boolean }).credit_hold,
  );
  const creditReviewDateValue = String(
    (account as Partial<Party> & { credit_review_date?: string })
      .credit_review_date || "",
  );

  return (
    <div className="space-y-4">
      {/* TOP KPI STRIP */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0 px-1">
          <Icon
            icon="tabler:wallet"
            className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
          />
          <span>Finance Overview</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Icon
                icon="tabler:id-badge-2"
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Credit Limit
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
                {metrics.creditLimitFormatted}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600/15 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
              <Icon
                icon="tabler:file-invoice"
                className="w-4 h-4 text-sky-700 dark:text-sky-400"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Outstanding
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate">
                {metrics.outstandingFormatted}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600/15 dark:bg-teal-500/20 flex items-center justify-center shrink-0">
              <Icon
                icon="tabler:clock-dollar"
                className="w-4 h-4 text-teal-700 dark:text-teal-400"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Available Credit
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate">
                {metrics.availableCreditFormatted}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-violet-200/80 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/15 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
              <Icon
                icon="tabler:calendar-stats"
                className="w-4 h-4 text-violet-700 dark:text-violet-400"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Payment Terms
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {metrics.paymentTermsLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Tax & Registration (Left) | Payment Configuration (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Tax & Registration */}
        <section className={cardClass}>
          <div className={sectionHeaderClass}>
            <Icon
              icon="tabler:receipt-2"
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
            />
            <span>Tax &amp; Registration</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Posting Group <span className="text-red-500">*</span>
              </label>
              <div className="col-span-8">
                <select
                  value={account.posting_group || ""}
                  onChange={(e) => updateField("posting_group", e.target.value)}
                  disabled={isReadonly || loading}
                  className={getInputClass("finance.posting_group")}
                >
                  <option value="">Select Posting Group</option>
                  {masterData.postingGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {errors["finance.posting_group"] && (
                  <p className="text-red-500 text-[11px] mt-0.5">
                    {errors["finance.posting_group"]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                {isCustomer ? "VAT Number" : "Supplier VAT No."}
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={
                    isCustomer
                      ? account.vat_reg_no || ""
                      : account.supplier_vat_no || ""
                  }
                  onChange={(e) =>
                    updateField(
                      isCustomer ? "vat_reg_no" : "supplier_vat_no",
                      e.target.value,
                    )
                  }
                  disabled={isReadonly}
                  className={getInputClass(
                    isCustomer
                      ? "finance.vat_reg_no"
                      : "finance.supplier_vat_no",
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Company Reg. No.
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={account.company_reg_no || ""}
                  onChange={(e) =>
                    updateField("company_reg_no", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.company_reg_no")}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Currency <span className="text-red-500">*</span>
              </label>
              <div className="col-span-8">
                <select
                  disabled={isReadonly}
                  value={account.currency_id || ""}
                  onChange={(e) => updateField("currency_id", e.target.value)}
                  className={getInputClass("general.currency_id")}
                >
                  <option value="">Select Currency...</option>
                  {currencies.map((curr) => (
                    <option key={curr.id} value={curr.id}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
                {selectedCurrency && !isReadonly && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    Rate: {selectedCurrency.exchange_rate}
                    {selectedCurrency.is_base ? " (Base)" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Payment Configuration */}
        <section className={cardClass}>
          <div className={sectionHeaderClass}>
            <Icon
              icon="tabler:credit-card"
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
            />
            <span>Payment Configuration</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Payable Bank
              </label>
              <div className="col-span-8">
                <select
                  value={account.payable_bank || ""}
                  onChange={(e) => updateField("payable_bank", e.target.value)}
                  disabled={isReadonly || loading}
                  className={getInputClass("finance.payable_bank")}
                >
                  <option value="">Select Payable Bank</option>
                  {masterData.payableBanks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                {isCustomer
                  ? "Default G/L Account Receivable"
                  : "Default G/L Account Payable"}
              </label>
              <div className="col-span-8">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    placeholder="Choose G/L..."
                    value={getGlDisplayLabel()}
                    disabled={isReadonly}
                    onClick={() => !isReadonly && setIsModalOpen(true)}
                    className={`${getInputClass(
                      `finance.${activeGlField}`,
                    )} font-mono ${!isReadonly ? "cursor-pointer" : ""}`}
                  />
                  <button
                    type="button"
                    disabled={isReadonly}
                    onClick={() => setIsModalOpen(true)}
                    className="px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    title="Lookup G/L Account"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Payment Terms
              </label>
              <div className="col-span-8">
                <select
                  value={account.payment_terms || ""}
                  onChange={(e) => updateField("payment_terms", e.target.value)}
                  disabled={isReadonly || loading}
                  className={getInputClass("finance.payment_terms")}
                >
                  <option value="">Select Payment Terms</option>
                  {masterData.paymentTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Payment Method
              </label>
              <div className="col-span-8">
                <select
                  value={account.payment_method || ""}
                  onChange={(e) =>
                    updateField("payment_method", e.target.value)
                  }
                  disabled={isReadonly || loading}
                  className={getInputClass("finance.payment_method")}
                >
                  <option value="">Select Payment Method</option>
                  {masterData.paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* LOWER-MIDDLE ROW: E-Invoicing & Notifications | Credit Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <section
          className={`${cardClass} lg:col-span-5 flex flex-col justify-center`}
        >
          <div className={sectionHeaderClass}>
            <Icon
              icon="tabler:send"
              className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
            />
            <span>E-Invoicing &amp; Notifications</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {isCustomer ? (
              <>
                <SwitchPill
                  label="E-Invoice"
                  checked={!!account.e_invoice}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_invoice", val)}
                />
                <SwitchPill
                  label="E-Reminder"
                  checked={!!account.e_reminder}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_reminder", val)}
                />
                <SwitchPill
                  label="E-Statement"
                  checked={!!account.e_statement}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_statement", val)}
                />
              </>
            ) : (
              <>
                <SwitchPill
                  label="E-Purchase Order"
                  checked={!!account.e_purchase_order}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_purchase_order", val)}
                />
                <SwitchPill
                  label="E-Debit Note"
                  checked={!!account.e_debit_note}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_debit_note", val)}
                />
                <SwitchPill
                  label="E-Remittance Advice"
                  checked={!!account.e_remittance_advice}
                  disabled={isReadonly}
                  onChange={(val) => updateField("e_remittance_advice", val)}
                />
              </>
            )}
          </div>
        </section>

        <section
          className={`${cardClass} lg:col-span-7 flex flex-col justify-center`}
        >
          <div className={sectionHeaderClass}>
            <Icon
              icon="tabler:shield-check"
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
            />
            <span>Credit Control</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Credit Limit
              </label>
              <div className="w-36">
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  value={Number(account.credit_limit) || 0}
                  onChange={(val) => updateField("credit_limit", Number(val))}
                  disabled={isReadonly}
                  className={`${getInputClass("general.credit_limit")} tabular-nums`}
                />
              </div>
            </div>

            {isCustomer ? (
              <>
                <SwitchPill
                  label="Credit Hold"
                  checked={creditHoldValue}
                  disabled={isReadonly}
                  onChange={(val) =>
                    setAccount((prev) => ({
                      ...prev,
                      credit_hold: val,
                    }))
                  }
                />

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Review Date
                  </label>
                  <input
                    type="date"
                    value={creditReviewDateValue}
                    disabled={isReadonly}
                    onChange={(e) =>
                      setAccount((prev) => ({
                        ...prev,
                        credit_review_date: e.target.value,
                      }))
                    }
                    className={`${getInputClass("finance.credit_review_date")} w-36 tabular-nums`}
                  />
                </div>
              </>
            ) : (
              <SwitchPill
                label="Exclude From Creditors Aging Report"
                checked={!!account.exclude_from_aging_report}
                disabled={isReadonly}
                onChange={(val) =>
                  updateField("exclude_from_aging_report", val)
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* BOTTOM ROW: Bank Account Details (Left) | Financial Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <section className={`${cardClass} lg:col-span-8`}>
          <div className={sectionHeaderClass}>
            <Icon
              icon="tabler:building-bank"
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
            />
            <span>
              {isCustomer
                ? "Customer Bank Account Details"
                : "Supplier Bank Account Details"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Account Name
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={account.bank_account_name || ""}
                  onChange={(e) =>
                    updateField("bank_account_name", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_account_name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Bank Name
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={account.bank_name || ""}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Sort Code
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  placeholder="e.g. 00-00-00"
                  value={account.bank_sort_code || ""}
                  onChange={(e) =>
                    updateField("bank_sort_code", e.target.value)
                  }
                  disabled={isReadonly}
                  className={`${getInputClass("finance.bank_sort_code")} tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Account Number
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  placeholder="e.g. 12345678"
                  value={account.bank_account_no || ""}
                  onChange={(e) =>
                    updateField("bank_account_no", e.target.value)
                  }
                  disabled={isReadonly}
                  className={`${getInputClass("finance.bank_account_no")} tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                SWIFT/BIC
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={account.bank_swift_bic || ""}
                  onChange={(e) =>
                    updateField("bank_swift_bic", e.target.value)
                  }
                  disabled={isReadonly}
                  className={`${getInputClass("finance.bank_swift_bic")} uppercase`}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                IBAN
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={account.bank_iban || ""}
                  onChange={(e) => updateField("bank_iban", e.target.value)}
                  disabled={isReadonly}
                  className={`${getInputClass("finance.bank_iban")} uppercase`}
                />
              </div>
            </div>

            {!isReadonly && (
              <>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    Bank Address 1
                  </label>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={account.bank_address || ""}
                      onChange={(e) =>
                        updateField("bank_address", e.target.value)
                      }
                      disabled={isReadonly}
                      className={getInputClass("finance.bank_address")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    Bank Address 2
                  </label>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={account.bank_address_2 || ""}
                      onChange={(e) =>
                        updateField("bank_address_2", e.target.value)
                      }
                      disabled={isReadonly}
                      className={getInputClass("finance.bank_address_2")}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section
          className={`${cardClass} lg:col-span-4 flex flex-col justify-between`}
        >
          <div>
            <div className={sectionHeaderClass}>
              <Icon
                icon="tabler:chart-bar"
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
              />
              <span>Financial Activity</span>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Icon
                    icon="tabler:coins"
                    className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0"
                  />
                  <span>Last Payment</span>
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-right">
                  {metrics.lastPaymentFormatted}
                  {metrics.lastPaymentDate ? (
                    <span className="text-slate-400 font-normal">
                      {" "}
                      | {metrics.lastPaymentDate}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Icon
                    icon="tabler:file-text"
                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  />
                  <span>Last Invoice</span>
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-right">
                  {metrics.lastInvoiceFormatted}
                  {metrics.lastInvoiceDate ? (
                    <span className="text-slate-400 font-normal">
                      {" "}
                      | {metrics.lastInvoiceDate}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Icon
                    icon="tabler:folder-open"
                    className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0"
                  />
                  <span>Outstanding Invoices</span>
                </dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.outstandingInvoicesCount}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Icon
                    icon="tabler:alert-circle"
                    className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                  />
                  <span>Overdue Invoices</span>
                </dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.overdueInvoicesCount}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <GLAccountLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectGLAccount}
        multiple={false}
      />
    </div>
  );
}

/* "use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party } from "@/types/erp";
// Lookup Modal Imports
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import NumericTextInput from "@/components/ui/NumericTextInput";

type Option = {
  id: string | number;
  name: string;
};

export type CompanyCurrency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type OptionBank = {
  id: string | number;
  bank_name: string;
};

type MasterData = {
  postingGroups: Option[];
  payableBanks: OptionBank[];
  paymentTerms: Option[];
  paymentMethods: Option[];
};

type Props = {
  account: Partial<Party>;
  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;
  isReadonly?: boolean;
  errors?: Record<string, string>;
  currencies?: CompanyCurrency[];
};

export default function FinanceTab({
  account,
  setAccount,
  isReadonly = false,
  errors = {},
  currencies = [],
}: Props) {
  const [masterData, setMasterData] = useState<MasterData>({
    postingGroups: [],
    payableBanks: [],
    paymentTerms: [],
    paymentMethods: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedReceivableGL, setSelectedReceivableGL] =
    useState<GLAccountLookupRecord | null>(null);
  const [selectedPayableGL, setSelectedPayableGL] =
    useState<GLAccountLookupRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    const targetModule = account.is_customer ? "sales" : "purchases";

    async function fetchMasterData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/parties/finance-master-data?moduleType=${targetModule}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMasterData(data);
          }
        }
      } catch (err) {
        console.error("Failed to load finance master data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, [account.is_customer]);

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setAccount((prev) => ({
      ...prev,
      e_invoice: prev.e_invoice ?? true,
      e_purchase_order: prev.e_purchase_order ?? true,
      e_debit_note: prev.e_debit_note ?? true,
    }));
  }, [setAccount]);

  const isCustomer = !!account.is_customer;
  const activeGlField = isCustomer
    ? "gl_account_receivable"
    : "gl_account_payable";

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border p-2 rounded text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const handleSelectGLAccount = (gl: GLAccountLookupRecord) => {
    if (isCustomer) {
      setSelectedReceivableGL(gl);
      updateField("gl_account_receivable", gl.id);
    } else {
      setSelectedPayableGL(gl);
      updateField("gl_account_payable", gl.id);
    }
    setIsModalOpen(false);
  };

  const getGlDisplayLabel = () => {
    if (isCustomer) {
      if (selectedReceivableGL) {
        return `${selectedReceivableGL.code} - ${selectedReceivableGL.name}`;
      }

      if (
        account.gl_account_receivable_code &&
        account.gl_account_receivable_name
      ) {
        return `${account.gl_account_receivable_code} - ${account.gl_account_receivable_name}`;
      }

      return account.gl_account_receivable || "";
    } else {
      if (selectedPayableGL) {
        return `${selectedPayableGL.code} - ${selectedPayableGL.name}`;
      }

      if (account.gl_account_payable_code && account.gl_account_payable_name) {
        return `${account.gl_account_payable_code} - ${account.gl_account_payable_name}`;
      }

      return account.gl_account_payable || "";
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Posting Group <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                value={account.posting_group || ""}
                onChange={(e) => updateField("posting_group", e.target.value)}
                disabled={isReadonly || loading}
                className={getInputClass("finance.posting_group")}
              >
                <option value="">Select Posting Group</option>
                {masterData.postingGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {account.is_customer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  VAT No.
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={account.vat_reg_no || ""}
                    onChange={(e) => updateField("vat_reg_no", e.target.value)}
                    disabled={isReadonly}
                    className={getInputClass("finance.vat_reg_no")}
                  />
                </div>
              </div>
            </>
          )}

          {!isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Supplier VAT No.
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={account.supplier_vat_no || ""}
                    onChange={(e) =>
                      updateField("supplier_vat_no", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.supplier_vat_no")}
                  />
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Company Reg. No.
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.company_reg_no || ""}
                onChange={(e) => updateField("company_reg_no", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.company_reg_no")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center pt-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              E-Generate
            </label>
            <div className="col-span-2 flex flex-wrap gap-4 text-sm">
              {isCustomer ? (
                <>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_invoice}
                      onChange={(e) =>
                        updateField("e_invoice", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Invoice
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_reminder}
                      onChange={(e) =>
                        updateField("e_reminder", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Reminder
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_statement}
                      onChange={(e) =>
                        updateField("e_statement", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Statement
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_purchase_order}
                      onChange={(e) =>
                        updateField("e_purchase_order", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Purchase Order
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_debit_note}
                      onChange={(e) =>
                        updateField("e_debit_note", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Debit Note
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_remittance_advice}
                      onChange={(e) =>
                        updateField("e_remittance_advice", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Remittance Advice
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Payable Bank
            </label>
            <div className="col-span-2">
              <select
                value={account.payable_bank || ""}
                onChange={(e) => updateField("payable_bank", e.target.value)}
                disabled={isReadonly || loading}
                className={getInputClass("finance.payable_bank")}
              >
                <option value="">Select Payable Bank</option>
                {masterData.payableBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isCustomer
                ? "Default G/L Account Receivable"
                : "Default G/L Account Payable"}
            </label>
            <div className="col-span-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  placeholder="Choose G/L..."
                  value={getGlDisplayLabel()}
                  disabled={isReadonly}
                  className={`${getInputClass(`finance.${activeGlField}`)} font-mono cursor-pointer`}
                  onClick={() => !isReadonly && setIsModalOpen(true)}
                />

                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 transition"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {!isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payment Terms
                </label>
                <div className="col-span-2">
                  <select
                    value={account.payment_terms || ""}
                    onChange={(e) =>
                      updateField("payment_terms", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_terms")}
                  >
                    <option value="">Select Payment Terms</option>
                    {masterData.paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <div className="col-span-2">
                  <select
                    value={account.payment_method || ""}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_method")}
                  >
                    <option value="">Select Payment Method</option>
                    {masterData.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payment Terms
                </label>
                <div className="col-span-2 ">
                  <select
                    value={account.payment_terms || ""}
                    onChange={(e) =>
                      updateField("payment_terms", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_terms")}
                  >
                    <option value="">Select Payment Terms</option>
                    {masterData.paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <div className="col-span-2">
                  <select
                    value={account.payment_method || ""}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_method")}
                  >
                    <option value="">Select Payment Method</option>
                    {masterData.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Credit Limit
                </label>
                <div className="col-span-2">
                  <NumericTextInput
                    allowDecimals
                    decimalScale={2}
                    value={Number(account.credit_limit) || 0}
                    onChange={(val) => updateField("credit_limit", Number(val))}
                    disabled={isReadonly}
                    className={getInputClass("general.credit_limit")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Currency <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <select
                    disabled={isReadonly}
                    value={account.currency_id || ""}
                    onChange={(e) => updateField("currency_id", e.target.value)}
                    className={getInputClass("general.currency_id")}
                  >
                    <option value="">Select Currency...</option>
                    {currencies.map((curr) => (
                      <option key={curr.id} value={curr.id}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {!isCustomer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Exclude From Creditors Aging Report
              </label>
              <div className="col-span-2">
                <input
                  type="checkbox"
                  checked={!!account.exclude_from_aging_report}
                  onChange={(e) =>
                    updateField("exclude_from_aging_report", e.target.checked)
                  }
                  disabled={isReadonly}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isCustomer
              ? "Customer Bank Account Details"
              : "Supplier Bank Account Details"}
          </h3>

          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Account Name
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_account_name || ""}
                  onChange={(e) =>
                    updateField("bank_account_name", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_account_name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Sort Code / Account No.
              </label>
              <div className="col-span-2 grid grid-cols-2 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Sort Code"
                  value={account.bank_sort_code || ""}
                  onChange={(e) =>
                    updateField("bank_sort_code", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_sort_code")}
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-500 whitespace-nowrap">
                    Account No.
                  </span>
                  <input
                    type="text"
                    placeholder="Account No."
                    value={account.bank_account_no || ""}
                    onChange={(e) =>
                      updateField("bank_account_no", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.bank_account_no")}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Swift/BIC
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_swift_bic || ""}
                  onChange={(e) =>
                    updateField("bank_swift_bic", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_swift_bic")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                IBAN
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_iban || ""}
                  onChange={(e) => updateField("bank_iban", e.target.value)}
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_iban")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            &nbsp;
          </h3>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Bank Name
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.bank_name || ""}
                onChange={(e) => updateField("bank_name", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.bank_name")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Address Lines
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.bank_address || ""}
                onChange={(e) => updateField("bank_address", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.bank_address")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Bank Address Line 2
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.bank_address_2 || ""}
                onChange={(e) => updateField("bank_address_2", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.bank_address_2")}
              />
            </div>
          </div>
        </div>
      </div>

      <GLAccountLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectGLAccount}
        multiple={false}
      />
    </div>
  );
} */

{
  /* 
              <SelectWithAddModal
                disabled={isReadonly}
                value={account.payment_term_id || ""}
                onChange={(val) => updateField("payment_term_id", val)}
                items={paymentTerms}
                placeholder="Select Payment Terms..."
                apiEndpoint={`/api/setup/sales/payment_terms?module=${activeModule}`}
                payloadExtra={{ module_type: activeModule }}
                additionalFields={[{ name: "days", label: "Days", type: "number" }]}
                onItemAdded={(newItem) => setPaymentTerms((prev) => [...prev, newItem])}
                className={getInputClass("general.payment_term_id")}
              />
              */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Finance Charge
                </label>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={account.finance_charge || ""}
                    onChange={(e) =>
                      updateField("finance_charge", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.finance_charge")}
                  />
                  <input
                    type="checkbox"
                    checked={!!account.has_finance_charge}
                    onChange={(e) =>
                      updateField("has_finance_charge", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Insurance Charge
                </label>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={account.insurance_charge || ""}
                    onChange={(e) =>
                      updateField("insurance_charge", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.insurance_charge")}
                  />
                  <input
                    type="checkbox"
                    checked={!!account.has_insurance_charge}
                    onChange={(e) =>
                      updateField("has_insurance_charge", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div> */
  /* <select
                    value={account.payment_method || ""}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_method")}
                  >
                    <option value="">Select Payment Method</option>
                    {masterData.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select> */
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Contact Person
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_contact_person || ""}
                onChange={(e) =>
                  updateField("finance_contact_person", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_contact_person")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                placeholder="e.g. myname@example.com"
                value={account.finance_email || ""}
                onChange={(e) => updateField("finance_email", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_email")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Telephone
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_phone || ""}
                onChange={(e) => updateField("finance_phone", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_phone")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fax
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_fax || ""}
                onChange={(e) => updateField("finance_fax", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_fax")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Alt. Contact Person
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_alt_contact || ""}
                onChange={(e) =>
                  updateField("finance_alt_contact", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_alt_contact")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Alt. Contact Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                value={account.finance_alt_email || ""}
                onChange={(e) =>
                  updateField("finance_alt_email", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_alt_email")}
              />
            </div>
          </div> */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Company Reg. No.
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                placeholder="Company Reg. No."
                value={account.comp_reg_no ?? 0}
                onChange={(e) => updateField("comp_reg_no", e.target.value)}
                className={getInputClass("general.comp_reg_no")}
              />
            </div>
          </div> */
}
