// app/components/energy/sites/components/SitePaymentSchedule.tsx


"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  SitesFormData,
  SitePaymentSchedule as PaymentRow,
  PaymentStatus,
} from "@/types/sites";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

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

const cellClass =
  "border-t border-slate-100 p-2 dark:border-slate-800/60";

const paymentStatuses: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function SitePaymentSchedule({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addPayment = () => {
    const payment: PaymentRow = {
      description: "",
      due_date: "",
      amount: 0,
      paid_amount: 0,
      status: "PENDING",
      reference_no: "",
      paid_date: "",
    };

    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: [...prev.payment_schedules, payment],
    }));
  };

  const updatePayment = (
    index: number,
    changes: Partial<PaymentRow>,
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: prev.payment_schedules.map((payment, i) =>
        i === index ? { ...payment, ...changes } : payment,
      ),
    }));
  };

  const removePayment = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: prev.payment_schedules.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const totalScheduled = site.payment_schedules.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );

  const totalPaid = site.payment_schedules.reduce(
    (sum, row) => sum + Number(row.paid_amount || 0),
    0,
  );

  const totalOutstanding = totalScheduled - totalPaid;

  const formatMoney = (amount: number): string =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: site.payment_currency || "GBP",
    }).format(amount);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Payment Schedule
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage scheduled payments, receipts and outstanding balances.
          </p>
        </div>

        {!isReadonly && (
          <button
            type="button"
            onClick={addPayment}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon icon="lucide:plus" />
            Add Payment
          </button>
        )}
      </div>

      {/* Compact Financial Summary */}
      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-3 lg:grid-cols-3">
        {[
          { label: "Total Scheduled", value: totalScheduled },
          { label: "Total Paid", value: totalPaid },
          { label: "Total Outstanding", value: totalOutstanding },
        ].map((summary) => (
          <div
            key={summary.label}
            className="grid grid-cols-3 items-center gap-2"
          >
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {summary.label}
            </label>
            <div className="col-span-2">
              <div className="w-full rounded border border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100">
                {formatMoney(summary.value)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Grid */}
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[1250px] table-fixed text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="w-12 p-3">#</th>
              <th className="w-[15%] p-3">Description</th>
              <th className="w-[12%] p-3">
                Due Date <span className="text-red-500">*</span>
              </th>
              <th className="w-[12%] p-3">Amount</th>
              <th className="w-[12%] p-3">Paid Amount</th>
              <th className="w-[12%] p-3">Outstanding</th>
              <th className="w-[12%] p-3">Payment Date</th>
              <th className="w-[15%] p-3">Reference</th>
              <th className="w-[12%] p-3">Status</th>
              {!isReadonly && (
                <th className="w-14 p-3 text-center">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {site.payment_schedules.length === 0 ? (
              <tr>
                <td
                  colSpan={isReadonly ? 9 : 10}
                  className="p-8 text-center text-xs text-slate-400"
                >
                  No payment schedules configured.
                </td>
              </tr>
            ) : (
              site.payment_schedules.map((payment, index) => {
                const outstanding =
                  Number(payment.amount || 0) -
                  Number(payment.paid_amount || 0);

                return (
                  <tr
                    key={payment.id ?? `payment-${index}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  >
                    <td className={cellClass}>
                      <span className="font-medium">{index + 1}</span>
                    </td>

                    <td className={cellClass}>
                      <input
                        type="text"
                        value={payment.description}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updatePayment(index, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Quarter 1"
                        className={inputClass}
                      />
                    </td>

                    <td className={cellClass}>
                      <input
                        type="date"
                        value={payment.due_date}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updatePayment(index, {
                            due_date: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                      {errors[`payment_schedules.${index}.due_date`] && (
                        <p className="mt-1 text-[10px] text-red-500">
                          {errors[`payment_schedules.${index}.due_date`]}
                        </p>
                      )}
                    </td>

                    <td className={cellClass}>
                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        min={0}
                        value={payment.amount}
                        disabled={isReadonly}
                        onChange={(value) =>
                          updatePayment(index, { amount: value })
                        }
                        className={inputClass}
                      />
                      {errors[`payment_schedules.${index}.amount`] && (
                        <p className="mt-1 text-[10px] text-red-500">
                          {errors[`payment_schedules.${index}.amount`]}
                        </p>
                      )}
                    </td>

                    <td className={cellClass}>
                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        min={0}
                        max={payment.amount}
                        value={payment.paid_amount}
                        disabled={isReadonly}
                        onChange={(value) =>
                          updatePayment(index, { paid_amount: value })
                        }
                        className={inputClass}
                      />
                      {errors[`payment_schedules.${index}.paid_amount`] && (
                        <p className="mt-1 text-[10px] text-red-500">
                          {errors[`payment_schedules.${index}.paid_amount`]}
                        </p>
                      )}
                    </td>

                    <td className={cellClass}>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-right font-semibold tabular-nums text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                        {formatMoney(outstanding)}
                      </div>
                    </td>

                    <td className={cellClass}>
                      <input
                        type="date"
                        value={payment.paid_date}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updatePayment(index, {
                            paid_date: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </td>

                    <td className={cellClass}>
                      <input
                        type="text"
                        value={payment.reference_no}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updatePayment(index, {
                            reference_no: e.target.value,
                          })
                        }
                        placeholder="Reference"
                        className={inputClass}
                      />
                    </td>

                    <td className={cellClass}>
                      <select
                        value={payment.status}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updatePayment(index, {
                            status: e.target.value as PaymentStatus,
                          })
                        }
                        className={inputClass}
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {!isReadonly && (
                      <td className={`${cellClass} text-center`}>
                        <button
                          type="button"
                          onClick={() => removePayment(index)}
                          aria-label={`Remove payment ${index + 1}`}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        >
                          <Icon icon="lucide:trash-2" className="text-base" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {errors.payment_schedules && (
        <p className="text-xs text-red-500">
          {errors.payment_schedules}
        </p>
      )}
    </section>
  );
}



/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  SitesFormData,
  SitePaymentSchedule as PaymentRow,
  PaymentStatus,
} from "@/types/sites";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs " +
  "outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 " +
  "disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 " +
  "dark:disabled:bg-slate-800/50";

export default function SitePaymentSchedule({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addPayment = () => {
    const payment: PaymentRow = {
      description: "",
      due_date: "",
      amount: 0,
      paid_amount: 0,
      status: "PENDING",
      reference_no: "",
      paid_date: "",
    };

    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: [...prev.payment_schedules, payment],
    }));
  };

  const updatePayment = (
    index: number,
    changes: Partial<PaymentRow>,
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: prev.payment_schedules.map((payment, i) =>
        i === index ? { ...payment, ...changes } : payment,
      ),
    }));
  };

  const removePayment = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      payment_schedules: prev.payment_schedules.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const totalScheduled = site.payment_schedules.reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const totalPaid = site.payment_schedules.reduce(
    (sum, row) => sum + row.paid_amount,
    0,
  );

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: site.payment_currency || "GBP",
    }).format(amount);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon icon="lucide:calendar-days" className="text-emerald-600" />
            Payment Schedule
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Track scheduled, partial and completed payments.
          </p>
        </div>

        {!isReadonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPayment}
            className="gap-1.5 text-xs"
          >
            <Icon icon="lucide:plus" />
            Add Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Scheduled", value: totalScheduled },
          { label: "Paid", value: totalPaid },
          {
            label: "Outstanding",
            value: totalScheduled - totalPaid,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
          >
            <p className="text-[11px] text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(metric.value)}
            </p>
          </div>
        ))}
      </div>

      {site.payment_schedules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
          No payment schedules configured.
        </div>
      )}

      {site.payment_schedules.map((payment, index) => (
        <div
          key={payment.id ?? `payment-${index}`}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold">
              Payment {index + 1}
            </span>

            {!isReadonly && (
              <button
                type="button"
                onClick={() => removePayment(index)}
                className="text-rose-500"
                aria-label={`Remove payment ${index + 1}`}
              >
                <Icon icon="lucide:trash-2" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Description
              </label>
              <input
                type="text"
                value={payment.description}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    description: e.target.value,
                  })
                }
                placeholder="e.g. Quarter 1"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={payment.due_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    due_date: e.target.value,
                  })
                }
                className={inputClass}
              />
              {errors[`payment_schedules.${index}.due_date`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`payment_schedules.${index}.due_date`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Status
              </label>
              <select
                value={payment.status}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    status: e.target.value as PaymentStatus,
                  })
                }
                className={inputClass}
              >
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Amount
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payment.amount}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    amount: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
              {errors[`payment_schedules.${index}.amount`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`payment_schedules.${index}.amount`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Paid Amount
              </label>
              <input
                type="number"
                min={0}
                max={payment.amount}
                step="0.01"
                value={payment.paid_amount}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    paid_amount: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
              {errors[`payment_schedules.${index}.paid_amount`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`payment_schedules.${index}.paid_amount`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Payment Date
              </label>
              <input
                type="date"
                value={payment.paid_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    paid_date: e.target.value,
                  })
                }
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Payment Reference
              </label>
              <input
                type="text"
                value={payment.reference_no}
                disabled={isReadonly}
                onChange={(e) =>
                  updatePayment(index, {
                    reference_no: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="Transaction reference"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Outstanding
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-800">
                {formatMoney(payment.amount - payment.paid_amount)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
} */
