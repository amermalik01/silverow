// app/components/setup/general/company/tabs/AdditionalAddressTab.tsx

"use client";

import React, { useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";

interface AdditionalAddress {
  id?: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  contact_person: string;
  job_title: string;
  mobile: string;
  telephone: string;
  fax: string;
  email: string;
}

export default function AdditionalAddressTab() {
  const [addresses, setAddresses] = useState<AdditionalAddress[]>([]);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [current, setCurrent] = useState<Partial<AdditionalAddress>>({});

  return (
    <div className="space-y-4">
      {mode === "list" ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Search addresses..."
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
          {addresses.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
              No additional addresses recorded. Click &quot;Add&quot; above to
              add one.
            </div>
          ) : (
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 font-semibold">Name</th>
                    <th className="p-2 font-semibold">Contact Person</th>
                    <th className="p-2 font-semibold">City</th>
                    <th className="p-2 font-semibold">Telephone</th>
                  </tr>
                </thead>
                <tbody>
                  {addresses.map((addr, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{addr.name}</td>
                      <td className="p-2">{addr.contact_person}</td>
                      <td className="p-2">{addr.city}</td>
                      <td className="p-2">{addr.telephone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  value={current.name || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Address Line 1
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
                  className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
                    value={current.country_code || "United Kingdom"}
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
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">
                  Contact Person
                </label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.contact_person || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, contact_person: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  className="col-span-2 border px-2.5 py-1.5 rounded"
                  value={current.job_title || ""}
                  onChange={(e) =>
                    setCurrent({ ...current, job_title: e.target.value })
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
