// app/components/shared/ActivitiesTab.tsx

"use client";

import { useEffect, useState } from "react";

export type Activity = {
  id?: string;

  module: string;
  record_id: string;

  type?: string;
  title?: string;
  description?: string;

  due_date?: string;

  status?: string;

  assigned_to?: string;
};

type Props = {
  module: string;
  recordId: string;
  readonly?: boolean;
};

export default function ActivitiesTab({
  module,
  recordId,
  readonly = false,
}: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Activity>({
    module,
    record_id: recordId,
    type: "task",
    title: "",
    description: "",
    due_date: "",
    status: "pending",
  });

  const loadActivities = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/activities?module=${module}&record_id=${recordId}`,
      );

      const data = await res.json();

      setActivities(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [module, recordId]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/activities", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed");
      }

      setForm({
        module,
        record_id: recordId,
        type: "task",
        title: "",
        description: "",
        due_date: "",
        status: "pending",
      });

      await loadActivities();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!readonly && (
        <div className="border rounded p-4 space-y-4">
          <h2 className="font-semibold text-lg">Add Activity</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="border p-2 rounded w-full"
              >
                <option value="task">Task</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>

              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="border p-2 rounded w-full"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Title</label>

              <input
                type="text"
                value={form.title || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Description</label>

              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="border p-2 rounded w-full"
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Due Date</label>

              <input
                type="datetime-local"
                value={form.due_date || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Activities</h2>

        {loading ? (
          <p>Loading activities...</p>
        ) : activities.length === 0 ? (
          <p>No activities found</p>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="border rounded p-4 space-y-2">
              <div className="flex justify-between">
                <h3 className="font-semibold">{item.title}</h3>

                <span className="text-sm capitalize">{item.status}</span>
              </div>

              <p className="text-sm capitalize">{item.type}</p>

              <p className="text-sm">{item.description}</p>

              {item.due_date && (
                <p className="text-xs text-gray-500">
                  Due: {new Date(item.due_date).toLocaleString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
