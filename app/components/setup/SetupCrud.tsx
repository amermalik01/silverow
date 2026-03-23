// app/components/setup/SetupCrud.tsx

"use client";

import { useEffect, useState } from "react";

type Field = {
  name: string;
  label: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
};

type Column = {
  name: string;
  label: string;
};

type Row = Record<string, unknown>;

type Props = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
};

export default function SetupCrud({ title, api, fields, columns }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => (initial[f.name] = ""));
    return initial;
  });


  const load = async () => {
    const res = await fetch(api);
    const data = await res.json();
    setRows(data);
  };


  useEffect(() => {
    let ignore = false;

    const run = async () => {
      const res = await fetch(api);
      const data = await res.json();

      if (!ignore) {
        setRows(data);
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [api]);

  const create = async () => {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const reset: Record<string, string> = {};
    fields.forEach((f) => (reset[f.name] = ""));
    setForm(reset);

    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete record?")) return;

    await fetch(`${api}/${id}`, { method: "DELETE" });

    load();
  };

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>


      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}
      >
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <select
                key={field.name}
                value={form[field.name] || ""}
                onChange={(e) =>
                  setForm({ ...form, [field.name]: e.target.value })
                }
                className="border p-2 rounded"
              >
                <option value="">{field.label}</option>

                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={field.name}
              placeholder={field.label}
              value={form[field.name] || ""}
              onChange={(e) =>
                setForm({ ...form, [field.name]: e.target.value })
              }
              className="border p-2 rounded"
            />
          );
        })}
      </div>

      <button
        onClick={create}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add
      </button>


      <table className="w-full border text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name} className="p-2 text-left">
                {c.label}
              </th>
            ))}

            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t">
              {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {String(r[c.name] ?? "")}
                </td>
              ))}

              <td className="p-2 text-center">
                <button
                  onClick={() => remove(String(r.id))}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";

type Field = {
  name: string;
  label: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
};

type Column = {
  name: string;
  label: string;
};

type Props = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
};

export default function SetupCrud({ title, api, fields, columns }: Props) {
  //   const [rows, setRows] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  //   const [form, setForm] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => (initial[f.name] = ""));
    return initial;
  });

  const load = async () => {
    const res = await fetch(api);
    const data = await res.json();
    setRows(data);
  };

  useEffect(() => {
    load();

    const initial: Record<string, string> = {};
    fields.forEach((f) => (initial[f.name] = ""));
    setForm(initial);
  }, []);

  const create = async () => {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const reset: Record<string, string> = {};
    fields.forEach((f) => (reset[f.name] = ""));
    setForm(reset);

    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete record?")) return;

    await fetch(`${api}/${id}`, { method: "DELETE" });

    load();
  };

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>



      <div className={`grid grid-cols-${fields.length} gap-3`}>
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <select
                key={field.name}
                value={form[field.name] || ""}
                onChange={(e) =>
                  setForm({ ...form, [field.name]: e.target.value })
                }
                className="border p-2 rounded"
              >
                <option value="">{field.label}</option>

                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={field.name}
              placeholder={field.label}
              value={form[field.name] || ""}
              onChange={(e) =>
                setForm({ ...form, [field.name]: e.target.value })
              }
              className="border p-2 rounded"
            />
          );
        })}
      </div>

      <button
        onClick={create}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add
      </button>



      <table className="w-full border text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name} className="p-2 text-left">
                {c.label}
              </th>
            ))}

            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {r[c.name]}
                </td>
              ))}

              <td className="p-2 text-center">
                <button onClick={() => remove(r.id)} className="text-red-600">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 */
