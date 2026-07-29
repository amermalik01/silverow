// app/components/setup/general/company/tabs/FinancialSettingsTab.tsx

"use client";

import React, { useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";

export interface FinancialSettingsData {
  business_type: string;
  is_wholesaler: boolean;
  financial_year_start_date: string;
  financial_year_end_date: string;
  date_of_incorporation: string;
  company_reg_no: string;
  vat_scheme: string;
  vat_reg_no: string;
  vat_submission_freq: string;
}

interface FinancialSettingsTabProps {
  initialData?: Partial<FinancialSettingsData>;
  onSave?: (data: FinancialSettingsData) => void;
  onCancel?: () => void;
}

export default function FinancialSettingsTab({
  initialData,
  onSave,
  onCancel,
}: FinancialSettingsTabProps) {
  const [formData, setFormData] = useState<FinancialSettingsData>({
    business_type: initialData?.business_type || "Limited Company (Ltd)",
    is_wholesaler: initialData?.is_wholesaler ?? false,
    financial_year_start_date: initialData?.financial_year_start_date || "",
    financial_year_end_date: initialData?.financial_year_end_date || "",
    date_of_incorporation: initialData?.date_of_incorporation || "",
    company_reg_no: initialData?.company_reg_no || "",
    vat_scheme: initialData?.vat_scheme || "No VAT",
    vat_reg_no: initialData?.vat_reg_no || "",
    vat_submission_freq: initialData?.vat_submission_freq || "",
  });

  const handleChange = (field: keyof FinancialSettingsData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4 text-xs text-gray-700">
   
        <div className="space-y-4">

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Business Type <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              {/* <MasterDropdown
                type="business_type"
                value={formData.business_type}
                onChange={(val) => handleChange("business_type", val || "")}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
              /> */}
            </div>
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Wholesaler</label>
            <div className="col-span-2">
              <input
                type="checkbox"
                checked={formData.is_wholesaler}
                onChange={(e) =>
                  handleChange("is_wholesaler", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Financial Year Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.financial_year_start_date}
              onChange={(e) =>
                handleChange("financial_year_start_date", e.target.value)
              }
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            />
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Financial Year End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.financial_year_end_date}
              onChange={(e) =>
                handleChange("financial_year_end_date", e.target.value)
              }
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            />
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Date of Incorporation
            </label>
            <input
              type="date"
              value={formData.date_of_incorporation}
              onChange={(e) =>
                handleChange("date_of_incorporation", e.target.value)
              }
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            />
          </div>
        </div>


        <div className="space-y-4">

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              (If applicable) Company Reg. No.
            </label>
            <input
              type="text"
              value={formData.company_reg_no}
              onChange={(e) => handleChange("company_reg_no", e.target.value)}
              placeholder="e.g. 12907830"
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            />
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">VAT Scheme</label>
            <div className="col-span-2">
              {/* <MasterDropdown
                type="vat_scheme"
                value={formData.vat_scheme}
                onChange={(val) => handleChange("vat_scheme", val || "")}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
              /> */}
            </div>
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">VAT Reg. No.</label>
            <input
              type="text"
              value={formData.vat_reg_no}
              onChange={(e) => handleChange("vat_reg_no", e.target.value)}
              disabled={formData.vat_scheme === "No VAT"}
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>


          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              VAT Submission Freq.
            </label>
            <select
              value={formData.vat_submission_freq}
              onChange={(e) =>
                handleChange("vat_submission_freq", e.target.value)
              }
              disabled={formData.vat_scheme === "No VAT"}
              className="col-span-2 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select VAT Submission Freq</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annually">Annually</option>
            </select>
          </div>
        </div>
      </div>


      <div className="flex justify-end space-x-2 pt-6 border-t border-gray-100">
        <button
          type="submit"
          className="px-4 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-medium transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}