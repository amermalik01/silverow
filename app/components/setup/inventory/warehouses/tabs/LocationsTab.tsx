// app/components/setup/inventory/warehouses/tabs/LocationsTab.tsx

"use client";

import { WarehouseLocation } from "@/types/warehouse";
import { useState } from "react";
import LocationForm from "./LocationForm";
import { Button } from "@/components/ui/button";

type Props = {
  warehouseId: string;
  locations: WarehouseLocation[];
  setLocations: React.Dispatch<React.SetStateAction<WarehouseLocation[]>>;
  isReadOnly?: boolean;
};

export default function LocationsTab({
  warehouseId,
  locations,
  setLocations,
  isReadOnly = false,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<WarehouseLocation | null>(null);
  const [search, setSearch] = useState("");

  const filtered = locations.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <input
          type="text"
          placeholder="Search storage location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-1.5 border border-slate-300 text-sm rounded-md w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {!isReadOnly && (
          <Button
            onClick={() => {
              setShowForm(true);
              setSelectedLocation(null);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm px-4 py-1.5 rounded-md transition-colors"
          >
            + Add
          </Button>
        )}
      </div>

      {/* Dynamic Location Form */}
      {(showForm || selectedLocation) && (
        <LocationForm
          warehouseId={warehouseId}
          existing={selectedLocation || undefined}
          isReadOnly={isReadOnly}
          onClose={() => {
            setShowForm(false);
            setSelectedLocation(null);
          }}
          onSuccess={(loc) => {
            setLocations((prev) => {
              const filteredList = prev.filter((x) => x.id !== loc.id);
              return [...filteredList, loc];
            });
            setShowForm(false);
            setSelectedLocation(null);
          }}
        />
      )}

      {/* Storage Locations List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-xs capitalize tracking-wider">
              <th className="px-4 py-3">Storage Location</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">Unit Of Measure</th>
              <th className="px-4 py-3">Cost Frequency</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400 text-xs"
                >
                  No storage locations added yet.
                </td>
              </tr>
            ) : (
              filtered.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {loc.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {loc.start_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {loc.unit_of_measure || "Pcs"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {loc.cost_frequency || "Weekly"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {loc.currency || "GBP"}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-mono font-medium">
                    {loc.cost ?? "0.00"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-xs">
                    <Button
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowForm(false);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      {isReadOnly ? "View" : "Edit"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
