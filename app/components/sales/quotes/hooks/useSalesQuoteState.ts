// app/components/sales/quotes/hooks/useSalesQuoteState.ts

import { useState } from "react";
import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLineUI,
  SalesQuoteMasterData,
} from "@/types/sales-quote";

export type TabType = "general" | "invoicing" | "shipping";
export type CustomerSelectionSource =
  | "general"
  | "invoicing"
  | "shipping_agent";

interface UseSalesQuoteStateProps {
  id?: string;
  isReadOnly?: boolean;
  baseCurrencyCode: string;
}

export function useSalesQuoteState({
  id,
  isReadOnly = false,
  baseCurrencyCode,
}: UseSalesQuoteStateProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [customerSelectionSource, setCustomerSelectionSource] =
    useState<CustomerSelectionSource>("general");
  const [showCustomerChangeModal, setShowCustomerChangeModal] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [SalesPersonModalOpen, setSalesPersonModalOpen] = useState(false);
  const [POModalOpen, setPOModalOpen] = useState(false);

  const isNew = !id || id === "new";

  //   const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    if (isReadOnly) return false;
    return isNew; // true for new quotes, false for existing ones
  });

  const [masterData, setMasterData] = useState<SalesQuoteMasterData | null>(
    null,
  );

  const [quote, setQuote] = useState<Partial<SalesQuote>>({
    quote_no: "",
    customer_id: "",
    customer_no: "",
    customer_name: "",
    bill_to_customer_id: "",
    bill_to_customer_no: "",
    bill_to_customer_name: "",
    order_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
    dispatch_date: new Date().toISOString().split("T")[0],
    requested_delivery_date: new Date().toISOString().split("T")[0],
    delivery_date: new Date().toISOString().split("T")[0],
    status: "draft",
    subtotal: 0,
    vat_amount: 0,
    total_amount: 0,
    reference: "",
    notes: "",
    email: "",
    salesperson: "",
    source_of_quote: "Others",
    currency_code: baseCurrencyCode,
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesQuoteAddress>
  >({
    address_type: "primary",
  });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesQuoteAddress>
  >({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesQuoteAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<SalesQuoteLineUI[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  return {
    activeTab,
    setActiveTab,
    saving,
    setSaving,
    validationErrors,
    setValidationErrors,
    customerSelectionSource,
    setCustomerSelectionSource,
    showCustomerChangeModal,
    setShowCustomerChangeModal,
    customerModalOpen,
    setCustomerModalOpen,
    locationModalOpen,
    setLocationModalOpen,
    SalesPersonModalOpen,
    setSalesPersonModalOpen,
    POModalOpen,
    setPOModalOpen,
    isEditMode,
    setIsEditMode,
    masterData,
    setMasterData,
    quote,
    setQuote,
    primaryAddress,
    setPrimaryAddress,
    billingAddress,
    setBillingAddress,
    shippingAddress,
    setShippingAddress,
    lines,
    setLines,
    currencyConfig,
    setCurrencyConfig,
  };
}
