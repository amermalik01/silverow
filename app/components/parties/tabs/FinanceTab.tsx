// app/components/parties/tabs/FinanceTab.tsx

"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party } from "@/types/erp";
// Lookup Modal Imports
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

type Option = {
  id: string | number;
  name: string;
};

type OptionBank = {
  id: string | number;
  bank_name: string;
};

type MasterData = {
  postingGroups: Option[];
  payableBanks: OptionBank[];
  paymentTerms: Option[];
  paymentMethods: Option[];
};

type Props = {
  account: Partial<Party>;
  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;
  isReadonly?: boolean;
  errors?: Record<string, string>;
};

export default function FinanceTab({
  account,
  setAccount,
  isReadonly = false,
  errors = {},
}: Props) {
  const [masterData, setMasterData] = useState<MasterData>({
    postingGroups: [],
    payableBanks: [],
    paymentTerms: [],
    paymentMethods: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedReceivableGL, setSelectedReceivableGL] =
    useState<GLAccountLookupRecord | null>(null);
  const [selectedPayableGL, setSelectedPayableGL] =
    useState<GLAccountLookupRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    const targetModule = account.is_customer ? "sales" : "purchases";

    async function fetchMasterData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/parties/finance-master-data?moduleType=${targetModule}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMasterData(data);
          }
        }
      } catch (err) {
        console.error("Failed to load finance master data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, [account.is_customer]);

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const isCustomer = !!account.is_customer;
  const activeGlField = isCustomer
    ? "gl_account_receivable"
    : "gl_account_payable";

  /* 
  const getInputClass = (errorKey: string) =>
    `w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white ${
      errors[errorKey]
        ? "border-red-500 bg-red-50/10"
        : "border-slate-300 dark:border-slate-700"
    }`; */

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const handleSelectGLAccount = (gl: GLAccountLookupRecord) => {
    if (isCustomer) {
      setSelectedReceivableGL(gl);
      updateField("gl_account_receivable", gl.id);
    } else {
      setSelectedPayableGL(gl);
      updateField("gl_account_payable", gl.id);
    }
    setIsModalOpen(false);
  };

  const getGlDisplayLabel = () => {
    if (isCustomer) {
      // 1. If newly selected via modal in current session
      if (selectedReceivableGL) {
        return `${selectedReceivableGL.code} - ${selectedReceivableGL.name}`;
      }
      // 2. If loaded from database with joined columns
      if (
        account.gl_account_receivable_code &&
        account.gl_account_receivable_name
      ) {
        return `${account.gl_account_receivable_code} - ${account.gl_account_receivable_name}`;
      }
      // 3. Fallback
      return account.gl_account_receivable || "";
    } else {
      // 1. If newly selected via modal in current session
      if (selectedPayableGL) {
        return `${selectedPayableGL.code} - ${selectedPayableGL.name}`;
      }
      // 2. If loaded from database with joined columns
      if (account.gl_account_payable_code && account.gl_account_payable_name) {
        return `${account.gl_account_payable_code} - ${account.gl_account_payable_name}`;
      }
      // 3. Fallback
      return account.gl_account_payable || "";
    }
  };

  // 2. Compute display value safely
  // const currentGlDisplay = isCustomer
  //   ? selectedReceivableGL
  //     ? `${selectedReceivableGL.code} - ${selectedReceivableGL.name}`
  //     : account.gl_account_receivable || ""
  //   : selectedPayableGL
  //     ? `${selectedPayableGL.code} - ${selectedPayableGL.name}`
  //     : account.gl_account_payable || "";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Contact Person
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_contact_person || ""}
                onChange={(e) =>
                  updateField("finance_contact_person", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_contact_person")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                placeholder="e.g. myname@example.com"
                value={account.finance_email || ""}
                onChange={(e) => updateField("finance_email", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_email")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Telephone
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_phone || ""}
                onChange={(e) => updateField("finance_phone", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_phone")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Fax
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_fax || ""}
                onChange={(e) => updateField("finance_fax", e.target.value)}
                disabled={isReadonly}
                className={getInputClass("finance.finance_fax")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Alt. Contact Person
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.finance_alt_contact || ""}
                onChange={(e) =>
                  updateField("finance_alt_contact", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_alt_contact")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Alt. Contact Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                value={account.finance_alt_email || ""}
                onChange={(e) =>
                  updateField("finance_alt_email", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass("finance.finance_alt_email")}
              />
            </div>
          </div>

          {!isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Terms
                </label>
                <div className="col-span-2">
                  <select
                    value={account.payment_terms || ""}
                    onChange={(e) =>
                      updateField("payment_terms", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_terms")}
                  >
                    <option value="">Select Payment Terms</option>
                    {masterData.paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <div className="col-span-2">
                  <select
                    value={account.payment_method || ""}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_method")}
                  >
                    <option value="">Select Payment Method</option>
                    {masterData.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* E-Generate Options */}
          <div className="grid grid-cols-3 gap-2 items-center pt-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              E-Generate
            </label>
            <div className="col-span-2 flex flex-wrap gap-4 text-xs">
              {isCustomer ? (
                <>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_reminder}
                      onChange={(e) =>
                        updateField("e_reminder", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Reminder
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_statement}
                      onChange={(e) =>
                        updateField("e_statement", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Statement
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_invoice}
                      onChange={(e) =>
                        updateField("e_invoice", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Invoice
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_purchase_order}
                      onChange={(e) =>
                        updateField("e_purchase_order", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Purchase Order
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_debit_note}
                      onChange={(e) =>
                        updateField("e_debit_note", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Debit Note
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!account.e_remittance_advice}
                      onChange={(e) =>
                        updateField("e_remittance_advice", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    E-Remittance Advice
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger / Banking Configuration */}
        <div className="space-y-3">
          {!isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Company Reg. No.
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={account.company_reg_no || ""}
                    onChange={(e) =>
                      updateField("company_reg_no", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.company_reg_no")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Supplier VAT No.
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={account.supplier_vat_no || ""}
                    onChange={(e) =>
                      updateField("supplier_vat_no", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.supplier_vat_no")}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Payable Bank
            </label>
            <div className="col-span-2">
              <select
                value={account.payable_bank || ""}
                onChange={(e) => updateField("payable_bank", e.target.value)}
                disabled={isReadonly || loading}
                className={getInputClass("finance.payable_bank")}
              >
                <option value="">Select Payable Bank</option>
                {masterData.payableBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isCustomer
                ? "Default G/L Account Receivable"
                : "Default G/L Account Payable"}
            </label>
            <div className="col-span-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  placeholder="Choose G/L..."
                  // value={account[activeGlField] || ""}
                  value={getGlDisplayLabel()}
                  disabled={isReadonly}
                  className={`${getInputClass(`finance.${activeGlField}`)} font-mono cursor-pointer`}
                  onClick={() => !isReadonly && setIsModalOpen(true)}
                />

                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 transition"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
              {/* <div className="flex gap-1">
                <input
                  type="text"
                  value={
                    isCustomer
                      ? account.gl_account_receivable || ""
                      : account.gl_account_payable || ""
                  }
                  onChange={(e) =>
                    updateField(
                      isCustomer
                        ? "gl_account_receivable"
                        : "gl_account_payable",
                      e.target.value,
                    )
                  }
                  disabled={isReadonly}
                  className={getInputClass(
                    isCustomer
                      ? "finance.gl_account_receivable"
                      : "finance.gl_account_payable",
                  )}
                />

                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() => setIsModalOpen(true)}
                  className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div> */}
            </div>
          </div>

          {isCustomer && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment
                </label>
                <div className="col-span-2 flex gap-2">
                  <select
                    value={account.payment_terms || ""}
                    onChange={(e) =>
                      updateField("payment_terms", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_terms")}
                  >
                    <option value="">Select Payment Terms</option>
                    {masterData.paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={account.payment_method || ""}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    disabled={isReadonly || loading}
                    className={getInputClass("finance.payment_method")}
                  >
                    <option value="">Select Payment Method</option>
                    {masterData.paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Finance Charge
                </label>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={account.finance_charge || ""}
                    onChange={(e) =>
                      updateField("finance_charge", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.finance_charge")}
                  />
                  <input
                    type="checkbox"
                    checked={!!account.has_finance_charge}
                    onChange={(e) =>
                      updateField("has_finance_charge", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Insurance Charge
                </label>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={account.insurance_charge || ""}
                    onChange={(e) =>
                      updateField("insurance_charge", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.insurance_charge")}
                  />
                  <input
                    type="checkbox"
                    checked={!!account.has_insurance_charge}
                    onChange={(e) =>
                      updateField("has_insurance_charge", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  VAT No.
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={account.vat_reg_no || ""}
                    onChange={(e) => updateField("vat_reg_no", e.target.value)}
                    disabled={isReadonly}
                    className={getInputClass("finance.vat_reg_no")}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Posting Group <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                value={account.posting_group || ""}
                onChange={(e) => updateField("posting_group", e.target.value)}
                disabled={isReadonly || loading}
                className={getInputClass("finance.posting_group")}
              >
                <option value="">Select Posting Group</option>
                {masterData.postingGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isCustomer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Exclude From Creditors Aging Report
              </label>
              <div className="col-span-2">
                <input
                  type="checkbox"
                  checked={!!account.exclude_from_aging_report}
                  onChange={(e) =>
                    updateField("exclude_from_aging_report", e.target.checked)
                  }
                  disabled={isReadonly}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lower Section: Bank Account Details */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isCustomer
              ? "Customer Bank Account Details"
              : "Supplier Bank Account Details"}
          </h3>

          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Account Name
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_account_name || ""}
                  onChange={(e) =>
                    updateField("bank_account_name", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_account_name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Sort Code / Account No.
              </label>
              <div className="col-span-2 grid grid-cols-2 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Sort Code"
                  value={account.bank_sort_code || ""}
                  onChange={(e) =>
                    updateField("bank_sort_code", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_sort_code")}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    Account No.
                  </span>
                  <input
                    type="text"
                    placeholder="Account No."
                    value={account.bank_account_no || ""}
                    onChange={(e) =>
                      updateField("bank_account_no", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass("finance.bank_account_no")}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Swift/BIC
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_swift_bic || ""}
                  onChange={(e) =>
                    updateField("bank_swift_bic", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_swift_bic")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                IBAN
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_iban || ""}
                  onChange={(e) => updateField("bank_iban", e.target.value)}
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_iban")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Bank Name
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_name || ""}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Bank Address
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={account.bank_address || ""}
                  onChange={(e) => updateField("bank_address", e.target.value)}
                  disabled={isReadonly}
                  className={getInputClass("finance.bank_address")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <GLAccountLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectGLAccount}
        multiple={false}
      />
    </div>
  );
}
