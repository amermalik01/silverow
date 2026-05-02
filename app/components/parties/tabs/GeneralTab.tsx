// components/parties/tabs/GeneralTab.tsx

"use client";

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

  /* =========================
     SAFE FIELD UPDATE
  ========================= */
  const updateField = <K extends keyof Party>(
    key: K,
    value: Party[K],
  ) => {
    setAccount((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* =========================
     VALIDATION (optional trigger)
  ========================= */
  const validateField = () => {
    const result = PartySchema.safeParse(account);

    if (!result.success) {
      console.warn(result.error.flatten().fieldErrors);
    }

    return result.success;
  };

  return (
    <div className="space-y-6">

      {/* =========================
          GENERAL
      ========================= */}
      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          General Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* CODE (CRM/SRM AUTO) */}
          <div>
            <label className="text-sm font-medium">Code</label>
            <input
              value={
                account.crm_code ||
                account.srm_code ||
                account.customer_code ||
                ""
              }
              disabled
              className="border p-2 rounded w-full bg-gray-100"
              placeholder="Auto Generated"
            />
          </div>

          {/* NAME */}
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

          {/* EMAIL */}
          <div>
            <label>Email</label>
            <input
              value={account.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* PHONE */}
          <div>
            <label>Phone</label>
            <input
              value={account.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              disabled={isReadonly}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* WEBSITE */}
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

      {/* =========================
          ADDRESS
      ========================= */}
      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Primary Address
        </h2>

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
              onChange={(e) =>
                updateField("is_billing", e.target.checked)
              }
            />
            Billing
          </label>

          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={account.is_shipping || false}
              onChange={(e) =>
                updateField("is_shipping", e.target.checked)
              }
            />
            Shipping
          </label>
        </div>
      </div>

      {/* =========================
          BUSINESS
      ========================= */}
      <div className="p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Business Info
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            type="number"
            placeholder="Credit Limit"
            value={account.credit_limit || ""}
            onChange={(e) =>
              updateField("credit_limit", Number(e.target.value))
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
            onChange={(e) =>
              updateField("salesperson_id", e.target.value)
            }
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