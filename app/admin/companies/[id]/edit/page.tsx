// app/admin/companies/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export default function EditCompanyPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetch(`/api/admin/companies`) // In a real app, create a GET /api/admin/companies/[id]
      .then(res => res.json())
      .then((data: Company[]) => {
        const found = data.find((c) => c.id === id);
        setCompany(found || null);
        setLoading(false);
      });
  }, [id]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/admin/companies");
      router.refresh();
    } else {
      setSaving(false);
    //   alert("Failed to update");
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-8">Edit Company: {company?.name}</h1>
      
      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input id="name" name="name" defaultValue={company?.name} required />
        </div>

        <div className="space-y-2">
          <Label>Subdomain (Cannot be changed)</Label>
          <div className="flex gap-2 items-center">
            <Input 
              id="slug" 
              name="slug" 
              value={company?.slug} disabled
              placeholder="acme" 
              required 
              pattern="^[a-z0-9-]+$" 
            />
            <span className="text-muted-foreground text-sm font-mono">.crmsystem.com</span>
          </div>
          <p className="text-[10px] text-gray-400">
            Preview: https://{company?.slug || "your-subdomain"}.crmsystem.com
          </p>
          {/* <Input value={company?.slug} disabled className="" /> */}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select name="status" defaultValue={company?.status} className="w-full h-10 border rounded-md px-3 bg-white">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <select name="plan" defaultValue={company?.plan} className="w-full h-10 border rounded-md px-3 bg-white">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}