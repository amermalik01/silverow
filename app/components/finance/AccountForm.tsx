// app/components/finance/AccountForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------------- CONSTANT LEGACY MAPPINGS ---------------- */
const LEGACY_STRUCTURE = {
  ASSET: [
    { code: "1001", name: "Non-Current Assets" },
    { code: "1501", name: "Current Assets" },
  ],
  LIABILITY: [
    { code: "2501", name: "Current Liabilities" },
    { code: "2901", name: "Non-Current Liabilities" },
  ],
  EQUITY: [],
  REVENUE: [
    { code: "4001", name: "Sales" },
    { code: "4300", name: "Other Income" },
  ],
  EXPENSE: [
    { code: "4510", name: "Direct Expenses" },
    { code: "5100", name: "Overheads" },
  ],
} as const;

type AccountTypeKeys = keyof typeof LEGACY_STRUCTURE;

/* ---------------- EXPLICIT TYPING INTERFACES ---------------- */
interface LookupAccount {
  id: string;
  code: string;
  name: string;
  gl_account_type:
    | "Category"
    | "Sub-Category"
    | "Heading"
    | "Posting"
    | "End Total";
  parent_id?: string | null;
}

interface VatRateLookup {
  id: string;
  name: string;
  rate: number;
}

type Props = {
  slug: string;
  id?: string; // If present: Update Mode. If absent: Create Mode.
};

