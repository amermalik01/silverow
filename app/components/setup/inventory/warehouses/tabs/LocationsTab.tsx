// app/components/setup/inventory/warehouses/tabs/LocationsTab.tsx

"use client";

import { WarehouseLocation } from "@/types/warehouse";
import LocationForm from "./LocationForm";
import { useState } from "react";

// type Props = {
//   warehouseId: string;
//   locations: WarehouseLocation[];
//   setLocations: (data: WarehouseLocation[]) => void;
// };

type Props = {
  warehouseId: string;
  locations: WarehouseLocation[];
  setLocations: React.Dispatch<React.SetStateAction<WarehouseLocation[]>>;
};

export default function LocationsTab({
  warehouseId,
  locations,
  setLocations,
}: Props) {
  const [activeParent, setActiveParent] = useState<string | null | undefined>(
    undefined,
  );

  const [editLocation, setEditLocation] = useState<WarehouseLocation | null>(
    null,
  );

  /* const buildTree = (parentId: string | null = null) => {
    return locations
      .filter((l) => l.parent_id === parentId)
      .map((loc) => (
        <div key={loc.id} className="ml-4 border-l pl-4">
          <div className="flex justify-between items-center py-1">
            <span>{loc.title}</span>

            <button
              onClick={() => setActiveParent(loc.id)}
              className="text-blue-600 text-sm"
            >
              + Add
            </button>
          </div>

          {buildTree(loc.id)}
        </div>
      ));
  }; */

  const buildTree = (parentId: string | null = null) => {
    return locations
      .filter((l) => l.parent_id === parentId)
      .map((loc) => (
        <div key={loc.id} className="ml-4 border-l pl-4">
          <div className="flex justify-between items-center py-1">
            <span>{loc.title}</span>

            <div className="flex gap-2 text-sm">
              <button
                onClick={() => {
                  setActiveParent(loc.id);
                  setEditLocation(null);
                }}
                className="text-blue-600"
              >
                + Add
              </button>

              <button
                onClick={() => {
                  setEditLocation(loc);
                  setActiveParent(null);
                }}
                className="text-green-600"
              >
                ✏ Edit
              </button>

              <button
                onClick={() => handleDelete(loc.id)}
                className="text-red-600"
              >
                🗑
              </button>
            </div>
          </div>

          {buildTree(loc.id)}
        </div>
      ));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location?")) return;

    const res = await fetch(
      `/api/setup/warehouses/${warehouseId}/locations/${id}`,
      {
        method: "DELETE",
      },
    );

    if (res.ok) {
      setLocations(locations.filter((l) => l.id !== id));
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-2">Location Tree</h3>

      {/* ROOT ADD */}
      <button
        onClick={() => {
          setActiveParent(null);
          setEditLocation(null);
        }}
        className="mb-3 bg-blue-600 text-white px-3 py-1 rounded"
      >
        + Root Location
      </button>

      {/* FORM */}
      {(activeParent !== undefined || editLocation) && (
        <LocationForm
          warehouseId={warehouseId}
          parentId={activeParent}
          existing={editLocation || undefined}
          onSuccess={(loc) => {
            setLocations((prev) =>
              prev.map((l) => (l.id === loc.id ? loc : l)),
            );
            setActiveParent(null);
            setEditLocation(null);
          }}
        />
      )}

      {/* TREE */}
      <div>{buildTree(null)}</div>
    </div>
  );
}
