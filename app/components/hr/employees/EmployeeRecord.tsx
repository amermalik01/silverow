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
import { Button } from "@/components/ui/button";

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

  const [employee, setEmployee] = useState<Partial<Employee>>({});
  const [contacts, setContacts] = useState<EmployeeContact[]>([]);
  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await fetch(`/api/hr/employees/${id}`);
        if (!res.ok) throw new Error("Failed to fetch employee record data.");

        const json: EmployeeRecordResponse = await res.json();
        // Defensive Fix: fall back to empty object/array if api returns missing keys
        setEmployee(json.employee || {});
        setContacts(json.contacts || []);
        setAddresses(json.addresses || []);
      } catch (err) {
        const dbError = err as { code?: string; message?: string };
        console.error(dbError);
        setErrorMessage(
          dbError.message || "An error occurred while loading the record.",
        );
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
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee, contacts, addresses }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update record.");

      setSuccessMessage("Employee file saved and synchronized successfully.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const dbError = err as { code?: string; message?: string };
      console.error(dbError);
      setErrorMessage(
        dbError.message ||
          "An unexpected error occurred during save operations.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-12 bg-slate-200 rounded-lg w-full"></div>
        <div className="h-64 bg-slate-100 rounded-xl w-full"></div>
      </div>
    );
  }

  // Safe Check: Fixed the 'undefined' read runtime crash
  if (!employee || !employee.id) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center border border-slate-200 bg-white shadow-sm rounded-xl my-12">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-slate-800">
          Record Not Available
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          The specified employee could not be found or has been archived.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General Info" },
    { id: "access", label: "Access & Security" },
    { id: "contacts", label: "Emergency Contacts" },
    { id: "addresses", label: "Addresses" },
  ];

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      {/* Dynamic Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg shadow-sm flex items-center gap-2">
          <span>✅</span> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg shadow-sm flex items-center gap-2">
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      {/* Header Profile Summary */}

      <div className="border-b border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs capitalize tracking-wider font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            HR Module
          </span>
          <h1 className="text-2xl font-bold mt-2">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ID Reference: {employee.id}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {" "}
          {/* Adjusted gap to 2 for workspace uniformity */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm min-w-[140px] justify-center"
          >
            {saving ? "Synchronizing..." : "Save Changes"}
          </Button>
        </div>
        {/* <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors duration-150 flex items-center gap-2"
          >
            {saving ? "Synchronizing..." : "Save Changes"}
          </button>
        </div> */}
      </div>

      {/* ERP Navigation Submenu */}
      <div className="border-b border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`capitalize px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Wrapper */}
        <div className="p-6  min-h-[350px]">
          {activeTab === "general" && (
            <EmployeeGeneralTab employee={employee} setEmployee={setEmployee} />
          )}
          {activeTab === "access" && (
            <EmployeeAccessTab access={access} setAccess={setAccess} />
          )}
          {activeTab === "contacts" && (
            <EmployeeContactsTab
              contacts={contacts}
              setContacts={setContacts}
            />
          )}
          {activeTab === "addresses" && (
            <EmployeeAddressesTab
              addresses={addresses}
              setAddresses={setAddresses}
            />
          )}
        </div>
      </div>
    </div>
  );
}