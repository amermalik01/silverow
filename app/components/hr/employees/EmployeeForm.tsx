// app/components/hr/employees/EmployeeForm.tsx
"use client";

import { useState } from "react";
import {
  Employee,
  EmployeePayload,
  EmployeeContact,
  EmployeeAddress,
} from "@/types/hr/employee";

import EmployeeGeneralTab from "./tabs/EmployeeGeneralTab";
import EmployeeAccessTab from "./tabs/EmployeeAccessTab";
import EmployeeContactsTab from "./tabs/EmployeeContactsTab";
import EmployeeAddressesTab from "./tabs/EmployeeAddressesTab";
import { Button } from "@/components/ui/button";

export default function EmployeeForm() {
  const [activeTab, setActiveTab] = useState("general");
  const [contacts, setContacts] = useState<EmployeeContact[]>([]);
  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);

  const [employee, setEmployee] = useState<Partial<Employee>>({
    status: "active",
  });

  const [access, setAccess] = useState({
    enable_login: false,

    email: "",

    password: "",

    role: "",
  });

  const [loading, setLoading] = useState(false);

  const save = async () => {
    try {
      setLoading(true);

      const payload: EmployeePayload = {
        employee: employee as Employee,
        contacts,
        addresses,
        access,
      };

      const res = await fetch("/api/hr/employees", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error);
      }

      alert("Employee created successfully");

      window.location.href = "../employees";
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Create Employee</h1>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b pb-2">
        {["general", "contacts", "addresses", "access"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize px-3 py-1 ${
              activeTab === tab
                ? "border-b-2 border-blue-600 font-semibold"
                : ""
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

      {activeTab === "contacts" && (
        <EmployeeContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {activeTab === "addresses" && (
        <EmployeeAddressesTab
          addresses={addresses}
          setAddresses={setAddresses}
        />
      )}

      {/* SAVE */}
      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button" // Change to type="submit" if nested inside a native HTML <form> element
          onClick={save}
          disabled={loading}
          variant="save"
        >
          {loading ? "Saving..." : "Save Employee"}
        </Button>
      </div>
      {/* <div className="flex justify-end border-t pt-4">
        <Button
          onClick={save}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Employee"}
        </Button>
      </div> */}
    </div>
  );
}
