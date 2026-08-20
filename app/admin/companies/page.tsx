// app/admin/companies/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import DeleteCompanyButton from "@/app/components/admin/DeleteCompanyButton";
import BreadcrumbComp from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import DataTable from "@/app/components/utilities/data-table/DataTable";
import BasicTable from "@/app/components/utilities/basic-table/BasicTable";
import StripedRowTable from "@/app/components/utilities/striped-row-table/StripedRowTable";
import HoverTable from "@/app/components/utilities/hover-table/HoverTable";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Companies",
  },
];

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
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
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

      <BreadcrumbComp title="Companies" items={BCrumb} />

      {/* <div className="flex gap-6 flex-col ">
        <DataTable data={companies} />
      </div> */}

      <div className="border rounded-md">
        <table className="w-full text-xs">
          <thead className=" border-b">
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