export default function AccountForm({ slug, id }: Props) {
  const router = useRouter();
  const isEditMode = !!id;

  const [lookupAccounts, setLookupAccounts] = useState<LookupAccount[]>([]);
  const [vatRates, setVatRates] = useState<VatRateLookup[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    code: "",
    name: "",
    account_type: "ASSET" as AccountTypeKeys,
    gl_account_type: "Posting",
    category_id: "",
    sub_category_id: "",
    heading_id: "",
    gl_no_display_as: "",
    vat_rate_id: "",
    status: "Active",
    range_start_code: "",
    range_end_code: "",
  });

  /* ---------------- DATA HYDRATION ---------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        // Core lookups are loaded for both modes
        const endpoints = [
          fetch("/api/finance/accounts"),
          fetch("/api/setup/vat-rates"),
        ];

        // Append the lookups fetch only if editing an existing entity
        if (isEditMode) {
          endpoints.push(fetch(`/api/finance/accounts/${id}`));
        }

        const responses = await Promise.all(endpoints);
        const accData: LookupAccount[] = await responses[0].json();
        const vatData: VatRateLookup[] = await responses[1].json();

        setLookupAccounts(accData);
        setVatRates(vatData);

        if (isEditMode && responses[2]) {
          const current = await responses[2].json();

          // Walk back up the parent hierarchy references to pre-fill dependent drop-downs
          let inferredCategoryId = "";
          let inferredSubCategoryId = "";
          let inferredHeadingId = "";

          if (current.parent_id) {
            const directParent = accData.find(
              (a) => a.id === current.parent_id,
            );
            if (directParent) {
              if (directParent.gl_account_type === "Heading") {
                inferredHeadingId = directParent.id;
                if (directParent.parent_id) {
                  const subParent = accData.find(
                    (a) => a.id === directParent.parent_id,
                  );
                  if (subParent) {
                    inferredSubCategoryId = subParent.id;
                    if (subParent.parent_id)
                      inferredCategoryId = subParent.parent_id;
                  }
                }
              } else if (directParent.gl_account_type === "Sub-Category") {
                inferredSubCategoryId = directParent.id;
                if (directParent.parent_id)
                  inferredCategoryId = directParent.parent_id;
              } else if (directParent.gl_account_type === "Category") {
                inferredCategoryId = directParent.id;
              }
            }
          }

          setForm({
            code: current.code || "",
            name: current.name || "",
            account_type: (current.account_type || "ASSET") as AccountTypeKeys,
            gl_account_type: current.gl_account_type || "Posting",
            category_id: inferredCategoryId,
            sub_category_id: inferredSubCategoryId,
            heading_id: inferredHeadingId,
            gl_no_display_as: current.gl_no_display_as || "",
            vat_rate_id: current.vat_rate_id || "",
            status: current.status || "Active",
            range_start_code: current.range_start_code || "",
            range_end_code: current.range_end_code || "",
          });
        }
      } catch (err) {
        console.error(
          "Failed handling chart of accounts component state initialization.",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  /* ---------------- FORM EVENT HANDLERS ---------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Reset sub-tier targets if the layout anchor dependencies change
    if (name === "account_type") {
      setForm((prev) => ({
        ...prev,
        account_type: value as AccountTypeKeys,
        category_id: "",
        sub_category_id: "",
        heading_id: "",
      }));
    } else if (name === "category_id") {
      setForm((prev) => ({
        ...prev,
        category_id: value,
        sub_category_id: "",
        heading_id: "",
      }));
    } else if (name === "sub_category_id") {
      setForm((prev) => ({ ...prev, sub_category_id: value, heading_id: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const targetUrl = isEditMode
      ? `/api/finance/accounts/${id}`
      : "/api/finance/accounts";
    const targetMethod = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(targetUrl, {
        method: targetMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push(`/${slug}/finance/chart-of-accounts`);
        router.refresh();
      } else {
        const errData = await res.json();
        alert(
          errData.error ||
            `Execution failed during ${targetMethod} network transport routing.`,
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        "Error committing operational updates onto database server instances.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <p className="p-6 text-sm text-gray-500 font-sans">
        Syncing financial record layouts...
      </p>
    );

  // Filter static hardcoded subcategories matched to the selected top-level classification
  const availableSubCategories = LEGACY_STRUCTURE[form.account_type] || [];

  return (
    <div className="bg-white border rounded-xl shadow-md max-w-4xl mx-auto overflow-hidden font-sans text-xs text-gray-700">
      <div className="bg-gray-50 border-b p-3 font-semibold text-center text-sm text-gray-800 tracking-wide">
        {isEditMode
          ? "G/L Ledger Entry: Modification Terminal"
          : "G/L Ledger Entry: Provision Terminal"}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-2 gap-5 bg-white"
      >
        {/* Left Column Controls */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Account Classification Type{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              name="account_type"
              value={form.account_type}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-white font-medium border-blue-400 outline-none"
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Core Legacy Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none"
            >
              <option value="">Select Category Block</option>
              {availableSubCategories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.code} - {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Dynamic Sub-Category Grouping
            </label>
            <select
              name="sub_category_id"
              value={form.sub_category_id}
              onChange={handleChange}
              disabled={!form.category_id}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none disabled:bg-gray-100"
            >
              <option value="">Select Group Node</option>
              {lookupAccounts
                .filter(
                  (a) => a.gl_account_type === "Sub-Category" && a.id !== id,
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Dynamic Structural Heading
            </label>
            <select
              name="heading_id"
              value={form.heading_id}
              onChange={handleChange}
              disabled={!form.sub_category_id}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none disabled:bg-gray-100"
            >
              <option value="">Select Heading Parent</option>
              {lookupAccounts
                .filter((a) => a.gl_account_type === "Heading" && a.id !== id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Node Target Assignment Type{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              name="gl_account_type"
              value={form.gl_account_type}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-white outline-none"
            >
              <option value="Category">Category</option>
              <option value="Sub-Category">Sub-Category</option>
              <option value="Heading">Heading</option>
              <option value="Posting">Posting</option>
              <option value="End Total">End Total</option>
            </select>
          </div>

          {form.gl_account_type === "End Total" && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-yellow-50/50 border border-yellow-200 rounded-lg">
              <div>
                <label className="block font-medium text-amber-800 mb-1">
                  Range Start Code
                </label>
                <input
                  type="text"
                  name="range_start_code"
                  value={form.range_start_code}
                  onChange={handleChange}
                  className="w-full border p-2 rounded bg-white outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-amber-800 mb-1">
                  Range End Code
                </label>
                <input
                  type="text"
                  name="range_end_code"
                  value={form.range_end_code}
                  onChange={handleChange}
                  className="w-full border p-2 rounded bg-white outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column Fields */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Account Display Title Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full border p-2 rounded outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              G/L Account Number Reference{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              required
              value={form.code}
              onChange={handleChange}
              className="w-full border p-2 rounded font-mono outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Custom Display Mapping Override (Alias)
            </label>
            <input
              type="text"
              name="gl_no_display_as"
              value={form.gl_no_display_as}
              onChange={handleChange}
              className="w-full border p-2 rounded outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              VAT Transaction Posting Rate Rule
            </label>
            <select
              name="vat_rate_id"
              value={form.vat_rate_id}
              onChange={handleChange}
              disabled={form.gl_account_type === "End Total"}
              className="w-full border p-2 rounded outline-none disabled:bg-gray-100"
            >
              <option value="">Select VAT Rate</option>
              {vatRates.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.rate}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Record Operational Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border p-2 rounded outline-none"
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Form Submission Actions Panel */}
        <div className="col-span-2 border-t pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/finance/chart-of-accounts`)}
            className="px-4 py-1.5 border rounded hover:bg-gray-50 tracking-wide font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-1.5 bg-blue-700 text-white rounded shadow hover:bg-blue-800 tracking-wide font-semibold disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : isEditMode
                ? "Save Changes"
                : "Create G/L Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
