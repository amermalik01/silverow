// hooks/useSalesOrderState.ts

"use client";

import { useState } from "react";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLineUI,
  SalesOrderMasterData,
} from "@/types/sales-order";

import type {
  CustomerSelectionSource,
  TabType,
} from "../types/salesOrderForm.types";

interface UseSalesOrderStateParams {
  id?: string;
  isReadOnly: boolean;
}

export function useSalesOrderState({
  id,
  isReadOnly,
}: UseSalesOrderStateParams) {
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

  const [migrationSalesOrderId, setMigrationSalesOrderId] = useState<
    string | null
  >(null);

  const [isEditMode, setIsEditMode] = useState(!isReadOnly);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [showDispatchModal, setShowDispatchModal] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showDispatchAndPostModal, setShowDispatchAndPostModal] =
    useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const [masterData, setMasterData] = useState<SalesOrderMasterData | null>(
    null,
  );

  const [order, setOrder] = useState<Partial<SalesOrder>>({
    order_no: "",

    customer_id: "",
    customer_no: "",
    customer_name: "",

    bill_to_customer_id: "",
    bill_to_customer_no: "",
    bill_to_customer_name: "",

    order_date: new Date().toISOString().split("T")[0],

    // expected_date: "",

    posting_date: new Date().toISOString().split("T")[0],

    shipment_date: new Date().toISOString().split("T")[0],

    due_date: new Date().toISOString().split("T")[0],

    status: "draft",

    reference: "",
    notes: "",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesOrderAddress>
  >({
    address_type: "primary",
  });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesOrderAddress>
  >({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesOrderAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);

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

    migrationSalesOrderId,
    setMigrationSalesOrderId,

    isEditMode,
    setIsEditMode,

    isLoading,
    setIsLoading,

    isUpdatingStatus,
    setIsUpdatingStatus,

    showDispatchModal,
    setShowDispatchModal,

    showInvoiceModal,
    setShowInvoiceModal,

    showDispatchAndPostModal,
    setShowDispatchAndPostModal,

    isPosting,
    setIsPosting,

    masterData,
    setMasterData,

    order,
    setOrder,

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
