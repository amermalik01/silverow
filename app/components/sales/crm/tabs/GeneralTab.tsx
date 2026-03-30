// app/components/sales/crm/tabs/GeneralTab.tsx

"use client";

import { CRMAccount } from "@/types/crm";

type Props = {
  account: CRMAccount;
  setAccount: React.Dispatch<React.SetStateAction<CRMAccount>>;
  isReadonly?: boolean;
};

export default function GeneralTab({
  account,
  setAccount,
  isReadonly = false,
}: Props) {
  //   const updateField = (key: string, value: any) => {
  //     setAccount((prev: any) => ({
  //       ...prev,
  //       [key]: value,
  //     }));
  //   };

  const isEditMode = !!account.id;

  const updateField = (key: keyof CRMAccount, value: unknown) => {
    setAccount((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* SECTION: General */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          General Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* CRM CODE */}
          <div>
            <label className="text-sm font-medium">CRM Code</label>
            <input
              type="text"
              value={account.crm_code || ""}
              onChange={(e) => updateField("crm_code", e.target.value)}
              disabled={isReadonly || isEditMode}
              className="border p-2 rounded w-full"
              placeholder="Auto / Manual"
            />
          </div>

          {/* CUSTOMER CODE */}
          <div>
            <label className="text-sm font-medium">Customer Code</label>
            <input
              type="text"
              value={account.customer_code || ""}
              disabled
              className="border p-2 rounded w-full bg-gray-100"
              placeholder="Generated on conversion"
            />
          </div>

          {/* NAME */}
          <div className="col-span-2">
            <label className="text-sm font-medium">Name *</label>
            <input
              type="text"
              value={account.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
              required
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={account.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
              placeholder="info@company.com"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              type="text"
              value={account.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* WEBSITE */}
          <div className="col-span-2">
            <label className="text-sm font-medium">Website</label>
            <input
              type="text"
              value={account.website || ""}
              onChange={(e) => updateField("website", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
              placeholder="https://"
            />
          </div>
        </div>
      </div>

      {/* SECTION: Address (Primary) */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Primary Address</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium">Address Line 1</label>
            <input
              type="text"
              value={account.address_1 || ""}
              onChange={(e) => updateField("address_1", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Address Line 2</label>
            <input
              type="text"
              value={account.address_2 || ""}
              onChange={(e) => updateField("address_2", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="City"
              value={account.city || ""}
              onChange={(e) => updateField("city", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="County"
              value={account.county || ""}
              onChange={(e) => updateField("county", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Postcode"
              value={account.postcode || ""}
              onChange={(e) => updateField("postcode", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Country ID"
              value={account.country_id || ""}
              onChange={(e) => updateField("country_id", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>

        {/* Address Flags */}
        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={account.is_billing || false}
              onChange={(e) => updateField("is_billing", e.target.checked)}
              disabled={isReadonly}
            />
            Billing
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={account.is_shipping || false}
              onChange={(e) => updateField("is_shipping", e.target.checked)}
              disabled={isReadonly}
            />
            Shipping
          </label>
        </div>
      </div>

      {/* SECTION: Business Info */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Business Info</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* CREDIT LIMIT */}
          <div>
            <label className="text-sm font-medium">Credit Limit</label>
            <input
              type="number"
              value={account.credit_limit || ""}
              onChange={(e) => updateField("credit_limit", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* CURRENCY */}
          <div>
            <label className="text-sm font-medium">Currency ID</label>
            <input
              type="text"
              value={account.currency_id || ""}
              onChange={(e) => updateField("currency_id", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* SALESPERSON */}
          <div>
            <label className="text-sm font-medium">Salesperson ID</label>
            <input
              type="text"
              value={account.salesperson_id || ""}
              onChange={(e) => updateField("salesperson_id", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={account.status || "active"}
              onChange={(e) => updateField("status", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
