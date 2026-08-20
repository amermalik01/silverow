// app/components/setup/SequenceList.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Sequence = {
  id: string;
  module: string;
  display_name: string;
  prefix: string;
  current_value: number;
  padding: number;
};

export default function SequenceList() {
  const [data, setData] = useState<Sequence[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [prefix, setPrefix] = useState("");
  const [padding, setPadding] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/setup/sequences");
      const json = await res.json();
      setData(json);
    };
    load();
  }, []);

  const edit = (row: Sequence) => {
    setEditingId(row.id);
    setPrefix(row.prefix);
    setPadding(String(row.padding));
    setDisplayName(row.display_name);
  };

  const update = async () => {
    await fetch(`/api/setup/sequences/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        padding: Number(padding),
        display_name: displayName,
      }),
    });

    setEditingId(null);
    setPrefix("");
    setPadding("");

    const load = async () => {
      const res = await fetch("/api/setup/sequences");
      const json = await res.json();
      setData(json);
    };

    load();
  };

  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4 shadow dark:shadow-white">
      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Module</th>
            <th className="p-2 text-left">Prefix</th>
            <th className="p-2 text-left">Current</th>
            <th className="p-2 text-left">Padding</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">
                {editingId === row.id ? (
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border p-1"
                  />
                ) : (
                  row.display_name
                )}
              </td>

              <td className="p-2">{row.module}</td>

              <td className="p-2">
                {editingId === row.id ? (
                  <input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="border p-1"
                  />
                ) : (
                  row.prefix
                )}
              </td>

              <td className="p-2">{row.current_value}</td>

              <td className="p-2">
                {editingId === row.id ? (
                  <input
                    value={padding}
                    onChange={(e) => setPadding(e.target.value)}
                    className="border p-1"
                  />
                ) : (
                  row.padding
                )}
              </td>

              <td className="p-2 text-center">
                {editingId === row.id ? (
                  <Button onClick={update} variant="save">
                    Save
                  </Button>
                ) : (
                  <Button onClick={() => edit(row)} variant="edit">
                    Edit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
