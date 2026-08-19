// app/components/finance/CreateAccountForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
}

interface VatRateLookup {
  id: string;
  name: string;
  rate: number;
}

export default function CreateAccountForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [lookupAccounts, setLookupAccounts] = useState<LookupAccount[]>([]);
  const [vatRates, setVatRates] = useState<VatRateLookup[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    async function initFormData() {
      const [accRes, vatRes] = await Promise.all([
        fetch("/api/finance/accounts"),
        fetch("/api/setup/vat-rates"),
      ]);
      if (accRes.ok) setLookupAccounts(await accRes.json());
      if (vatRes.ok) setVatRates(await vatRes.json());
    }
    initFormData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        router.push(`/${slug}/finance/chart-of-accounts`);
      } else {
        const data = await response.json();
        alert(data.error || "Execution engine mutation failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-md max-w-4xl mx-auto overflow-hidden font-sans text-xs text-gray-700">
      <div className="bg-gray-50 border-b p-3 font-semibold text-center text-xs text-gray-800 tracking-wide">
        G/L No. Configuration Terminal
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-2 gap-5 bg-white"
      >
        {/* Left Matrix Column */}
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
                .filter((a) => a.gl_account_type === "Category")
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
                .filter((a) => a.gl_account_type === "Sub-Category")
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
                .filter((a) => a.gl_account_type === "Heading")
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

        {/* Right Matrix Column */}
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
              VAT Rate <span className="text-red-500">*</span>
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

        {/* Submission Panel */}
        <div className="col-span-2 border-t pt-4 flex justify-end gap-3">
          <Button
            type="button"
            onClick={() => router.push(`/${slug}/finance/chart-of-accounts`)}
            className="px-4 py-1.5 border rounded hover:bg-gray-50 tracking-wide font-medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="px-5 py-1.5 bg-green-700 text-white rounded shadow hover:bg-green-800 tracking-wide font-semibold disabled:opacity-50"
          >
            {loading ? "Processing..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
