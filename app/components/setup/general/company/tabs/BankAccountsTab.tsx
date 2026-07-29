// app/components/setup/general/company/tabs/BankAccountsTab.tsx

"use client";

import React, { useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";

interface BankAccount {
  id?: string;
  account_name: string;
  preferred_name: string;
  sort_code: string;
  account_no: string;
  swift_code: string;
  iban: string;
  currency: string;
  gl_no: string;
  bank_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  contact_name: string;
  mobile: string;
  telephone: string;
  fax: string;
  email: string;
}

export default function BankAccountsTab() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [current, setCurrent] = useState<Partial<BankAccount>>({});

  return (
    <div className="space-y-4">
      {mode === "list" ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Search bank accounts..."
              className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => {
                setCurrent({});
                setMode("form");
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded font-medium"
            >
              Add
            </button>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2 font-semibold">Preferred Name</th>
                  <th className="p-2 font-semibold">Bank Name</th>
                  <th className="p-2 font-semibold">Currency</th>
                  <th className="p-2 font-semibold">Account Name</th>
                  <th className="p-2 font-semibold">Sort Code</th>
                  <th className="p-2 font-semibold">Account No.</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No bank account configuration registered.
                    </td>
                  </tr>
                ) : (
                  bankAccounts.map((bank, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{bank.preferred_name}</td>
                      <td className="p-2">{bank.bank_name}</td>
                      <td className="p-2">{bank.currency}</td>
                      <td className="p-2">{bank.account_name}</td>
                      <td className="p-2">{bank.sort_code}</td>
                      <td className="p-2">{bank.account_no}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMode("list");
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.account_name || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, account_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Preferred Name
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.preferred_name || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, preferred_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Sort Code</label>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="border px-2.5 py-1.5 rounded w-full"
                    value={current.sort_code || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, sort_code: e.target.value })
                    }
                  />
                  <label className="font-medium text-gray-700 whitespace-nowrap">
                    Account No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="border px-2.5 py-1.5 rounded w-full"
                    value={current.account_no || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, account_no: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Swift Code / BIC
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.swift_code || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, swift_code: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">IBAN</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.iban || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, iban: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Currency</label>
                <select
                  className="col-span-2 border px-2.5 py-1.5 rounded bg-white"
                  value={current.currency || "British Pound"}
                  onChange={(e) =>
                    setCurrent({ ...current, currency: e.target.value })
                  }
                >
                  <option value="British Pound">British Pound</option>
                  <option value="US Dollar">US Dollar</option>
                  <option value="Euro">Euro</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">G/L No.</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.gl_no || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, gl_no: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.bank_name || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, bank_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Address Line 1
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.address_line1 || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, address_line1: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Address Line 2
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.address_line2 || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, address_line2: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <span />
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    className="border px-2.5 py-1.5 rounded"
                    value={current.city || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, city: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="County"
                    className="border px-2.5 py-1.5 rounded"
                    value={current.county || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, county: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <span />
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Postcode"
                    className="border px-2.5 py-1.5 rounded"
                    value={current.postal_code || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, postal_code: e.target.value })
                    }
                  />
                  <MasterDropdown
                    type="country"
                    value={current.country_code || "Select Country"}
                    onChange={(val) =>
                      setCurrent((prev) => ({
                        ...prev,
                        country_code: val || "",
                      }))
                    }
                    className="border px-2.5 py-1.5 rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Contact Name
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.contact_name || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, contact_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Mobile</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.mobile || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, mobile: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Telephone</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.telephone || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, telephone: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Fax</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.fax || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, fax: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="e.g. myname@example.com"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.email || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, email: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="submit"
              className="border border-emerald-700 text-emerald-800 hover:bg-emerald-50 px-5 py-1.5 rounded font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setMode("list")}
              className="border border-gray-300 hover:bg-gray-50 px-5 py-1.5 rounded font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
