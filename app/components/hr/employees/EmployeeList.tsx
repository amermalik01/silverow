// app/components/hr/employees/EmployeeList.tsx
"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

type Employee = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  mobile?: string;
  status: string;
  department_name?: string;
  designation_name?: string;
};

export default function EmployeeList() {
  const [data, setData] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        search,
      });

      const res = await fetch(`/api/hr/employees?${params}`);

      const json = await res.json();

      setData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employees</h1>

        <Link
          href="./employees/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Employee
        </Link>
      </div>

      {/* SEARCH */}
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee..."
          className="border rounded p-2 w-full md:w-1/3"
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th className="p-2 text-left">Code</th>

                <th className="p-2 text-left">Name</th>

                <th className="p-2 text-left">Department</th>

                <th className="p-2 text-left">Designation</th>

                <th className="p-2 text-left">Email</th>

                <th className="p-2 text-left">Mobile</th>

                <th className="p-2 text-left">Status</th>

                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{row.employee_code}</td>

                  <td className="p-2">
                    {row.first_name} {row.last_name}
                  </td>

                  <td className="p-2">{row.department_name}</td>

                  <td className="p-2">{row.designation_name}</td>

                  <td className="p-2">{row.email}</td>

                  <td className="p-2">{row.mobile}</td>

                  <td className="p-2 capitalize">{row.status}</td>

                  <td className="p-2 text-center">
                    <Link
                      href={`./employees/${row.id}`}
                      className="text-blue-600"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
