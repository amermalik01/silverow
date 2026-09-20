// hooks/usePurchaseOrderData.ts

"use client";

import { useEffect } from "react";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLineUI,
  PurchaseOrderMasterData,
} from "@/types/purchase-order";

interface Params {
  id?: string;

  setOrder: React.Dispatch<React.SetStateAction<Partial<PurchaseOrder>>>;

  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLineUI[]>>;

  setPrimaryAddress: React.Dispatch<
    React.SetStateAction<Partial<PurchaseOrderAddress>>
  >;

  setBillingAddress: React.Dispatch<
    React.SetStateAction<Partial<PurchaseOrderAddress>>
  >;

  setShippingAddress: React.Dispatch<
    React.SetStateAction<Partial<PurchaseOrderAddress>>
  >;

  setCurrencyConfig: React.Dispatch<
    React.SetStateAction<{
      currency_id: string;
      exchange_rate: number;
    }>
  >;

  setMasterData: React.Dispatch<
    React.SetStateAction<PurchaseOrderMasterData | null>
  >;

  show: (message: string) => void;
  hide: () => void;
}

export function usePurchaseOrderData({
  id,
  setOrder,
  setLines,
  setPrimaryAddress,
  setBillingAddress,
  setShippingAddress,
  setCurrencyConfig,
  setMasterData,
  show,
  hide,
}: Params) {
  useEffect(() => {
    if (!id) return;

    async function loadPurchaseOrder() {
      show("Fetching Record...");

      try {
        const response = await fetch(`/api/purchase-orders/${id}`);
        const payload = await response.json();

        if (!payload?.success || !payload?.data) {
          return;
        }

        const data = payload.data;

        setOrder(data.order || {});
        setLines(data.lines || []);

        setPrimaryAddress(
          data.primary_address || {
            address_type: "primary",
          },
        );

        setBillingAddress(
          data.billing_address || {
            address_type: "billing",
          },
        );

        setShippingAddress(
          data.shipping_address || {
            address_type: "shipping",
          },
        );

        setCurrencyConfig({
          currency_id: data.order?.currency_id || "",
          exchange_rate: data.order?.exchange_rate || 1,
        });
      } catch (error) {
        console.error("Error loading purchase order:", error);
      } finally {
        hide();
      }
    }

    loadPurchaseOrder();
  }, [id]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const response = await fetch("/api/purchase-orders/master-data");

        if (!response.ok) {
          throw new Error("Failed to load master data");
        }

        const data = await response.json();

        setMasterData(data);
      } catch (error) {
        console.error("Failed to load purchase order master data:", error);
      }
    }

    loadMasterData();
  }, []);
}
