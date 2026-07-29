// app/components/setup/general/company/tabs/PasswordSettingsTab.tsx

"use client";

import React, { useState } from "react";

export interface PasswordSettingsData {
  expiry_time_days: number;
  reminder_start_days: number;
  grace_period_days: number;
  max_failed_attempts: number;
}

interface PasswordSettingsTabProps {
  initialData?: Partial<PasswordSettingsData>;
  onSave?: (data: PasswordSettingsData) => void;
  onCancel?: () => void;
}

export default function PasswordSettingsTab({
  initialData,
  onSave,
  onCancel,
}: PasswordSettingsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PasswordSettingsData>({
    expiry_time_days: initialData?.expiry_time_days ?? 999,
    reminder_start_days: initialData?.reminder_start_days ?? 999,
    grace_period_days: initialData?.grace_period_days ?? 999,
    max_failed_attempts: initialData?.max_failed_attempts ?? 999,
  });

  const handleChange = (field: keyof PasswordSettingsData, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    if (onSave) onSave(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {/* Expiry time of passwords */}
          <div className="grid grid-cols-12 items-center gap-4">
            <label className="col-span-5 font-medium text-gray-700">
              Expiry time of passwords
            </label>
            <div className="col-span-4 flex items-center">
              <input
                type="number"
                value={formData.expiry_time_days}
                onChange={(e) =>
                  handleChange("expiry_time_days", e.target.value)
                }
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-l px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white disabled:bg-gray-50 disabled:text-gray-600"
              />
              <span className="bg-gray-100 border border-l-0 border-gray-300 text-gray-500 px-3 py-1.5 rounded-r text-xs">
                Days
              </span>
            </div>
          </div>

          {/* Start date of daily reminders of expiry due date */}
          <div className="grid grid-cols-12 items-center gap-4">
            <label className="col-span-5 font-medium text-gray-700">
              Start date of daily reminders of expiry due date
            </label>
            <div className="col-span-4 flex items-center">
              <input
                type="number"
                value={formData.reminder_start_days}
                onChange={(e) =>
                  handleChange("reminder_start_days", e.target.value)
                }
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-l px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white disabled:bg-gray-50 disabled:text-gray-600"
              />
              <span className="bg-gray-100 border border-l-0 border-gray-300 text-gray-500 px-3 py-1.5 rounded-r text-xs">
                Days
              </span>
            </div>
          </div>

          {/* Grace period to 1st login with old password after expiry */}
          <div className="grid grid-cols-12 items-center gap-4">
            <label className="col-span-5 font-medium text-gray-700">
              Grace period to 1st login with old password after expiry
            </label>
            <div className="col-span-4 flex items-center">
              <input
                type="number"
                value={formData.grace_period_days}
                onChange={(e) =>
                  handleChange("grace_period_days", e.target.value)
                }
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-l px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white disabled:bg-gray-50 disabled:text-gray-600"
              />
              <span className="bg-gray-100 border border-l-0 border-gray-300 text-gray-500 px-3 py-1.5 rounded-r text-xs">
                Days
              </span>
            </div>
          </div>

          {/* Maximum consecutive login fails before lock-out */}
          <div className="grid grid-cols-12 items-center gap-4">
            <label className="col-span-5 font-medium text-gray-700">
              Maximum consecutive login fails before lock-out
            </label>
            <div className="col-span-4 flex items-center">
              <input
                type="number"
                value={formData.max_failed_attempts}
                onChange={(e) =>
                  handleChange("max_failed_attempts", e.target.value)
                }
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-6 border-t border-gray-100">
        {isEditing ? (
          <>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-medium transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </form>
  );
}
