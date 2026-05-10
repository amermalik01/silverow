// app/components/hr/employees/EmployeeRecord.tsx
"use client";

import { useEffect, useState } from "react";

import {
  Employee,
  EmployeeAddress,
  EmployeeContact,
} from "@/types/hr/employee";

import EmployeeGeneralTab from "./tabs/EmployeeGeneralTab";
import EmployeeContactsTab from "./tabs/EmployeeContactsTab";
import EmployeeAddressesTab from "./tabs/EmployeeAddressesTab";
import EmployeeAccessTab from "./tabs/EmployeeAccessTab";

type Props = {
  id: string;
};

type EmployeeRecordResponse = {
  employee: Partial<Employee>;
  contacts: EmployeeContact[];
  addresses: EmployeeAddress[];
};

export default function EmployeeRecord({ id }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  const [access, setAccess] = useState({
    enable_login: false,

    email: "",

    password: "",

    role: "",
  });

  // const [employee, setEmployee] =
  //   useState<Employee | null>(null);

  const [employee, setEmployee] = useState<Partial<Employee>>({});

  const [contacts, setContacts] = useState<EmployeeContact[]>([]);

  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/hr/employees/${id}`);

        const json: EmployeeRecordResponse = await res.json();

        setEmployee(json.employee);

        setContacts(json.contacts || []);

        setAddresses(json.addresses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async () => {
    if (!employee) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          employee,
          contacts,
          addresses,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error);
      }

      alert("Employee updated successfully");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!employee.id) {
    return <p>Employee not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* TABS */}

      <div className="flex gap-4 border-b pb-2">
        {["general", "access", "contacts", "addresses"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize px-3 py-1 ${
              activeTab === tab ? "border-b-2 border-blue-600 font-bold" : ""
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* GENERAL */}

      {activeTab === "general" && (
        <EmployeeGeneralTab employee={employee} setEmployee={setEmployee} />
      )}

      {/* ACCESS */}
      {activeTab === "access" && (
        <EmployeeAccessTab access={access} setAccess={setAccess} />
      )}

      {/* CONTACTS */}

      {activeTab === "contacts" && (
        <EmployeeContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {/* ADDRESSES */}

      {activeTab === "addresses" && (
        <EmployeeAddressesTab
          addresses={addresses}
          setAddresses={setAddresses}
        />
      )}

      {/* SAVE */}

      <div className="flex justify-end border-t pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {saving ? "Saving..." : "Update"}
        </button>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import { Employee } from "@/types/hr/employee";

type Props = {
  id: string;
};

export default function EmployeeRecord({ id }: Props) {
  const [data, setData] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/hr/employees/${id}`);

      const json = await res.json();

      setData(json);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!data) {
    return <p>Employee not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="border rounded p-6">
        <h1 className="text-2xl font-bold">
          {data.first_name} {data.last_name}
        </h1>

        <p>Employee Code: {data.employee_code}</p>

        <p>Email: {data.email}</p>

        <p>Mobile: {data.mobile}</p>

        <p>Status: {data.status}</p>
      </div>
    </div>
  );
}
 */
