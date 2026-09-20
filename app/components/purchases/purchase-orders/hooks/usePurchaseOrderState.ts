// hooks/usePurchaseOrderState.ts

"use client";

import { useState } from "react";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLineUI,
  PurchaseOrderMasterData,
} from "@/types/purchase-order";

import type {
  SupplierSelectionSource,
  TabType,
} from "../types/purchaseOrderForm.types";

interface UsePurchaseOrderStateParams {
  id?: string;
  isReadOnly: boolean;
}

export function usePurchaseOrderState({
  id,
  isReadOnly,
}: UsePurchaseOrderStateParams) {
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [supplierSelectionSource, setSupplierSelectionSource] =
    useState<SupplierSelectionSource>("general");

  const [showSupplierChangeModal, setShowSupplierChangeModal] = useState(false);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [POModalOpen, setPOModalOpen] = useState(false);
  const [SOModalOpen, setSOModalOpen] = useState(false);
  const [PurchaserModalOpen, setPurchaserModalOpen] = useState(false);

  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const [migrationPurchaseOrderId, setMigrationPurchaseOrderId] = useState<
    string | null
  >(null);

  const [isEditMode, setIsEditMode] = useState(!isReadOnly);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiveAndPostModal, setShowReceiveAndPostModal] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const [masterData, setMasterData] = useState<PurchaseOrderMasterData | null>(
    null,
  );

  const [order, setOrder] = useState<Partial<PurchaseOrder>>({
    order_no: "",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",

    pay_to_supplier_id: "",
    pay_to_supplier_no: "",
    pay_to_supplier_name: "",

    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],

    status: "draft",
    reference: "",
    notes: "",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({
    address_type: "primary",
  });

  const [billingAddress, setBillingAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<PurchaseOrderLineUI[]>([]);

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

    supplierSelectionSource,
    setSupplierSelectionSource,

    showSupplierChangeModal,
    setShowSupplierChangeModal,

    supplierModalOpen,
    setSupplierModalOpen,

    locationModalOpen,
    setLocationModalOpen,

    customerModalOpen,
    setCustomerModalOpen,

    POModalOpen,
    setPOModalOpen,

    SOModalOpen,
    setSOModalOpen,

    PurchaserModalOpen,
    setPurchaserModalOpen,

    showMigrationModal,
    setShowMigrationModal,

    migrationPurchaseOrderId,
    setMigrationPurchaseOrderId,

    isEditMode,
    setIsEditMode,

    isLoading,
    setIsLoading,

    isUpdatingStatus,
    setIsUpdatingStatus,

    showReceiveModal,
    setShowReceiveModal,

    showInvoiceModal,
    setShowInvoiceModal,

    showReceiveAndPostModal,
    setShowReceiveAndPostModal,

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
