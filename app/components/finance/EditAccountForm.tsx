// app/components/finance/EditAccountForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  id: string;
};

export default function EditAccountForm({ slug, id }: Props) {
  const router = useRouter();

  const [lookupAccounts, setLookupAccounts] = useState<LookupAccount[]>([]);
  const [vatRates, setVatRates] = useState<VatRateLookup[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    code: "",
    name: "",
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

  /* ---------------- LOAD & HYDRATE COMPONENT DATA ---------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, vatRes, currentRes] = await Promise.all([
          fetch("/api/finance/accounts"),
          fetch("/api/setup/vat-rates"),
          fetch(`/api/finance/accounts/${id}`),
        ]);

        const accData: LookupAccount[] = await accRes.json();
        const vatData: VatRateLookup[] = await vatRes.json();
        const current = await currentRes.json();

        setLookupAccounts(accData);
        setVatRates(vatData);

        // Intelligently infer layout hierarchy positions from current parent configurations
        let inferredCategoryId = "";
        let inferredSubCategoryId = "";
        let inferredHeadingId = "";

        if (current.parent_id) {
          const directParent = accData.find((a) => a.id === current.parent_id);
          if (directParent) {
            if (directParent.gl_account_type === "Heading") {
              inferredHeadingId = directParent.id;
              // Drill upward to capture sub-category node trace contexts
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
      } catch (err) {
        console.error(
          "Critical breakdown tracking component mutation inputs.",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  /* ---------------- FORM CHANGE HANDLER ---------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------------- SUBMIT TRANSACTION TO UPDATE API ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push(`/${slug}/finance/chart-of-accounts`);
      } else {
        const errData = await res.json();
        alert(errData.error || "Update operational mutation failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating structural matrix.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <p className="p-6 text-xs text-gray-500">
        Hydrating ledger component tree fields...
      </p>
    );

  return (
    <div className="bg-white border rounded-xl shadow-md max-w-4xl mx-auto overflow-hidden font-sans text-xs text-gray-700">
      <div className="bg-gray-50 border-b p-3 font-semibold text-center text-xs text-gray-800 tracking-wide">
        G/L No. Structural Modification Terminal
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-2 gap-5 bg-white"
      >
        {/* Left Column Hierarchy Controls */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none"
            >
              <option value="">Select Category</option>
              {lookupAccounts
                .filter((a) => a.gl_account_type === "Category" && a.id !== id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Sub Category <span className="text-red-500">*</span>
            </label>
            <select
              name="sub_category_id"
              value={form.sub_category_id}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none"
            >
              <option value="">Select Sub Category</option>
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
              Heading
            </label>
            <select
              name="heading_id"
              value={form.heading_id}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-gray-50/50 focus:bg-white outline-none"
            >
              <option value="">Select Heading</option>
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
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              name="gl_account_type"
              value={form.gl_account_type}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-white font-medium border-blue-400 outline-none"
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
                  Sum of Range Start
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
                  Sum of Range End
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

        {/* Right Column Operational Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-gray-600 mb-1">
              Name <span className="text-red-500">*</span>
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
              G/L No. <span className="text-red-500">*</span>
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
              G/L No. Display As
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
              VAT Rate
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
              Status <span className="text-red-500">*</span>
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

        {/* Action Panel */}
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
            {loading ? "Updating..." : "Update Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id?: string | null;
  vat_rate_id?: string | null;
  is_summary: boolean;
};

type VatRate = {
  id: string;
  name: string;
  rate: number;
};

type Props = {
  slug: string;
  id: string;
};

export default function EditAccountForm({ slug, id }: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    code: "",
    name: "",
    account_type: "ASSET",
    parent_id: "",
    vat_rate_id: "",
    is_summary: false,
  });



  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, vatRes, currentRes] = await Promise.all([
          fetch("/api/finance/accounts"),
          fetch("/api/setup/vat-rates"),
          fetch(`/api/finance/accounts/${id}`),
        ]);

        const accData = await accRes.json();
        const vatData = await vatRes.json();
        const current = await currentRes.json();

        setAccounts(accData);
        setVatRates(vatData);

        setForm({
          code: current.code || "",
          name: current.name || "",
          account_type: current.account_type || "ASSET",
          parent_id: current.parent_id || "",
          vat_rate_id: current.vat_rate_id || "",
          is_summary: current.is_summary ?? false,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      setForm({
        ...form,
        [name]: checked,
        vat_rate_id: checked ? "" : form.vat_rate_id, // clear VAT if summary
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          is_posting: !form.is_summary,
        }),
      });

      if (res.ok) {
        router.push(`/${slug}/finance/chart-of-accounts`);
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating account");
    }
  };

  if (loading) return <p>Loading...</p>;



  return (
    <form
      onSubmit={handleSubmit}
      className=" p-6 rounded shadow dark:shadow-white space-y-4 max-w-xl"
    >

      <input
        name="code"
        value={form.code}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />


      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />


      <select
        name="account_type"
        value={form.account_type || ""}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="ASSET">Asset</option>
        <option value="LIABILITY">Liability</option>
        <option value="EQUITY">Equity</option>
        <option value="REVENUE">Revenue</option>
        <option value="EXPENSE">Expense</option>
      </select>


      <select
        name="parent_id"
        value={form.parent_id || ""}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="">None</option>

        {accounts
          .filter((a) => a.is_summary && a.id !== id)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
      </select>


      <select
        name="vat_rate_id"
        value={form.vat_rate_id || ""}
        onChange={handleChange}
        disabled={form.is_summary}
        className="w-full border p-2 rounded"
      >
        <option value="">None</option>

        {vatRates.map((vat) => (
          <option key={vat.id} value={vat.id}>
            {vat.name} ({vat.rate}%)
          </option>
        ))}
      </select>


      <label className="flex gap-2">
        <input
          type="checkbox"
          name="is_summary"
          checked={form.is_summary}
          onChange={handleChange}
        />
        Summary Account
      </label>

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Update Account
      </button>
    </form>
  );
}
 */
