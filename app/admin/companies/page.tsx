// app/admin/companies/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import DeleteCompanyButton from "@/app/components/admin/DeleteCompanyButton";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Relative URLs work here because this runs in the BROWSER
    fetch("/api/admin/companies")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load companies", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading companies...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-muted-foreground">
          Manage your SaaS tenants and subscriptions.
        </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">Add New</Link>
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className=" border-b">{/* bg-gray-50 */}
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Slug</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company: Company) => (
              <tr key={company.id} className="border-b">
                <td className="p-4">{company.name}</td>
                <td className="p-4">{company.slug}</td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/companies/${company.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <DeleteCompanyButton id={company.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
/* import Link from "next/link";
import { Button } from "@/components/ui/button";
import DeleteCompanyButton from "@/app/components/admin/DeleteCompanyButton";

async function getCompanies() {
  // Use absolute URL for server-side fetch or call DB directly
  // For simplicity here, we call the API logic or the DB
  const { pool } = await import("@/lib/db");
  const res = await pool.query("SELECT * FROM companies ORDER BY created_at DESC");
  return res.rows;
}

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage your SaaS tenants and subscriptions.</p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">Add Company</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-left font-semibold">Company</th>
              <th className="p-4 text-left font-semibold">Subdomain</th>
              <th className="p-4 text-left font-semibold">Plan</th>
              <th className="p-4 text-left font-semibold">Status</th>
              <th className="p-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium">{company.name}</td>
                <td className="p-4 text-blue-600 font-mono text-xs">{company.slug}.crmsystem.com</td>
                <td className="p-4"><span className="capitalize">{company.plan}</span></td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {company.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/companies/${company.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteCompanyButton id={company.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} */
