// app/[slug]/sales/customer/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">New Customer</h1>
      </div>
      <PartyForm
        title="Register New Customer Record"
        initialFlags={{ is_customer: true }}
        redirectPath="../customer"
      />
    </div>
  );
}
