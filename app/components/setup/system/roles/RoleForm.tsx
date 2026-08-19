// app/components/setup/system/roles/RoleForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type Props = {
  onCreated: () => void;
};

export default function RoleForm({ onCreated }: Props) {
  const [code, setCode] = useState("");

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/setup/roles", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          code,
          name,
          description,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create role");
      }

      setCode("");

      setName("");

      setDescription("");

      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded p-4 space-y-4">
      <h2 className="font-semibold">Create Role</h2>

      <input
        placeholder="Role Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="border rounded p-2 w-full"
      />

      <input
        placeholder="Role Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded p-2 w-full"
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border rounded p-2 w-full"
      />

      <Button
        onClick={submit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Saving..." : "Create Role"}
      </Button>
    </div>
  );
}
