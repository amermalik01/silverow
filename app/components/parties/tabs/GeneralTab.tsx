// components/parties/tabs/GeneralTab.tsx

"use client";

import type { Party } from "@/types/erp";

// Structure matches your raw SQL select result
export type CompanyCurrency = {
  id: number;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type Props = {
  account: Partial<Party>;
  setAccount: React.SetStateAction<React.Dispatch<Partial<Party>>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  currencies?: CompanyCurrency[]; // Received from parent data-fetchers
};

export default function GeneralTab({
  account,
  setAccount,
  isReadonly = false,
  errors,
  currencies = [],
}: Props) {
  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={account.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
            className={`w-full border p-2.5 rounded-lg text-sm bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white ${
              errors["general.name"]
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
            placeholder="Legal Enterprise Entity Name"
          />
          {errors["general.name"] && (
            <p className="text-red-500 text-xs mt-1">
              {errors["general.name"]}
            </p>
          )}
        </div>

        <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Account Classification
            </h3>
            <p className="text-xs text-slate-500">
              This record is being configured globally with the following system
              privileges.
            </p>
          </div>
          <div className="flex gap-2">
            {account.is_customer && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
                Customer
              </span>
            )}
            {account.is_crm_lead && (
              <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-xs font-semibold dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900">
                CRM Lead
              </span>
            )}
            {account.is_supplier && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-semibold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                Supplier
              </span>
            )}
            {account.is_srm_vendor && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-semibold dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                SRM Vendor
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Email
          </label>
          <input
            type="email"
            value={account.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full border p-2.5 border-slate-300 dark:border-slate-700 dark:bg-transparent rounded-lg text-sm text-slate-900 dark:text-white"
            placeholder="corporate@domain.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Phone Line
          </label>
          <input
            type="text"
            value={account.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full border p-2.5 border-slate-300 dark:border-slate-700 dark:bg-transparent rounded-lg text-sm text-slate-900 dark:text-white"
            placeholder="Main Switchboard Connection"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Corporate Website
          </label>
          <input
            type="text"
            value={account.website || ""}
            onChange={(e) => updateField("website", e.target.value)}
            className="w-full border p-2.5 border-slate-300 dark:border-slate-700 dark:bg-transparent rounded-lg text-sm text-slate-900 dark:text-white"
            placeholder="https://example.com"
          />
        </div>

        {/* Currency Dropdown Block */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Operating Currency
          </label>
          <select
            disabled={isReadonly}
            value={account.currency_id || ""}
            onChange={(e) =>
              updateField(
                "currency_id",
                (e.target.value
                  ? Number(e.target.value)
                  : null) as unknown as Party["currency_id"],
              )
            }
            className="w-full border p-2.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Account Currency...</option>
            {currencies.map((curr) => (
              <option key={curr.id} value={curr.id}>
                {curr.code} - {curr.name} {curr.is_base ? "(Base)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Credit Limit Ceiling
          </label>
          <input
            type="number"
            value={account.credit_limit ?? 0}
            onChange={(e) =>
              updateField("credit_limit", Math.max(0, Number(e.target.value)))
            }
            className="w-full border p-2.5 border-slate-300 dark:border-slate-700 dark:bg-transparent rounded-lg text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

/* 

        <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            System Operational Role Matrices Visibility
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { field: "is_crm_lead", label: "CRM Prospect" },
              { field: "is_customer", label: "Active Customer" },
              { field: "is_srm_vendor", label: "SRM Managed Account" },
              { field: "is_supplier", label: "Active Supplier / Vendor" },
            ].map((role) => (
              <label key={role.field} className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(account[role.field as keyof Party])}
                  onChange={(e) => updateField(role.field as keyof Party, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>
*/
/* "use client";

import type { Party } from "@/types/erp";
import { PartySchema } from "@/lib/validations/party.schema";

type Props = {
  account: Partial<Party>;

  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;

  isReadonly?: boolean;
};

export default function GeneralTab({
  account,
  setAccount,
  isReadonly = false,
}: Props) {

  const isEditMode = !!account.id;

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({
      ...(prev || {}),
      [key]: value,
    }));
  };

  const validateField = () => {
    const result = PartySchema.safeParse(account);

    if (!result.success) {
      console.warn(result.error.flatten().fieldErrors);
    }

    return result.success;
  };

  return (
    <div className="space-y-6 container mx-auto p-4 bg-white dark:bg-slate-900 border rounded-xl ">

      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          General Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium">Code</label>
            <input
              value={
                account.crm_code ||
                account.srm_code ||
                account.customer_code ||
                account.supplier_code ||
                ""
              }
              disabled
              className="border p-2 rounded w-full bg-gray-100"
              placeholder="Auto Generated"
            />
          </div>


          <div className="col-span-2">
            <label className="text-sm font-medium">Name *</label>
            <input
              value={account.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
              required
            />
          </div>


          <div>
            <label>Email</label>
            <input
              value={account.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>


          <div>
            <label>Phone</label>
            <input
              value={account.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          <div className="col-span-2">
            <label>Website</label>
            <input
              value={account.website || ""}
              onChange={(e) => updateField("website", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
      </div>


      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Primary Address</h2>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Address Line 1"
            value={account.address_1 || ""}
            onChange={(e) => updateField("address_1", e.target.value)}
            disabled={isReadonly}
            className="border p-2 rounded w-full col-span-2"
          />

          <input
            placeholder="City"
            value={account.city || ""}
            onChange={(e) => updateField("city", e.target.value)}
            disabled={isReadonly}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="County"
            value={account.county || ""}
            onChange={(e) => updateField("county", e.target.value)}
            disabled={isReadonly}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Postcode"
            value={account.postcode || ""}
            onChange={(e) => updateField("postcode", e.target.value)}
            disabled={isReadonly}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Country"
            value={account.country_id || ""}
            onChange={(e) => updateField("country_id", e.target.value)}
            disabled={isReadonly}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex gap-6 pt-2">
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={account.is_billing || false}
              onChange={(e) => updateField("is_billing", e.target.checked)}
            />
            Billing
          </label>

          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={account.is_shipping || false}
              onChange={(e) => updateField("is_shipping", e.target.checked)}
            />
            Shipping
          </label>
        </div>
      </div>


      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Business Info</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Type: {account.type}</label>
          </div>

          <input
            type="number"
            placeholder="Credit Limit"
            value={account.credit_limit || ""}
            onChange={(e) =>
              updateField(
                "credit_limit",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Currency"
            value={account.currency_id || ""}
            onChange={(e) => updateField("currency_id", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Salesperson"
            value={account.salesperson_id || ""}
            onChange={(e) => updateField("salesperson_id", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <select
            value={account.status || "active"}
            onChange={(e) =>
              updateField("status", e.target.value as Party["status"])
            }
            className="border p-2 rounded w-full"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
    </div>
  );
}
 */
