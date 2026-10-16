// app/components/setup/finance/GlobalFinanceSetupForm.tsx

"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function AccountSelectField({
  accounts,
  value,
  onChange,
  placeholder = "-- Select Account --",
}: {
  accounts: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAccounts = accounts.filter((acc) =>
    acc.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        searchable
        searchPlaceholder="Search by code or name..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredAccounts.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No accounts found.
          </div>
        ) : (
          filteredAccounts.map((acc) => (
            <SelectItem key={acc.value} value={acc.value}>
              {acc.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default function GlobalFinanceSetupForm() {
  const [accounts, setAccounts] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [formData, setFormData] = useState({
    vat_payable_receivable_account_id: "",
    vat_deferred_account_id: "",
    opening_balance_stock_account_id: "",
    opening_balance_equity_account_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/setup/finance/accounts/options").then((r) => r.json()),
      fetch("/api/setup/finance/global-setup").then((r) => r.json()),
    ])
      .then(([accountOpts, setupData]) => {
        setAccounts(accountOpts);
        if (setupData) {
          setFormData({
            vat_payable_receivable_account_id:
              setupData.vat_payable_receivable_account_id || "",
            vat_deferred_account_id: setupData.vat_deferred_account_id || "",
            opening_balance_stock_account_id:
              setupData.opening_balance_stock_account_id || "",
            opening_balance_equity_account_id:
              setupData.opening_balance_equity_account_id || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/setup/finance/global-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) alert("Setup saved successfully!");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-4 text-xs text-slate-500">Loading setup...</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-white border-b pb-3">
        VAT & Opening Balances Global Accounts Setup
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VAT Settlement Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold capitalize tracking-wider text-slate-400">
            VAT Settlement Accounts
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              VAT Payable / Receivable
            </label>

            <AccountSelectField
              accounts={accounts}
              value={formData.vat_payable_receivable_account_id}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  vat_payable_receivable_account_id: val,
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              VAT Deferred Account
            </label>
            <AccountSelectField
              accounts={accounts}
              value={formData.vat_deferred_account_id}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  vat_deferred_account_id: val,
                })
              }
            />
          </div>
        </div>

        {/* Opening Balances Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold capitalize tracking-wider text-slate-400">
            Opening Balances G/L Setup
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Stock Account
            </label>
            <AccountSelectField
              accounts={accounts}
              value={formData.opening_balance_stock_account_id}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  opening_balance_stock_account_id: val,
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Opening Balance Offset / Equity Account
            </label>
            <AccountSelectField
              accounts={accounts}
              value={formData.opening_balance_equity_account_id}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  opening_balance_equity_account_id: val,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
