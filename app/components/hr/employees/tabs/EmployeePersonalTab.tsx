// app/components/hr/employees/tabs/EmployeePersonalTab.tsx

"use client";

import { type Dispatch, type SetStateAction } from "react";
import type { Employee } from "@/types/hr/employee";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import {
  FormField,
  SelectField,
  Section,
  inputClass,
  labelClass,
} from "./employeeFormKit";

type Props = {
  employee: Partial<Employee>;
  setEmployee: Dispatch<SetStateAction<Partial<Employee>>>;
  isReadonly?: boolean;
};

export default function EmployeePersonalTab({
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

  const updateNumber = (key: keyof Employee, value: string) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value === "" ? undefined : Number(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Personal Information & Bank Details */}
        <div className="space-y-4">
          <Section title="Personal Details">
            <FormField
              label="Date of Birth"
              type="date"
              value={employee.date_of_birth}
              onChange={(value) => updateText("date_of_birth", value)}
              disabled={isReadonly}
            />
            <FormField
              label="National Insurance No."
              value={employee.national_insurance_no}
              onChange={(value) =>
                updateText("national_insurance_no", value)
              }
              disabled={isReadonly}
              placeholder="e.g. QQ123456C"
            />
            <SelectField
              label="Ethnic Origin"
              value={employee.ethnic_origin}
              onChange={(value) => updateText("ethnic_origin", value)}
              disabled={isReadonly}
              options={[
                { value: "white", label: "White" },
                { value: "mixed", label: "Mixed / Multiple ethnic groups" },
                { value: "asian", label: "Asian / Asian British" },
                { value: "black", label: "Black / African / Caribbean" },
                { value: "other", label: "Other ethnic group" },
              ]}
              placeholder="Select"
            />
          </Section>

          <Section
            title="Bank Account Details"
            description="Payroll deposit routing configuration."
          >
            <FormField
              label="Account Name"
              value={employee.bank_account_name}
              onChange={(value) => updateText("bank_account_name", value)}
              disabled={isReadonly}
              placeholder="Name on bank account"
            />
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3 max-w-[520px]">
              <label className={labelClass}>Sort Code & Acc No.</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={employee.bank_sort_code ?? ""}
                  onChange={(e) => updateText("bank_sort_code", e.target.value)}
                  disabled={isReadonly}
                  placeholder="Sort Code"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={employee.bank_account_no ?? ""}
                  onChange={(e) =>
                    updateText("bank_account_no", e.target.value)
                  }
                  disabled={isReadonly}
                  placeholder="Account No."
                  className={inputClass}
                />
              </div>
            </div>
            <FormField
              label="Swift / BIC"
              value={employee.bank_swift_bic}
              onChange={(value) => updateText("bank_swift_bic", value)}
              disabled={isReadonly}
              placeholder="SWIFT or BIC code"
            />
            <FormField
              label="IBAN"
              value={employee.bank_iban}
              onChange={(value) => updateText("bank_iban", value)}
              disabled={isReadonly}
              placeholder="International Bank Account Number"
            />
            <FormField
              label="Bank Name"
              value={employee.bank_name}
              onChange={(value) => updateText("bank_name", value)}
              disabled={isReadonly}
              placeholder="e.g. Barclays, HSBC"
            />
            <FormField
              label="Bank Address"
              value={employee.bank_address}
              onChange={(value) => updateText("bank_address", value)}
              disabled={isReadonly}
              placeholder="Branch address"
            />
          </Section>
        </div>

        {/* Right Column: Identity, Licences, & Emergency Contacts */}
        <div className="space-y-4">
          <Section title="Identity & Identification">
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3 max-w-[520px]">
              <label className={labelClass}>Gender & Marital</label>
              <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                <select
                  value={employee.gender ?? ""}
                  onChange={(e) => updateText("gender", e.target.value)}
                  disabled={isReadonly}
                  className={inputClass}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={employee.marital_status ?? ""}
                  onChange={(e) => updateText("marital_status", e.target.value)}
                  disabled={isReadonly}
                  className={inputClass}
                >
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                </select>
              </div>
            </div>
            <FormField
              label="No. of Children"
              type="number"
              value={employee.number_of_children}
              onChange={(value) => updateNumber("number_of_children", value)}
              disabled={isReadonly}
              placeholder="0"
            />
            <FormField
              label="Passport No. / ID No."
              value={employee.passport_id_no}
              onChange={(value) => updateText("passport_id_no", value)}
              disabled={isReadonly}
              placeholder="Passport or national ID number"
            />
            <FormField
              label="Driving Licence No."
              value={employee.driving_licence_no}
              onChange={(value) => updateText("driving_licence_no", value)}
              disabled={isReadonly}
              placeholder="Driving licence number"
            />
            <FormField
              label="Points on Driving Lic."
              type="number"
              value={employee.driving_licence_points}
              onChange={(value) =>
                updateNumber("driving_licence_points", value)
              }
              disabled={isReadonly}
              placeholder="0"
            />
          </Section>

          <Section
            title="Next Of Kin / Emergency Contact Details"
            description="Primary person to contact in case of emergencies."
          >
            <FormField
              label="Name"
              value={employee.emergency_contact_name}
              onChange={(value) => updateText("emergency_contact_name", value)}
              disabled={isReadonly}
              placeholder="Full name"
            />
            <FormField
              label="Relation"
              value={employee.emergency_contact_relation}
              onChange={(value) =>
                updateText("emergency_contact_relation", value)
              }
              disabled={isReadonly}
              placeholder="e.g. Spouse, Parent"
            />
            <FormField
              label="Mobile"
              type="tel"
              value={employee.emergency_contact_mobile}
              onChange={(value) =>
                updateText("emergency_contact_mobile", value)
              }
              disabled={isReadonly}
              placeholder="Mobile number"
            />
            <FormField
              label="Telephone"
              type="tel"
              value={employee.emergency_contact_telephone}
              onChange={(value) =>
                updateText("emergency_contact_telephone", value)
              }
              disabled={isReadonly}
              placeholder="Landline telephone"
            />
            <FormField
              label="Email"
              type="email"
              value={employee.emergency_contact_email}
              onChange={(value) => updateText("emergency_contact_email", value)}
              disabled={isReadonly}
              placeholder="Email address"
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
