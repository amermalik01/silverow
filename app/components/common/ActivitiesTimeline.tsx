// app/components/common/ActivitiesTimeline.tsx

"use client";

import { useEffect, useState } from "react";

type Props = {
  module: string;
  recordId: string;
};

type Activity = {
  id: string;
  title: string;
  type: string;
  status: string;
  due_date: string;
};

export default function ActivitiesTimeline({ module, recordId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const loadActivities = async () => {
      const res = await fetch(
        `/api/activities?module=${module}&record_id=${recordId}`,
      );

      const data = await res.json();

      setActivities(data);
    };
    loadActivities();
  }, [module, recordId]);

  const addActivity = async () => {
    if (!title.trim()) return;

    await fetch("/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module,
        record_id: recordId,
        title,
        type: "task",
      }),
    });

    setTitle("");

    const loadActivities = async () => {
      const res = await fetch(
        `/api/activities?module=${module}&record_id=${recordId}`,
      );

      const data = await res.json();

      setActivities(data);
    };

    loadActivities();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Activities</h3>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New activity..."
          className="border p-2 rounded w-full"
        />

        <button
          onClick={addActivity}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {activities.map((a) => (
          <div key={a.id} className="border p-3 rounded">
            <div className="flex justify-between">
              <span className="font-medium">{a.title}</span>

              <span className="text-xs text-gray-500">{a.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
