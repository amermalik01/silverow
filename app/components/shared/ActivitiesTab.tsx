// app/components/shared/ActivitiesTab.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";

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

const INITIAL_STATE = (module: string, recordId: string): Activity => ({
  module,
  record_id: recordId,
  type: "task",
  title: "",
  description: "",
  due_date: "",
  status: "pending",
});

export default function ActivitiesTab({
  module,
  recordId,
  readonly = false,
}: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Activity>(INITIAL_STATE(module, recordId));

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/activities?module=${module}&record_id=${recordId}`,
      );
      if (!res.ok)
        throw new Error(
          "Could not parse operational context activities database list",
        );
      const json = await res.json();
      setActivities(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadActivities();
    setForm(INITIAL_STATE(module, recordId));
  }, [loadActivities, module, recordId]);

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Failed network execution path validation drop",
        );

      setForm(INITIAL_STATE(module, recordId));
      await loadActivities();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: Activity) => {
    const nextStatus = item.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch(`/api/activities/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, status: nextStatus }),
      });
      if (res.ok) await loadActivities();
    } catch (e) {
      console.error("Could not modify active workflow state flag index:", e);
    }
  };

  const removeActivity = async (id: string) => {
    if (!confirm("Remove this entry context permanently?")) return;
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (res.ok) await loadActivities();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {!readonly && (
        <div className="border rounded-lg p-5 space-y-4 bg-white shadow-sm">
          <h2 className="font-semibold text-base text-gray-800">
            Add New Activity Trace Entry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 capitalize tracking-wider block mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value }))
                }
                className="border p-2 rounded text-xs w-full bg-slate-50 focus:bg-white"
              >
                <option value="task">Task</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 capitalize tracking-wider block mb-1">
                Initial Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
                className="border p-2 rounded text-xs w-full bg-slate-50 focus:bg-white"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 capitalize tracking-wider block mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                className="border p-2 rounded text-xs w-full focus:ring-1 focus:ring-blue-500"
                placeholder="Brief summary objective..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 capitalize tracking-wider block mb-1">
                Description
              </label>
              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                className="border p-2 rounded text-xs w-full focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="Action items details context text block placeholder..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 capitalize tracking-wider block mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={form.due_date || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, due_date: e.target.value }))
                }
                className="border p-2 rounded text-xs w-full"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !form.title?.trim()}
              variant="save"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg text-gray-800">
          Activity Log Timeline Trace
        </h2>
        {loading ? (
          <p className="text-xs text-gray-400 animate-pulse">
            Loading tracking parameters historical layer...
          </p>
        ) : activities.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No tracked milestones mapped here.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white hover:shadow-sm transition flex justify-between items-start group"
              >
                <div className="space-y-1 max-w-[80%]">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs capitalize px-2 py-0.5 rounded-full font-bold ${
                        item.type === "meeting"
                          ? "bg-purple-100 text-purple-700"
                          : item.type === "call"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.type}
                    </span>
                    <h3
                      className={`font-semibold text-xs ${item.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}
                    >
                      {item.title}
                    </h3>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}
                  {item.due_date && (
                    <p className="text-xs text-gray-400 font-medium">
                      Target Boundary limit:{" "}
                      {new Date(item.due_date).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => toggleStatus(item)}
                    className={`text-xs px-2 py-1 rounded font-medium border transition ${
                      item.status === "completed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-slate-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.status === "completed" ? "Completed" : "Mark Done"}
                  </Button>
                  <Button
                    onClick={() => item.id && removeActivity(item.id)}
                    variant="cancel"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* "use client";

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
              <label className="text-xs font-medium">Type</label>

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
              <label className="text-xs font-medium">Status</label>

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
              <label className="text-xs font-medium">Title</label>

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
              <label className="text-xs font-medium">Description</label>

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
              <label className="text-xs font-medium">Due Date</label>

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
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="save"
            >
              {saving ? "Saving..." : "Save Activity"}
            </Button>
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

                <span className="text-xs capitalize">{item.status}</span>
              </div>

              <p className="text-xs capitalize">{item.type}</p>

              <p className="text-xs">{item.description}</p>

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
} */
