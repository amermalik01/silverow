// components/crm/CRMFormTabs.tsx

"use client";

import React, { useEffect, useState } from "react";

type CRMAccount = {
  id: string;
  name: string;
  crm_code: string;
  customer_code: string;
  type: "lead" | "customer";
};

export default function CRMList() {
  const [data, setData] = useState<CRMAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/crm/accounts")
      .then((res) => res.json())
      .then((accounts: CRMAccount[]) => {
        setData(accounts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch CRM accounts:", err);
        setLoading(false);
      });
  }, []);

  const convertToCustomer = async (id: string) => {
    try {
      await fetch("/api/crm/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: id,
          company_id: "YOUR_COMPANY_ID",
        }),
      });

      setData((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, type: "customer" } : acc
        )
      );
    } catch (error) {
      console.error("Conversion failed:", error);
    }
  };

  if (loading) {
    return <p>Loading CRM accounts...</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">CRM Code</th>
            <th className="p-2 text-left">Customer Code</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((account) => (
            <tr key={account.id} className="border-b border-gray-200">
              <td className="p-2">{account.name}</td>
              <td className="p-2">{account.crm_code}</td>
              <td className="p-2">{account.customer_code}</td>
              <td className="p-2">
                {account.type === "lead" ? (
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => convertToCustomer(account.id)}
                  >
                    Convert to Customer
                  </button>
                ) : (
                  <span className="text-gray-500">Already Customer</span>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="p-2 text-center text-gray-500">
                No CRM accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}