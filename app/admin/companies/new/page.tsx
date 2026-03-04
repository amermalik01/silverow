// app/admin/companies/new/page.tsx
"use client";

import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State for slug management
  const [slug, setSlug] = useState("");
  const [isAutoSlug, setIsAutoSlug] = useState(true);

  // Helper function to clean the string
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special chars
      .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nameValue = e.target.value;
    if (isAutoSlug) {
      setSlug(generateSlug(nameValue));
    }
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    // If user types in the slug field directly, stop auto-generating
    setIsAutoSlug(false);
    setSlug(generateSlug(e.target.value));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/admin/companies");
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New Company</h1>
        <p className="text-gray-500">Set up a new tenant on your platform.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Acme Inc."
            required
            onChange={handleNameChange}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="slug">Subdomain Slug</Label>
            {!isAutoSlug && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setIsAutoSlug(true)}
              >
                Reset to automatic
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="acme"
              required
              pattern="^[a-z0-9-]+$"
            />
            <span className="text-muted-foreground text-sm font-mono">
              .crmsystem.com
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            Preview: https://{slug || "your-subdomain"}.crmsystem.com
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan">Initial Plan</Label>
          <select
            name="plan"
            className="w-full h-10 border rounded-md px-3 bg-white"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Admin Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Initial Company Admin</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                name="adminName"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                name="adminEmail"
                type="email"
                placeholder="admin@company.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Initial Password</Label>
            <Input
              id="adminPassword"
              name="adminPassword"
              type="password"
              required
            />
            <p className="text-xs text-muted-foreground">
              Give this password to the company owner.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Company"}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/companies">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
