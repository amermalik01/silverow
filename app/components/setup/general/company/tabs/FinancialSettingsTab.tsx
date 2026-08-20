// app/components/setup/general/company/tabs/FinancialSettingsTab.tsx

"use client";

import React, { useState, useEffect } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

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
    business_type: initialData?.business_type || "limited_company",
    is_wholesaler: initialData?.is_wholesaler ?? false,
    financial_year_start_date: initialData?.financial_year_start_date || "",
    financial_year_end_date: initialData?.financial_year_end_date || "",
    date_of_incorporation: initialData?.date_of_incorporation || "",
    company_reg_no: initialData?.company_reg_no || "",
    vat_scheme: initialData?.vat_scheme || "no_vat",
    vat_reg_no: initialData?.vat_reg_no || "",
    vat_submission_freq: initialData?.vat_submission_freq || "",
  });

  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: string; text: string }>({
    type: "",
    text: "",
  });

  // Sync props or fetch default financial settings if missing
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
      setLoading(false);
    } else {
      fetch("/api/setup/general/financial")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load financial settings.");
          return res.json();
        })
        .then((data) => {
          if (data) setFormData(data);
        })
        .catch(() => {
          // Fallback or ignore if endpoint isn't ready
        })
        .finally(() => setLoading(false));
    }
  }, [initialData]);

  const handleChange = <K extends keyof FinancialSettingsData>(
    field: K,
    value: FinancialSettingsData[K],
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Clear VAT details when switching to "no_vat"
      if (field === "vat_scheme" && value === "no_vat") {
        updated.vat_reg_no = "";
        updated.vat_submission_freq = "";
      }

      return updated;
    });

    // Clear inline error on field change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_type) {
      newErrors.business_type = "Business Type is required.";
    }

    // Financial Year Dates Validation
    if (!formData.financial_year_start_date) {
      newErrors.financial_year_start_date = "Start date is required.";
    }

    if (!formData.financial_year_end_date) {
      newErrors.financial_year_end_date = "End date is required.";
    }

    if (
      formData.financial_year_start_date &&
      formData.financial_year_end_date
    ) {
      const start = new Date(formData.financial_year_start_date);
      const end = new Date(formData.financial_year_end_date);

      if (end <= start) {
        newErrors.financial_year_end_date =
          "End date must be after start date.";
      }
    }

    // Date of Incorporation Validation (Cannot be in the future)
    if (formData.date_of_incorporation) {
      const incDate = new Date(formData.date_of_incorporation);
      const today = new Date();

      if (incDate > today) {
        newErrors.date_of_incorporation =
          "Incorporation date cannot be in the future.";
      }
    }

    // VAT Registration Number check if VAT scheme is active
    if (formData.vat_scheme === "standard" && !formData.vat_reg_no.trim()) {
      newErrors.vat_reg_no = "VAT Reg. No. is required for Standard scheme.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!validateForm()) return;

    setSaving(true);

    try {
      if (onSave) {
        await onSave(formData);
      } else {
        const res = await fetch("/api/setup/general/financial", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Failed to save financial settings.");
      }

      setMessage({
        type: "success",
        text: "Financial settings saved successfully.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isVatDisabled =
    formData.vat_scheme === "no_vat" || !formData.vat_scheme;

  if (loading) {
    return (
      <div className="text-gray-500 py-4 text-xs">
        Loading financial settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message.text && (
        <div
          className={`p-3 border text-xs rounded ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4 text-xs text-gray-700">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Business Type <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                value={formData.business_type}
                onChange={(e) => handleChange("business_type", e.target.value)}
                className={`w-full border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white ${
                  errors.business_type ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Business Type</option>
                <option value="sole_trader">Sole Trader</option>
                <option value="partnership">Partnership</option>
                <option value="limited_company">Limited Company (Ltd)</option>
                <option value="public_limited_company">
                  Public Limited Company (PLC)
                </option>
                <option value="limited_liability_partnership">
                  Limited Liability Partnership (LLP)
                </option>
              </select>
              {errors.business_type && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors.business_type}
                </p>
              )}
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
            <div className="col-span-2">
              {/* <input
                type="date"
                value={formData.financial_year_start_date}
                onChange={(e) =>
                  handleChange("financial_year_start_date", e.target.value)
                }
                className={`w-full border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white ${
                  errors.financial_year_start_date
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              /> */}

              <DatePicker
                value={
                  formData.financial_year_start_date
                    ? parseISO(formData.financial_year_start_date)
                    : undefined
                }
                onChange={(date) =>
                  handleChange(
                    "financial_year_start_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={`w-full ${
                  errors.financial_year_start_date
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {errors.financial_year_start_date && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors.financial_year_start_date}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Financial Year End Date <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              {/* <input
                type="date"
                value={formData.financial_year_end_date}
                onChange={(e) =>
                  handleChange("financial_year_end_date", e.target.value)
                }
                className={`w-full border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white ${
                  errors.financial_year_end_date
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              /> */}

              <DatePicker
                value={
                  formData.financial_year_end_date
                    ? parseISO(formData.financial_year_end_date)
                    : undefined
                }
                onChange={(date) =>
                  handleChange(
                    "financial_year_end_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={`w-full ${
                  errors.financial_year_end_date
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {errors.financial_year_end_date && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors.financial_year_end_date}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Date of Incorporation
            </label>
            <div className="col-span-2">
              <DatePicker
                value={
                  formData.date_of_incorporation
                    ? parseISO(formData.date_of_incorporation)
                    : undefined
                }
                onChange={(date) =>
                  handleChange(
                    "date_of_incorporation",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={`w-full ${
                  errors.date_of_incorporation
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {/* <input
                type="date"
                value={formData.date_of_incorporation}
                onChange={(e) =>
                  handleChange("date_of_incorporation", e.target.value)
                }
                className={`w-full border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white ${
                  errors.date_of_incorporation
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              /> */}
              {errors.date_of_incorporation && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors.date_of_incorporation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
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
              <select
                value={formData.vat_scheme}
                onChange={(e) => handleChange("vat_scheme", e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
              >
                <option value="no_vat">No VAT</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">VAT Reg. No.</label>
            <div className="col-span-2">
              <input
                type="text"
                value={formData.vat_reg_no}
                onChange={(e) => handleChange("vat_reg_no", e.target.value)}
                disabled={isVatDisabled}
                className={`w-full border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 ${
                  isVatDisabled
                    ? "bg-gray-100 cursor-not-allowed border-gray-200 text-gray-400"
                    : errors.vat_reg_no
                      ? "border-red-500 bg-white"
                      : "bg-white border-gray-300"
                }`}
              />
              {errors.vat_reg_no && (
                <p className="text-red-500 text-[10px] mt-1">
                  {errors.vat_reg_no}
                </p>
              )}
            </div>
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
              disabled={isVatDisabled}
              className={`col-span-2 border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 ${
                isVatDisabled
                  ? "bg-gray-100 cursor-not-allowed border-gray-200 text-gray-400"
                  : "bg-white border-gray-300"
              }`}
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
        <Button
          type="submit"
          disabled={saving}
          variant="save"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="cancel"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
