// /app/components/sales/returns/hooks/useSalesReturnState.ts

"use client";

import { useState } from "react";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLineUI,
  SalesReturnMasterData,
} from "@/types/sales-return";

import type {
  CustomerSelectionSource,
  TabType,
} from "../types/salesReturnForm.types";

interface UseSalesReturnStateParams {
  id?: string;
  isReadOnly: boolean;
}

export function useSalesReturnState({
  id,
  isReadOnly,
}: UseSalesReturnStateParams) {
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const [saving, setSaving] = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [customerSelectionSource, setCustomerSelectionSource] =
    useState<CustomerSelectionSource>("general");

  const [showCustomerChangeModal, setShowCustomerChangeModal] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [POModalOpen, setPOModalOpen] = useState(false);

  const [SOModalOpen, setSOModalOpen] = useState(false);

  const [SalespersonModalOpen, setSalespersonModalOpen] = useState(false);

  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const [migrationSalesReturnId, setMigrationSalesReturnId] = useState<
    string | null
  >(null);

  const [isEditMode, setIsEditMode] = useState(!isReadOnly);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);

  const [showReceiveAndPostModal, setShowReceiveAndPostModal] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const [masterData, setMasterData] = useState<SalesReturnMasterData | null>(
    null,
  );

  const [returnOrder, setReturnOrder] = useState<Partial<SalesReturn>>({
    credit_note_no: "",

    customer_id: "",
    customer_no: "",
    customer_name: "",

    bill_to_customer_id: "",
    bill_to_customer_no: "",
    bill_to_customer_name: "",

    credit_note_date: new Date().toISOString().split("T")[0],

    posting_date: new Date().toISOString().split("T")[0],

    receipt_date: new Date().toISOString().split("T")[0],

    due_date: new Date().toISOString().split("T")[0],

    status: "draft",

    reference: "",
    notes: "",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesReturnAddress>
  >({
    address_type: "primary",
  });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesReturnAddress>
  >({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesReturnAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<SalesReturnLineUI[]>([]);

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

    supplierModalOpen,
    setSupplierModalOpen,

    POModalOpen,
    setPOModalOpen,

    SOModalOpen,
    setSOModalOpen,

    SalespersonModalOpen,
    setSalespersonModalOpen,

    showMigrationModal,
    setShowMigrationModal,

    migrationSalesReturnId,
    setMigrationSalesReturnId,

    isEditMode,
    setIsEditMode,

    isLoading,
    setIsLoading,

    isUpdatingStatus,
    setIsUpdatingStatus,

    showReceiveModal,
    setShowReceiveModal,

    showCreditNoteModal,
    setShowCreditNoteModal,

    showReceiveAndPostModal,
    setShowReceiveAndPostModal,

    isPosting,
    setIsPosting,

    masterData,
    setMasterData,

    returnOrder,
    setReturnOrder,

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
