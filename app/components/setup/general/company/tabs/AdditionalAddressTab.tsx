// app/components/setup/general/company/tabs/AdditionalAddressTab.tsx

"use client";

import React, { useEffect, useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<"list" | "form">("list");
  const [current, setCurrent] = useState<Partial<AdditionalAddress>>({});

  // Fetch addresses on mount
  useEffect(() => {
    fetch("/api/setup/general/company/addresses")
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses) setAddresses(data.addresses);
      })
      .catch((err) => console.error("Error loading addresses:", err));
  }, []);

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current.name) return;

    const method = current.id ? "PUT" : "POST";

    try {
      const res = await fetch("/api/setup/general/company/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (current.id) {
        setAddresses((prev) =>
          prev.map((addr) => (addr.id === current.id ? data.address : addr)),
        );
      } else {
        setAddresses((prev) => [data.address, ...prev]);
      }

      setCurrent({});
      setMode("list");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save address");
    }
  };

  // Edit Handler
  const handleEdit = (addr: AdditionalAddress) => {
    setCurrent(addr);
    setMode("form");
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`/api/setup/general/company/addresses?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete address");
    }
  };

  const filteredAddresses = addresses.filter(
    (addr) =>
      addr.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {mode === "list" ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search addresses..."
              className="border px-3 py-1.5 rounded w-64 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Button
              type="button"
              onClick={() => {
                setCurrent({});
                setMode("form");
              }}
              variant="add_line"
              // className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded text-xs font-medium"
            >
              Add
            </Button>
          </div>
          {filteredAddresses.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border rounded bg-gray-50 text-xs">
              {addresses.length === 0
                ? 'No additional addresses recorded. Click "Add" above to add one.'
                : "No addresses found matching your search."}
            </div>
          ) : (
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left table-fixed text-xs border-collapse">
                <thead className="bg-gray-100 border-b text-gray-700">
                  <tr>
                    <th className="p-2.5 font-semibold">Name</th>
                    <th className="p-2.5 font-semibold">Contact Person</th>
                    <th className="p-2.5 font-semibold">City</th>
                    <th className="p-2.5 font-semibold">Telephone</th>
                    <th className="p-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAddresses.map((addr) => (
                    <tr key={addr.id || addr.name} className="hover:bg-gray-50">
                      <td className="p-2.5 font-medium text-gray-900">
                        {addr.name}
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {addr.contact_person || "-"}
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {addr.city || "-"}
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {addr.telephone || "-"}
                      </td>
                      <td className="p-2.5 text-right space-x-3">
                        <Button
                          type="button"
                          onClick={() => handleEdit(addr)}
                          variant="edit"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          onClick={() => addr.id && handleDelete(addr.id)}
                          variant="cancel"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-base font-semibold text-gray-800">
              {current.id
                ? "Edit Additional Address"
                : "Add Additional Address"}
            </h3>
          </div>

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
            <Button
              type="submit"
              variant="save"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={() => setMode("list")}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
