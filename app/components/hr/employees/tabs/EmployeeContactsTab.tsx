// app/components/hr/employees/tabs/EmployeeContactsTab.tsx

"use client";

import { type Dispatch, type SetStateAction } from "react";
import type { Employee } from "@/types/hr/employee";

type Props = {
  employee: Partial<Employee>;
  setEmployee: Dispatch<SetStateAction<Partial<Employee>>>;
  isReadonly?: boolean;
};

type FieldProps = {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  required?: boolean;
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-400";

const labelClass = "text-xs font-medium text-slate-700 dark:text-slate-300";

function FormField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  required = false,
}: FieldProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="sm:col-span-2">
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {/* {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )} */}
      </div>
      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-4 lg:grid-cols-1">
        {children}
      </div>
    </section>
  );
}

export default function EmployeeContactTab({
  employee,
  setEmployee,
  isReadonly = false,
}: Props) {
  const updateText = (key: keyof Employee, value: string) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        {/* Left Column: Postal Address & Telephones */}
        <div className="space-y-6">
          <Section
            title="Address Details"
            description="Primary residential or mailing address."
          >
            <FormField
              label="Address Line 1"
              value={employee.address_line_1}
              onChange={(value) => updateText("address_line_1", value)}
              disabled={isReadonly}
              placeholder="Street address, P.O. box"
            />
            <FormField
              label="Address Line 2"
              value={employee.address_line_2}
              onChange={(value) => updateText("address_line_2", value)}
              disabled={isReadonly}
              placeholder="Apartment, suite, unit, building"
            />
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>City & County</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={employee.city ?? ""}
                  onChange={(e) => updateText("city", e.target.value)}
                  disabled={isReadonly}
                  placeholder="City"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={employee.county ?? ""}
                  onChange={(e) => updateText("county", e.target.value)}
                  disabled={isReadonly}
                  placeholder="County"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Postal & Country</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={employee.postcode ?? ""}
                  onChange={(e) => updateText("postcode", e.target.value)}
                  disabled={isReadonly}
                  placeholder="Postcode"
                  className={inputClass}
                />
                <select
                  value={employee.country ?? "United Kingdom"}
                  onChange={(e) => updateText("country", e.target.value)}
                  disabled={isReadonly}
                  className={inputClass}
                >
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title="Direct Telephones">
            <FormField
              label="Work Telephone"
              type="tel"
              value={employee.work_telephone}
              onChange={(value) => updateText("work_telephone", value)}
              disabled={isReadonly}
              placeholder="Work extension or direct line"
            />
            <FormField
              label="Home Telephone"
              type="tel"
              value={employee.home_telephone}
              onChange={(value) => updateText("home_telephone", value)}
              disabled={isReadonly}
              placeholder="Home landline number"
            />
          </Section>
        </div>

        {/* Right Column: Direct Contact Info & Socials */}
        <div className="space-y-6">
          <Section
            title="Communication Channels"
            description="Direct mobile, emails, and professional networks."
          >
            <FormField
              label="Mobile"
              type="tel"
              value={employee.mobile}
              onChange={(value) => updateText("mobile", value)}
              disabled={isReadonly}
              placeholder="Mobile phone number"
            />
            <FormField
              label="Personal Email"
              type="email"
              value={employee.personal_email}
              onChange={(value) => updateText("personal_email", value)}
              disabled={isReadonly}
              placeholder="personal@domain.com"
            />
            <FormField
              label="Work Email"
              type="email"
              value={employee.work_email}
              onChange={(value) => updateText("work_email", value)}
              disabled={isReadonly}
              placeholder="employee@company.com"
            />
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Social Media</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    Skype
                  </span>
                  <input
                    type="text"
                    value={employee.skype ?? ""}
                    onChange={(e) => updateText("skype", e.target.value)}
                    disabled={isReadonly}
                    placeholder="Username"
                    className="w-full rounded-r-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    LinkedIn
                  </span>
                  <input
                    type="text"
                    value={employee.linkedin ?? ""}
                    onChange={(e) => updateText("linkedin", e.target.value)}
                    disabled={isReadonly}
                    placeholder="Profile URL"
                    className="w-full rounded-r-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { Button } from "@/components/ui/button";
import { EmployeeContact } from "@/types/hr/employee";

type Props = {
  contacts: EmployeeContact[];
  setContacts: (contacts: EmployeeContact[]) => void;
};

export default function EmployeeContactsTab({ contacts, setContacts }: Props) {
  const addRow = () => {
    setContacts([
      ...contacts,
      { name: "", relation: "", phone: "", email: "", is_emergency: false },
    ]);
  };

  const updateRow = <K extends keyof EmployeeContact>(
    index: number,
    field: K,
    value: EmployeeContact[K],
  ) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const removeRow = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const inputClass =
    "border border-slate-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-md font-semibold text-slate-800">
            Associated Contacts
          </h3>
          <p className="text-xs text-slate-500">
            Manage modern emergency and legal corporate records.
          </p>
        </div>
        <Button
          type="button"
          onClick={addRow}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
        >
          + Append Contact Record
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-xs text-slate-500">
            No contact links associated with this record yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((row, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 shadow-sm relative group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <input
                  placeholder="Full Legal Name"
                  value={row.name}
                  onChange={(e) => updateRow(index, "name", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Kinship/Relation (e.g. Spouse)"
                  value={row.relation || ""}
                  onChange={(e) => updateRow(index, "relation", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Primary Telephone"
                  value={row.phone || ""}
                  onChange={(e) => updateRow(index, "phone", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Personal Email Address"
                  value={row.email || ""}
                  onChange={(e) => updateRow(index, "email", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={row.is_emergency || false}
                    onChange={(e) =>
                      updateRow(index, "is_emergency", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 h-4 w-4"
                  />
                  Designate Primary Crisis Contact
                </label>
                <Button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  🗑️ Purge Entry
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} */
