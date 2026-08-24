// app/components/setup/general/company/tabs/GeneralTab.tsx

"use client";

import React, { useEffect, useState, useRef } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import CurrencyDropdown from "@/app/components/common/CurrencyDropdown";

import { CompanyProfile } from "../CompanySetupForm";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

interface GeneralTabProps {
  initialProfile: CompanyProfile | null;
  onUpdated?: () => void;
}

export default function GeneralTab({
  initialProfile,
  onUpdated,
}: GeneralTabProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const noop = () => {};

  useEffect(() => {
    if (!initialProfile) {
      fetch("/api/setup/general/company")
        .then((res) => res.json())
        .then((data) => setProfile(data.profile || data))
        .catch((err) => setMessage({ type: "error", text: err.message }))
        .finally(() => setLoading(false));
    } else {
      setProfile(initialProfile);
      setLoading(false);
    }
  }, [initialProfile]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be under 2MB" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfile((prev) => (prev ? { ...prev, logo_url: previewUrl } : null));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/setup/general/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Could not save company configuration.");
      setMessage({
        type: "success",
        text: "Company settings updated successfully.",
      });
      if (onUpdated) onUpdated();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 py-4">Loading general configuration...</div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.name || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Address Line 1</label>
            <input
              type="text"
              name="address_line1"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.address_line1 || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.address_line2 || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span />
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                name="city"
                placeholder="City / Town"
                className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                value={profile?.city || ""}
                onChange={handleChange}
              />
              <input
                type="text"
                name="county"
                placeholder="County"
                className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                value={profile?.county || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span />
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                name="postal_code"
                placeholder="Postcode"
                className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                value={profile?.postal_code || ""}
                onChange={handleChange}
              />
              <MasterDropdown
                type="country"
                value={profile?.country_code || "United Kingdom"}
                onChange={(val) =>
                  setProfile((prev) =>
                    prev ? { ...prev, country_code: val || "" } : null,
                  )
                }
                className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Telephone</label>
            <input
              type="text"
              name="telephone"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.telephone || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Fax</label>
            <input
              type="text"
              name="fax"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.fax || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-start gap-2 pt-1">
            <label className="font-medium text-gray-700 pt-1">
              Additional Printable Info
            </label>
            <textarea
              rows={3}
              name="additional_printable_info"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
              value={profile?.additional_printable_info || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Web Address</label>
            <input
              type="text"
              name="web_address"
              className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={profile?.web_address || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Base Currency</label>

            <CurrencyDropdown
              value={profile?.base_currency} // e.g. "GBP"
              valueKey="code"
              onChange={(val) =>
                setProfile((prev) =>
                  prev ? { ...prev, base_currency: val || "" } : null,
                )
              }
              className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <label className="font-medium text-gray-700">Number of Users</label>
            {/* <input
              type="number"
              disabled
              className="col-span-2 border px-2.5 py-1.5 rounded bg-gray-50 text-gray-500 cursor-not-allowed"
              value={profile?.number_of_users || 100}
            /> */}
            <NumericTextInput
              allowDecimals={false}
              value={Number(profile?.number_of_users) || 100}
              disabled
              onChange={noop}
              className="col-span-2 border px-2.5 py-1.5 rounded bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-3 items-start gap-2 pt-2">
            <label className="font-medium text-gray-700 pt-1">
              Company Logo
            </label>
            <div className="col-span-2 space-y-3">
              <Button
                type="button"
                className="border border-gray-300 px-3 py-1.5 rounded bg-gray-50 hover:bg-gray-100 font-medium text-gray-700"
              >
                Change File
              </Button>
              <div className="p-3 border rounded bg-white w-48 h-20 flex items-center justify-center border-dashed">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 font-semibold tracking-wider">
                    LOGOTYPE
                  </span>
                )}
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1 text-[11px]">
                <p className="font-semibold">Note</p>
                <p>Supported file formats are jpg / png / jpeg</p>
                <p>File size should be less than 2 MB</p>
                <p>For best results, upload with dimensions 200 × 200 px</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={saving} variant="save">
          {saving ? "Saving..." : "Edit / Save"}
        </Button>
        <Button type="button" variant="cancel">
          Cancel
        </Button>
      </div>
    </form>
  );
}
