// app/components/common/SelectWithAddModal.tsx

"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

interface Item {
  id: string;
  name: string;
  days?: number; // Optional, for payment terms
}

interface AdditionalField {
  name: string;
  label: string;
  type?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  items: Item[];
  placeholder: string;
  apiEndpoint: string;
  disabled?: boolean;
  className?: string;
  onItemAdded?: (newItem: Item) => void;
  additionalFields?: AdditionalField[];
  payloadExtra?: Record<string, unknown>;
}

export default function SelectWithAddModal({
  value,
  onChange,
  items,
  placeholder,
  apiEndpoint,
  disabled = false,
  className = "",
  onItemAdded,
  additionalFields = [],
  payloadExtra = {},
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [extraValues, setExtraValues] = useState<
    Record<string, string | number>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__ADD_NEW__") {
      setIsOpen(true);
    } else {
      onChange(val);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          ...payloadExtra,
          ...extraValues,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || "Failed to create item");
      }

      const createdItem = (await res.json()) as Item;

      // Callback to parent to update its local list state
      if (onItemAdded) {
        onItemAdded(createdItem);
      }

      // Automatically select the newly created item
      onChange(createdItem.id);

      // Reset and close modal
      setNewItemName("");
      setExtraValues({});
      setIsOpen(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to add new element",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <select
        disabled={disabled}
        value={value}
        onChange={handleSelectChange}
        className={className}
      >
        <option value="">{placeholder}</option>
        <option
          value="__ADD_NEW__"
          className="font-semibold text-blue-600 bg-blue-50 dark:bg-slate-800"
        >
          + Add New...
        </option>
        <hr />
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} {item.days !== undefined ? `(${item.days} Days)` : ""}
          </option>
        ))}
      </select>

      {/* Add New Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Add New Item
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 text-xs bg-red-100 text-red-600 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewItemName(e.target.value)
                  }
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 border rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                  autoFocus
                />
              </div>

              {/* Render dynamic extra fields if required (e.g. 'days' for payment terms) */}
              {additionalFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type || "text"}
                    required
                    value={extraValues[field.name] || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExtraValues({
                        ...extraValues,
                        [field.name]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* // app/components/common/SelectWithAddModal.tsx

"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

interface Item {
  id: string;
  name: string;
  days?: number; // Optional, for payment terms
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  items: Item[];
  placeholder: string;
  apiEndpoint: string;
  disabled?: boolean;
  className?: string;
  onItemAdded?: (newItem: Item) => void;
  additionalFields?: { name: string; label: string; type?: string }[];
  payloadExtra?: Record<string, any>;
}

export default function SelectWithAddModal({
  value,
  onChange,
  items,
  placeholder,
  apiEndpoint,
  disabled = false,
  className = "",
  onItemAdded,
  additionalFields = [],
  payloadExtra = {},
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__ADD_NEW__") {
      setIsOpen(true);
    } else {
      onChange(val);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          ...payloadExtra,
          ...extraValues,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create item");
      }

      const createdItem: Item = await res.json();

      // Callback to parent to update its local list state
      if (onItemAdded) {
        onItemAdded(createdItem);
      }

      // Automatically select the newly created item
      onChange(createdItem.id);

      // Reset and close modal
      setNewItemName("");
      setExtraValues({});
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add new element",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <select
        disabled={disabled}
        value={value}
        onChange={handleSelectChange}
        className={className}
      >
        <option value="">{placeholder}</option>
        <option
          value="__ADD_NEW__"
          className="font-semibold text-blue-600 bg-blue-50 dark:bg-slate-800"
        >
          + Add New...
        </option>
        <hr />
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} {item.days !== undefined ? `(${item.days} Days)` : ""}
          </option>
        ))}
      </select>


      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Add New Item
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 text-xs bg-red-100 text-red-600 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 border rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                  autoFocus
                />
              </div>

        
              {additionalFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type || "text"}
                    required
                    value={extraValues[field.name] || ""}
                    onChange={(e) =>
                      setExtraValues({
                        ...extraValues,
                        [field.name]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
 */
