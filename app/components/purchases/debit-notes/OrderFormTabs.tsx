// app/components/purchases/debit-notes/OrderFormTabs.tsx

import React from "react";
import { Icon } from "@iconify/react";
import {
  DebitNote,
  DebitNoteMasterData,
  DebitNoteAddress,
  DebitNoteLine,
} from "@/types/debit-note";
import MasterDropdown from "../../common/MasterDropdown";

import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";
import AttachmentsTab from "../../shared/AttachmentsTab";

interface Address {
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

interface CurrencyConfig {
  currency_id: string;
  exchange_rate: number;
}

interface BankAccountItem {
  id: string | number;
  bank_name?: string;
  account_name?: string;
  name?: string;
}

interface NamedOptionItem {
  id: string | number;
  name: string;
  days?: number;
}

type ExtendedMasterData = DebitNoteMasterData & {
  bank_accounts?: BankAccountItem[];
  bankAccounts?: BankAccountItem[];
  payment_terms?: NamedOptionItem[];
  payment_methods?: NamedOptionItem[];
  paymentMethods?: NamedOptionItem[];
};
interface OrderFormTabsProps {
  activeTab: "general" | "invoicing" | "shipping" | "attachments";
  note: Partial<DebitNote>;
  primaryAddress: Address;
  setPrimaryAddress: React.Dispatch<React.SetStateAction<Address>>;
  billingAddress: Address;
  setBillingAddress: React.Dispatch<React.SetStateAction<Address>>;
  shippingAddress: Address;
  setShippingAddress: React.Dispatch<React.SetStateAction<Address>>;
  currencyConfig: CurrencyConfig;
  setCurrencyConfig: React.Dispatch<React.SetStateAction<CurrencyConfig>>;
  masterData: DebitNoteMasterData | null;
  updateField: <K extends keyof DebitNote>(
    field: K,
    value: DebitNote[K],
  ) => void;
  onGeneralSupplierSelect: () => void;
  onInvoicingSupplierSelect: () => void;
  // setSupplierModalOpen: (open: boolean) => void;
  setLocationModalOpen: (open: boolean) => void;
  setPiModalOpen?: (open: boolean) => void;

  // onPurchaseOrderSelect: () => void;
  // onSalesOrderSelect: () => void;
  // onCustomerSelect: () => void;
  onShippingAgentSelect: () => void;

