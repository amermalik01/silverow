// app/components/setup/general/company/CompanySetupForm.tsx
"use client";

import { useEffect, useState } from "react";

interface CompanyProfile {
  name: string;
  slug: string;
  legal_name: string;
  tax_identifier: string;
  website: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  inventory_system: string;
  plan: string;
  subscription_status: string;
}

export default function CompanySetupForm() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/setup/general/company")
      .then((res) => {
        if (!res.ok)
          throw new Error("Could not pull organizational settings profiles.");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/setup/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) throw new Error("Could not save operational settings.");
      setMessage({
        type: "success",
        text: "Global organization profiles updated successfully.",
      });
    } catch (err) {
      if (err instanceof Error) {
        setMessage({
          type: "error",
          text: err.message,
        });
      } else {
        setMessage({
          type: "error",
          text: "An unexpected operation failure occurred.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-xs text-gray-500">
        Retrieving operational configurations...
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8  bg-white text-black  p-8 border rounded shadow-sm"
    >
      {/* Dynamic Messaging Box */}
      {message.text && (
        <div
          className={`p-4 border text-xs rounded ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Header Block */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Organization Settings
          </h2>
          <p className="text-xs text-gray-500">
            Configure global metadata structures, localizations, and corporate
            billing details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded font-semibold uppercase">
            Plan: {profile?.plan}
          </span>
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded font-semibold uppercase">
            Status: {profile?.subscription_status}
          </span>
        </div>
      </div>

      {/* Grid Layout Elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Profile Parameters */}
        <div className="space-y-4">
          <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
            Primary Operations Identifiers
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Trading / System Alias Name *
            </label>
            <input
              type="text"
              name="name"
              required
              className="border px-3 py-2 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={profile?.name || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Registered Corporate Legal Name
            </label>
            <input
              type="text"
              name="legal_name"
              className="border px-3 py-2 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={profile?.legal_name || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Tax Registration Reference Number (EIN / VAT / ID)
            </label>
            <input
              type="text"
              name="tax_identifier"
              className="border px-3 py-2 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={profile?.tax_identifier || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">
              Environment System Access URL Slug (Locked)
            </label>
            <input
              type="text"
              disabled
              className="border px-3 py-2 rounded text-xs bg-gray-50 text-gray-400 font-mono cursor-not-allowed"
              value={profile?.slug || ""}
            />
          </div>
        </div>

        {/* Corporate Communication Block */}
        <div className="space-y-4">
          <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
            Corporate Contact Nodes
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Corporate Email Point
            </label>
            <input
              type="email"
              name="email"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.email || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Primary Phone Access
            </label>
            <input
              type="text"
              name="phone"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.phone || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Web URL
            </label>
            <input
              type="text"
              name="website"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.website || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Default Valuation Accounting Model Engine
            </label>
            <select
              name="inventory_system"
              className="border px-3 py-2 rounded text-xs bg-white font-medium"
              value={profile?.inventory_system || "PERIODIC"}
              onChange={handleChange}
            >
              <option value="PERIODIC">
                Periodic Inventory Model Structure
              </option>
              <option value="PERPETUAL">
                Perpetual Synchronous Asset Model Engine
              </option>
            </select>
          </div>
        </div>
      </div>

      <hr className="my-2" />

      {/* Address Matrix Block Fields */}
      <div className="space-y-4">
        <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
          Headquarters & Invoicing Address Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Street Line Address 1
            </label>
            <input
              type="text"
              name="address_line1"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.address_line1 || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Suite / Room Reference (Line 2)
            </label>
            <input
              type="text"
              name="address_line2"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.address_line2 || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              City Target
            </label>
            <input
              type="text"
              name="city"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.city || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              State / Province
            </label>
            <input
              type="text"
              name="state_province"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.state_province || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Postal / ZIP Code
            </label>
            <input
              type="text"
              name="postal_code"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.postal_code || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Country Alpha-3 ID
            </label>
            <input
              type="text"
              name="country_code"
              maxLength={3}
              className="border px-3 py-2 rounded text-xs bg-white font-mono uppercase"
              value={profile?.country_code || "USA"}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Submission Actions Footer Toolbar */}
      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-xs px-6 py-2.5 rounded transition-all shadow-sm"
        >
          {saving
            ? "Persisting Settings Changes..."
            : "Save Configuration Profiles"}
        </button>
      </div>
    </form>
  );
}
