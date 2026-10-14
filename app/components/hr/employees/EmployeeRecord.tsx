// app/components/hr/employees/EmployeeRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type {
  Employee,
  EmployeeAddress,
  EmployeeContact,
} from "@/types/hr/employee";

import EmployeeGeneralTab from "./tabs/EmployeeGeneralTab";
import EmployeeContactTab from "./tabs/EmployeeContactsTab";
// import EmployeePersonalTab from "./tabs/EmployeePersonalTab";
// import EmployeeSalaryTab from "./tabs/EmployeeSalaryTab";
// import EmployeeBenefitsTab from "./tabs/EmployeeBenefitsTab";
// import EmployeeExpensesTab from "./tabs/EmployeeExpensesTab";
// import EmployeeHolidaysTab from "./tabs/EmployeeHolidaysTab";

import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import EmployeeDetailHeader from "./EmployeeDetailHeader";

type Props = {
  id: string;
  slug: string;
  isReadonly?: boolean;
};

type EmployeeRecordResponse = {
  employee: Partial<Employee>;
  contacts?: EmployeeContact[];
  addresses?: EmployeeAddress[];
};

const tabs = [
  { id: "general", label: "General" },
  { id: "contact", label: "Contact" },
  { id: "personal", label: "Personal" },
  { id: "salary", label: "Salary, Holidays & Pensions" },
  { id: "benefits", label: "Benefits" },
  { id: "expenses", label: "Expenses" },
  { id: "holidays", label: "Holidays" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function EmployeeRecord({
  id,
  slug,
  isReadonly: isReadonlyProp = false,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isEditing, setIsEditing] = useState(false);
  const effectiveReadonly = isReadonlyProp || !isEditing;

  const [employee, setEmployee] = useState<Partial<Employee>>({});
  const [contacts, setContacts] = useState<EmployeeContact[]>([]);
  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);

  // Saved snapshots for Cancel.
  const [initialEmployee, setInitialEmployee] = useState<Partial<Employee>>({});
  const [initialContacts, setInitialContacts] = useState<EmployeeContact[]>([]);
  const [initialAddresses, setInitialAddresses] = useState<EmployeeAddress[]>(
    [],
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployee() {
      setLoading(true);

      try {
        const res = await fetch(`/api/hr/employees/${id}`);

        if (!res.ok) {
          throw new Error("Failed to load employee record.");
        }

        const data: EmployeeRecordResponse = await res.json();

        if (cancelled) return;

        const loadedEmployee = data.employee ?? {};
        const loadedContacts = data.contacts ?? [];
        const loadedAddresses = data.addresses ?? [];

        setEmployee(loadedEmployee);
        setContacts(loadedContacts);
        setAddresses(loadedAddresses);

        setInitialEmployee(loadedEmployee);
        setInitialContacts(loadedContacts);
        setInitialAddresses(loadedAddresses);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load employee.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEmployee();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (effectiveReadonly || saving) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee,
          contacts,
          addresses,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save employee.");
      }

      // Prefer the canonical employee returned by the API.
      const savedEmployee = result.employee ?? employee;
      const savedContacts = result.contacts ?? contacts;
      const savedAddresses = result.addresses ?? addresses;

      setEmployee(savedEmployee);
      setContacts(savedContacts);
      setAddresses(savedAddresses);

      setInitialEmployee(savedEmployee);
      setInitialContacts(savedContacts);
      setInitialAddresses(savedAddresses);

      setIsEditing(false);
      toast.success("Employee record saved successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save employee record.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEmployee({ ...initialEmployee });
    setContacts([...initialContacts]);
    setAddresses([...initialAddresses]);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-1/4 rounded bg-slate-200" />
        <div className="h-12 rounded bg-slate-200" />
        <div className="h-64 rounded bg-slate-100" />
      </div>
    );
  }

  if (!employee.id) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="font-semibold">Employee not found</h2>
        <p className="mt-1 text-sm text-slate-500">
          This employee record is unavailable.
        </p>
      </div>
    );
  }

  const fullName = [
    employee.first_name,
    employee.middle_name,
    employee.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Employees", href: `/${slug}/hr/employees` },
          {
            label: employee.employee_code || employee.id || "",
          },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Employee header */}
        {/* <div className="mb-5 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">
              HUMAN RESOURCES / EMPLOYEE
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {fullName || "Employee"}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Employee No. {employee.employee_code || "Not assigned"}
              {" · "}
              {employee.job_title || "No job title"}
            </p>
          </div>

          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-700">
            {employee.status || "active"}
          </span>
        </div> */}

        <EmployeeDetailHeader
          employee={employee}
          onEmployeeUpdated={(updatedEmployee) => {
            setEmployee((prev) => ({
              ...prev,
              ...updatedEmployee,
            }));

            setInitialEmployee((prev) => ({
              ...prev,
              ...updatedEmployee,
            }));
          }}
        />

        {Object.keys(formErrors).length > 0 && (
          <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
            <p className="font-semibold mb-1">
              Please fix the following validation errors:
            </p>

            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {formErrors.global && <li>{formErrors.global}</li>}

              {Object.entries(formErrors)
                .filter(([key]) => key !== "global")
                .map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
            </ul>
          </div>
        )}

        {/* Legacy tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-xs transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-700 font-semibold text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[350px] py-5">
          {activeTab === "general" && (
            <EmployeeGeneralTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {/* {activeTab === "contact" && (
            <EmployeeContactTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )} */}

          {/* {activeTab === "personal" && (
            <EmployeePersonalTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "salary" && (
            <EmployeeSalaryTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "benefits" && (
            <EmployeeBenefitsTab
              employeeId={id}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "expenses" && (
            <EmployeeExpensesTab
              employeeId={id}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "holidays" && (
            <EmployeeHolidaysTab
              employeeId={id}
              isReadonly={effectiveReadonly}
            />
          )} */}
        </div>

        {/* Footer actions: same behavior as PartyRecord */}
        {!isReadonlyProp && (
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {!isEditing ? (
              <>
                <Button
                  type="button"
                  variant="edit"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => router.back()}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>

                <Button
                  type="button"
                  variant="cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* "use client";
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
  slug: string;
  isReadonly?: boolean;
};

type EmployeeRecordResponse = {
  employee: Partial<Employee>;
  contacts: EmployeeContact[];
  addresses: EmployeeAddress[];
};

export default function EmployeeRecord({
  id,
  slug,
  isReadonly: isReadonlyProp = false,
}: Props) {
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);

  const effectiveReadonly = isReadonlyProp || !isEditing;

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

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            variant="save"
          >
            {saving ? "saving..." : "Save"}
          </Button>
        </div>
      </div>


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
} */