  labelStyle?: string;
  inputStyle?: string;
  inputDateStyle?: string;
  isReadOnly?: boolean;
}

export const OrderFormTabs: React.FC<OrderFormTabsProps> = ({
  activeTab,
  note,
  primaryAddress,
  setPrimaryAddress,
  billingAddress,
  setBillingAddress,
  shippingAddress,
  setShippingAddress,
  currencyConfig,
  setCurrencyConfig,
  masterData,
  updateField,
  // setSupplierModalOpen,
  onGeneralSupplierSelect,
  onInvoicingSupplierSelect,
  setLocationModalOpen,
  setPiModalOpen,

  // onPurchaseOrderSelect,
  // onSalesOrderSelect,
  // onCustomerSelect,
  onShippingAgentSelect,

  labelStyle = "text-xs font-medium text-slate-600 dark:text-slate-400 self-center",
  inputStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
  inputDateStyle = "w-full text-xs px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",

  isReadOnly = false,
}) => {
  const labelcolumnDivStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-2";

  const inputcolumnDivStyle =
    "w-full text-xs px-2 py-1.5 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 disabled:bg-slate-50 dark:disabled:bg-slate-950";

  const selectStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed";

  const maxOrderDate =
    [note.invoice_date, note.req_receipt_date, note.receipt_date]
      .filter(Boolean)
      .map((d) => d!.split("T")[0])
      .sort()[0] ?? "";

  const calculateDueDate = (orderDate: string, days = 0) => {
    if (!orderDate) return "";

    const date = new Date(orderDate);
    date.setDate(date.getDate() + Number(days));

    return date.toISOString().split("T")[0];
  };

  // const isSettingsDisabled = !note.anonymous_supplier;
  const isSettingsDisabled = isReadOnly || !note.anonymous_supplier;

  const typedMasterData = masterData as ExtendedMasterData | null;

  const bankAccounts =
    typedMasterData?.bankAccounts || typedMasterData?.bank_accounts || [];
  const paymentTerms =
    typedMasterData?.paymentTerms || typedMasterData?.payment_terms || [];
  const paymentMethods =
    typedMasterData?.paymentMethods || typedMasterData?.payment_methods || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm w-full min-h-[220px]">
      <div className="h-full overflow-y-auto">
        {/* ---------------- GENERAL TAB ---------------- */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4">
            {/*  lg:grid-cols-[2fr_1fr_1fr_1fr] gap-4*/}
            {/* Column 1 */}
            <div className="space-y-2">
              {/* <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelStyle}>Debit Note No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.debit_note_no || ""}
              />
            </div> */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>
                  Supplier No. <span className="text-red-500">*</span>
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    className={`${inputStyle} font-mono`}
                    value={note.supplier_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onGeneralSupplierSelect}
                    // onClick={() => setSupplierModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Supplier Name</label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={note.supplier_name || ""}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={primaryAddress.address_1 || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        address_1: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 2</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={primaryAddress.address_2 || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        address_2: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            {/* Column 2  */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={primaryAddress.city || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={primaryAddress.county || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        county: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Postcode"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={primaryAddress.postcode || ""}
                    onChange={(e) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        postcode: e.target.value,
                      })
                    }
                  />

                  <MasterDropdown
                    type="country"
                    value={primaryAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setPrimaryAddress({
                        ...primaryAddress,
                        country: val ?? undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={primaryAddress.contact_person || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      contact_person: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Telephone</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={primaryAddress.phone || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Email</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={primaryAddress.email || ""}
                  onChange={(e) =>
                    setPrimaryAddress({
                      ...primaryAddress,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Purchaser</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.purchaser || ""}
                  onChange={(e) => updateField("purchaser", e.target.value)}
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>
                  Apply to PI <span className="text-red-500">*</span>
                </label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputStyle} font-mono`}
                    placeholder="Select PI..."
                    value={note.apply_to_pi || note.linked_po || ""}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      // if (!note.supplier_id) {
                      //   toast.error(
                      //     "Please select a Supplier before applying to PI.",
                      //   );
                      //   return;
                      // }
                      if (setPiModalOpen) setPiModalOpen(true);
                    }}
                    className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier Credit Note No.">
                  Suppl. CN No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  placeholder="e.g. INV-9932"
                  value={note.reference || ""}
                  onChange={(e) => updateField("reference", e.target.value)}
                />
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier Credit Note Date">
                  Suppl. CN Date
                </label>

                <DatePicker
                  value={
                    note.invoice_date ? new Date(note.invoice_date) : undefined
                  }
                  disabled={isReadOnly}
                  containerClassName="col-span-8"
                  minDate={
                    note.order_date ? new Date(note.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "invoice_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Date Dispatch</label>

                <DatePicker
                  value={
                    note.order_date ? new Date(note.order_date) : undefined
                  }
                  disabled={isReadOnly}
                  containerClassName="col-span-8"
                  maxDate={maxOrderDate ? new Date(maxOrderDate) : undefined}
                  onChange={(date) => {
                    const formattedDate = date
                      ? format(date, "yyyy-MM-dd")
                      : "";
                    updateField("order_date", formattedDate);

                    const selected = typedMasterData?.paymentTerms?.find(
                      (x) => x.id === note.payment_terms_id,
                    );

                    if (selected && formattedDate) {
                      updateField(
                        "due_date",
                        calculateDueDate(formattedDate, selected.days),
                      );
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Supplier Receipt Date">
                  Suppl. Rec. Date
                </label>

                <DatePicker
                  value={
                    note.receipt_date ? new Date(note.receipt_date) : undefined
                  }
                  disabled={isReadOnly}
                  containerClassName="col-span-8"
                  minDate={
                    note.order_date ? new Date(note.order_date) : undefined
                  }
                  onChange={(date) =>
                    updateField(
                      "receipt_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- INVOICING TAB ---------------- */}
        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4 ">
            {/* Column 1 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Pay to Suppl. No.</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    className={`${inputStyle} font-mono`}
                    value={note.pay_to_supplier_no || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onInvoicingSupplierSelect}
                    // onClick={() => setSupplierModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Name</label>
                <input
                  type="text"
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={note.pay_to_supplier_name || ""}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={billingAddress.address_1 || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        address_1: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 2</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={billingAddress.address_2 || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        address_2: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={billingAddress.city || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    className={inputStyle}
                    disabled={isSettingsDisabled}
                    value={billingAddress.county || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        county: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Postcode"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={billingAddress.postcode || ""}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        postcode: e.target.value,
                      })
                    }
                  />

                  <MasterDropdown
                    type="country"
                    value={billingAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setBillingAddress({
                        ...billingAddress,
                        country: val ?? undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            {/* Column 3 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={billingAddress.contact_person || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      contact_person: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Telephone</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className={inputStyle}
                  value={billingAddress.phone || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Email</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className={inputStyle}
                  value={billingAddress.email || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Payable Bank</label>
                <select
                  disabled={isReadOnly}
                  className={inputStyle}
                  value={note.payable_bank || ""}
                  onChange={(e) => updateField("payable_bank", e.target.value)}
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id || b.account_name}>
                      {b.bank_name || b.account_name || b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Payment Terms</label>
                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.payment_terms_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentTerms.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_terms_id", val);
                    updateField("payment_terms", selected?.name || "");

                    if (note.order_date && selected) {
                      updateField(
                        "due_date",
                        calculateDueDate(note.order_date, selected.days),
                      );
                    }
                  }}
                >
                  <option value="">Select...</option>
                  {paymentTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Payment Method</label>
                <select
                  className={inputStyle}
                  disabled={isSettingsDisabled}
                  value={note.payment_method_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = paymentMethods.find(
                      (x) => String(x.id) === String(val),
                    );

                    updateField("payment_method_id", val);
                    updateField("payment_method", selected?.name || "");
                  }}
                >
                  <option value="">Select...</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column 5 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={isSettingsDisabled}
                  className={inputStyle}
                  value={currencyConfig.currency_id ?? ""}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const matched = masterData?.currencies.find(
                      (c) => c.id === targetId,
                    );
                    setCurrencyConfig({
                      currency_id: targetId,
                      exchange_rate: matched ? matched.exchange_rate : 1,
                    });
                  }}
                >
                  <option value="">Select Currency...</option>
                  {masterData?.currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SHIPPING TAB ---------------- */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 space-x-2 gap-4">
            {/* Column 1 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Location Name</label>

                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    className={`${inputStyle} font-mono`}
                    value={shippingAddress.name || "Click Select..."}
                  />
                  <button
                    type="button"
                    disabled={isReadOnly || !note.supplier_id}
                    // disabled={isSettingsDisabled || !note.supplier_id}
                    onClick={() => setLocationModalOpen(true)}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 1</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={shippingAddress.address_1 || ""}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        address_1: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Address Line 2</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={shippingAddress.address_2 || ""}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        address_2: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>City</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={shippingAddress.city || ""}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>County</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    disabled={isSettingsDisabled}
                    className={inputStyle}
                    value={shippingAddress.county || ""}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        county: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Postcode/Co.</label>
                <div className="col-span-8 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Postcode"
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    value={shippingAddress.postcode || ""}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        postcode: e.target.value,
                      })
                    }
                  />
                  <MasterDropdown
                    type="country"
                    value={shippingAddress.country || "United Kingdom"}
                    disabled={isSettingsDisabled}
                    className={inputcolumnDivStyle}
                    onChange={(val) =>
                      setShippingAddress({
                        ...shippingAddress,
                        country: val ?? undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              {/* <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Contact</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.contact || ""}
                  onChange={(e) => updateField("contact", e.target.value)}
                />
              </div> */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Contact</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.book_in_contact || ""}
                  onChange={(e) =>
                    updateField("book_in_contact", e.target.value)
                  }
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Tel No.</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.book_in_phone || ""}
                  onChange={(e) => updateField("book_in_phone", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Book In Email</label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.book_in_email || ""}
                  onChange={(e) => updateField("book_in_email", e.target.value)}
                />
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Shipping Agent</label>
                <div className="col-span-8 flex gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={inputStyle}
                    value={note.shipping_agent || ""}
                    onChange={(e) =>
                      updateField("shipping_agent", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onShippingAgentSelect}
                    className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
                {/* <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.shipping_agent || ""}
                  onChange={(e) =>
                    updateField("shipping_agent", e.target.value)
                  }
                /> */}
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Shipment Method">
                  Shipt. Method
                </label>
                <select
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.shipment_method_id || ""}
                  onChange={(e) => {
                    const selected = masterData?.shipmentMethods.find(
                      (x) => x.id === e.target.value,
                    );

                    updateField("shipment_method_id", e.target.value);
                    updateField("shipment_method", selected?.name || "");
                  }}
                >
                  <option value="">Select...</option>

                  {masterData?.shipmentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Shipment Reference No.">
                  Shipt. Ref. No.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.shipment_ref_no || ""}
                  onChange={(e) =>
                    updateField("shipment_ref_no", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle} title="Warehouse Reference No.">
                  Warehouse Ref.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.warehouse_booking_ref_no || ""}
                  onChange={(e) =>
                    updateField("warehouse_booking_ref_no", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label
                  className={labelStyle}
                  title="Supplier Booking Reference No."
                >
                  Suppl. W/H Ref.
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.supplier_booking_ref_no || ""}
                  onChange={(e) =>
                    updateField("supplier_booking_ref_no", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Column 5 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Shipment Date</label>

                <DatePicker
                  value={
                    note.shipment_date
                      ? new Date(note.shipment_date)
                      : undefined
                  }
                  containerClassName="col-span-8"
                  disabled={isReadOnly}
                  onChange={(date) =>
                    updateField(
                      "shipment_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Delivery Date</label>

                <DatePicker
                  value={
                    note.delivery_date
                      ? new Date(note.delivery_date)
                      : undefined
                  }
                  disabled={isReadOnly}
                  containerClassName="col-span-8"
                  onChange={(date) =>
                    updateField(
                      "delivery_date",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Delivery Time</label>
                <input
                  type="time"
                  className={inputStyle}
                  disabled={isReadOnly}
                  value={note.delivery_time?.split("T")[0] ?? ""}
                  onChange={(e) => updateField("delivery_time", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 items-center gap-2">
                <label className={labelStyle}>Freight Charges</label>

                <NumericTextInput
                  value={note.freight_charges ?? 0}
                  disabled={isReadOnly}
                  allowDecimals
                  decimalScale={2}
                  onChange={(val) =>
                    updateField("freight_charges", Number(val))
                  }
                  className={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Attachments TAB ---------------- */}
        {activeTab === "attachments" && note.id && (
          <AttachmentsTab module="debit_note" recordId={note.id} />
        )}
      </div>
    </div>
  );
};
