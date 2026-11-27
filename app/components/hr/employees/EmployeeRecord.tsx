// app/components/hr/employees/EmployeeRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import type {
  Employee,
  EmployeeAddress,
  EmployeeContact,
  EmployeePayload,
} from "@/types/hr/employee";

import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import EmployeeDetailHeader from "./EmployeeDetailHeader";

import EmployeeGeneralTab from "./tabs/EmployeeGeneralTab";
import EmployeeContactTab from "./tabs/EmployeeContactsTab";
import EmployeePersonalTab from "./tabs/EmployeePersonalTab";
import EmployeeSalaryTab from "./tabs/EmployeeSalaryTab";
import EmployeeBenefitsTab from "./tabs/EmployeeBenefitsTab";
import EmployeeAccessTab from "./tabs/EmployeeAccessTab";

type Props = {
  /** Empty string ("") opens the record in create mode. */
  id: string;
  slug: string;
  isReadonly?: boolean;
  /** Open an existing record straight in edit mode (the /edit route). */
  initialMode?: "view" | "edit";
};

type EmployeeRecordResponse = {
  employee: Partial<Employee>;
  contacts?: EmployeeContact[];
  addresses?: EmployeeAddress[];
};

type AccessState = {
  enable_login: boolean;
  email: string;
  password: string;
  role: string;
};

const ALL_TABS = [
  { id: "general", label: "General", icon: "tabler:id-badge-2" },
  { id: "contact", label: "Contact", icon: "tabler:address-book" },
  { id: "personal", label: "Personal", icon: "tabler:user" },
  { id: "salary", label: "Salary, Holidays & Pensions", icon: "tabler:cash" },
  { id: "benefits", label: "Benefits", icon: "tabler:gift" },
  { id: "access", label: "Login Access", icon: "tabler:lock-access" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

/** Which tab a validation key belongs to. */
const ERROR_TAB: Record<string, TabId> = {
  first_name: "general",
  last_name: "general",
  start_date: "general",
  access_email: "access",
  access_password: "access",
};

const NEW_EMPLOYEE: Partial<Employee> = { status: "active" };

export default function EmployeeRecord({
  id,
  slug,
  isReadonly: isReadonlyProp = false,
  initialMode = "view",
}: Props) {
  const router = useRouter();
  const isNew = !id;

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isEditing, setIsEditing] = useState(
    isNew || (initialMode === "edit" && !isReadonlyProp),
  );
  const effectiveReadonly = isReadonlyProp || !isEditing;

  const [employee, setEmployee] = useState<Partial<Employee>>(
    isNew ? { ...NEW_EMPLOYEE } : {},
  );
  const [contacts, setContacts] = useState<EmployeeContact[]>([]);
  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);
  const [access, setAccess] = useState<AccessState>({
    enable_login: false,
    email: "",
    password: "",
    role: "",
  });

  // Saved snapshots for Cancel.
  const [initialEmployee, setInitialEmployee] = useState<Partial<Employee>>({});
  const [initialContacts, setInitialContacts] = useState<EmployeeContact[]>([]);
  const [initialAddresses, setInitialAddresses] = useState<EmployeeAddress[]>(
    [],
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  /* The Login Access tab is only for creating a new employee */
  const tabs = ALL_TABS.filter((tab) => tab.id !== "access" || isNew);

  useEffect(() => {
    if (!id) return;

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

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!employee.first_name?.trim()) {
      errors.first_name = "First name is required.";
    }
    if (!employee.last_name?.trim()) {
      errors.last_name = "Last name is required.";
    }
    if (isNew && access.enable_login) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(access.email.trim())) {
        errors.access_email = "Enter a valid login email.";
      }
      if (access.password.length < 8) {
        errors.access_password = "Temporary password must be at least 8 characters.";
      }
    }

    setFormErrors(errors);

    const first = Object.keys(errors)[0];
    if (first) {
      setActiveTab(ERROR_TAB[first] ?? "general");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (effectiveReadonly || saving) return;
    if (!validate()) return;

    try {
      setSaving(true);

      /* ---------- Create ---------- */
      if (isNew) {
        const payload: EmployeePayload = {
          employee: employee as Employee,
          contacts,
          addresses,
          access,
        };

        const res = await fetch("/api/hr/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(result.error || "Failed to create employee.");
        }

        toast.success("Employee created successfully.");

        const newId = result?.id || result?.employee?.id || result?.data?.id;
        router.replace(
          newId ? `/${slug}/hr/employees/${newId}` : `/${slug}/hr/employees`,
        );
        return;
      }

      /* ---------- Update ---------- */
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

      setFormErrors({});
      setIsEditing(false);
      toast.success("Employee record saved successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save employee record.";
      setFormErrors({ global: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormErrors({});

    if (isNew) {
      router.back();
      return;
    }

    setEmployee({ ...initialEmployee });
    setContacts([...initialContacts]);
    setAddresses([...initialAddresses]);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (!isNew && !employee.id) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#11161D]">
        <Icon icon="tabler:user-off" className="mx-auto mb-2 text-4xl text-slate-300" />
        <h2 className="font-semibold">Employee not found</h2>
        <p className="mt-1 text-sm text-slate-500">
          This employee record is unavailable.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/hr/employees`)}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Icon icon="lucide:arrow-left" />
          Back to employees
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Employees", href: `/${slug}/hr/employees` },
          {
            label: isNew
              ? "New Employee"
              : employee.employee_code || employee.id || "",
          },
        ]}
      />

      <EmployeeDetailHeader
        employee={employee}
        onEmployeeUpdated={(updatedEmployee) => {
          setEmployee((prev) => ({ ...prev, ...updatedEmployee }));
          setInitialEmployee((prev) => ({ ...prev, ...updatedEmployee }));
        }}
        canEdit={!isReadonlyProp}
        isEditing={!isReadonlyProp && isEditing}
        saving={saving}
        onEdit={() => setIsEditing(true)}
        onSave={() => void handleSave()}
        onCancelEdit={handleCancel}
        onClose={() => router.push(`/${slug}/hr/employees`)}
      />

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {Object.keys(formErrors).length > 0 && (
          <div className="mb-4 p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
            <p className="font-semibold mb-1">
              Please fix the following before saving:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {Object.entries(formErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px dark:border-slate-800">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const hasError = Object.keys(formErrors).some(
              (key) => ERROR_TAB[key] === tab.id,
            );
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-all ${
                  active
                    ? "border-emerald-600 font-semibold text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  icon={tab.icon}
                  className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`}
                />
                {tab.label}
                {hasError && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-[350px] py-2 pt-6">
          {activeTab === "general" && (
            <EmployeeGeneralTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "contact" && (
            <EmployeeContactTab
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "personal" && (
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
              employee={employee}
              setEmployee={setEmployee}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "access" && isNew && (
            <EmployeeAccessTab
              access={access}
              setAccess={setAccess}
              isReadonly={effectiveReadonly}
            />
          )}
        </div>
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
