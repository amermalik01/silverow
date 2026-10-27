// app/components/energy/sites/tabs/SitePaymentsTab.tsx


"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { SitesFormData, PaymentFrequency } from "@/types/sites";

import NumericTextInput from "@/components/ui/NumericTextInput";
import SitePaymentSchedule from "../components/SitePaymentSchedule";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded border border-slate-200 bg-white p-2.5 " +
  "text-xs text-slate-800 outline-none " +
  "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 " +
  "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:disabled:bg-slate-800/50";

const labelClass =
  "text-xs font-medium text-slate-700 dark:text-slate-300";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  alignStart?: boolean;
}

function FormField({
  label,
  error,
  children,
  alignStart = false,
}: FormFieldProps) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 ${
        alignStart ? "items-start" : "items-center"
      }`}
    >
      <label className={`${labelClass} ${alignStart ? "pt-2" : ""}`}>
        {label}
      </label>

      <div className="col-span-2">
        {children}

        {error && (
          <p className="mt-1 text-[10px] text-red-500">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SitePaymentsTab({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const updateSite = <K extends keyof SitesFormData>(
    key: K,
    value: SitesFormData[K],
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const scheduledTotal = site.payment_schedules.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const contractAmount = Number(site.contract_amount ?? 0);

  const coveragePercentage =
    contractAmount > 0
      ? (scheduledTotal / contractAmount) * 100
      : 0;

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: site.payment_currency || "GBP",
    }).format(value);

  return (
    <div className="space-y-8 pt-2">
      {/* Payment Configuration */}
      <section>
        <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
          Payment Configuration
        </h3>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-2">
            <FormField label="Payment Frequency">
              <select
                value={site.payment_frequency}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite(
                    "payment_frequency",
                    e.target.value as PaymentFrequency,
                  )
                }
                className={inputClass}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </FormField>

            <FormField
              label="Contract Amount"
              error={errors.contract_amount}
            >
              <NumericTextInput
                allowDecimals
                decimalScale={2}
                min={0}
                disabled={isReadonly}
                value={site.contract_amount ?? 0}
                onChange={(value) =>
                  updateSite("contract_amount", value)
                }
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Payment Terms / Notes"
              alignStart
            >
              <textarea
                rows={3}
                value={site.payment_notes}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("payment_notes", e.target.value)
                }
                placeholder="Enter payment terms or contractual notes..."
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Right Column */}
          <div className="space-y-2">
            <FormField label="Payment Currency">
              <select
                value={site.payment_currency}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("payment_currency", e.target.value)
                }
                className={inputClass}
              >
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </FormField>

            <FormField label="Partial Payments">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={site.allow_partial_payments}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateSite(
                      "allow_partial_payments",
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                Allow partial payments
              </label>
            </FormField>
          </div>
        </div>
      </section>

      {/* Contract Schedule Coverage */}
      {contractAmount > 0 && (
        <section>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
            Contract Schedule Coverage
          </h3>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
            <div className="space-y-2">
              <FormField label="Contract Value">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold tabular-nums dark:border-slate-800 dark:bg-slate-800/50">
                  {formatMoney(contractAmount)}
                </div>
              </FormField>

              <FormField label="Scheduled Amount">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold tabular-nums dark:border-slate-800 dark:bg-slate-800/50">
                  {formatMoney(scheduledTotal)}
                </div>
              </FormField>
            </div>

            <div className="space-y-2">
              <FormField label="Coverage">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold tabular-nums dark:border-slate-800 dark:bg-slate-800/50">
                  {coveragePercentage.toFixed(1)}%
                </div>
              </FormField>

              <div className="grid grid-cols-3 items-center gap-2">
                <span className={labelClass}>
                  Schedule Progress
                </span>

                <div className="col-span-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, coveragePercentage),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Payment Schedule */}
      <SitePaymentSchedule
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />
    </div>
  );
}


/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, PaymentFrequency } from "@/types/sites";
import { Icon } from "@iconify/react";
import SitePaymentSchedule from "../components/SitePaymentSchedule";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 " +
  "text-xs outline-none focus:border-emerald-500 " +
  "focus:ring-1 focus:ring-emerald-500 " +
  "disabled:bg-slate-50 dark:border-slate-700 " +
  "dark:bg-slate-900 dark:disabled:bg-slate-800/50";

export default function SitePaymentsTab({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const updateSite = <K extends keyof SitesFormData>(
    key: K,
    value: SitesFormData[K],
  ) => {
    setSiteRec((prev) => ({ ...prev, [key]: value }));
  };

  const scheduledTotal = site.payment_schedules.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const contractAmount = site.contract_amount ?? 0;

  return (
    <div className="space-y-7 py-4">
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:wallet" className="text-lg text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold">Payment Configuration</h3>
            <p className="text-[11px] text-slate-500">
              Configure payment terms and contractual amounts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Payment Frequency
            </label>
            <select
              value={site.payment_frequency}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "payment_frequency",
                  e.target.value as PaymentFrequency,
                )
              }
              className={inputClass}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Payment Currency
            </label>
            <select
              value={site.payment_currency}
              disabled={isReadonly}
              onChange={(e) => updateSite("payment_currency", e.target.value)}
              className={inputClass}
            >
              <option value="GBP">GBP - British Pound</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Contract Amount
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={site.contract_amount ?? ""}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "contract_amount",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={inputClass}
            />
            {errors["contract_amount"] && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors["contract_amount"]}
              </p>
            )}
          </div>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <input
                type="checkbox"
                checked={site.allow_partial_payments}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("allow_partial_payments", e.target.checked)
                }
                className="h-4 w-4 accent-emerald-600"
              />
              <div>
                <p className="text-xs font-semibold">Allow Partial Payments</p>
                <p className="text-[11px] text-slate-500">
                  Accept payments against outstanding balances
                </p>
              </div>
            </label>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium">
              Payment Terms / Notes
            </label>
            <textarea
              rows={3}
              value={site.payment_notes}
              disabled={isReadonly}
              onChange={(e) => updateSite("payment_notes", e.target.value)}
              className={inputClass}
              placeholder="Enter payment terms, quarterly arrangements or contractual notes..."
            />
          </div>
        </div>
      </section>

      {contractAmount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium">Contract Schedule Coverage</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Total scheduled amount against contract value
              </p>
            </div>

            <p className="text-sm font-bold tabular-nums">
              {((scheduledTotal / contractAmount) * 100).toFixed(1)}%
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{
                width: `${Math.min(
                  100,
                  (scheduledTotal / contractAmount) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <SitePaymentSchedule
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />
    </div>
  );
}
 */