// hooks/useSalesOrderData.ts

"use client";

import { useEffect } from "react";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLineUI,
  SalesOrderMasterData,
} from "@/types/sales-order";

interface Params {
  id?: string;

  setOrder: React.Dispatch<React.SetStateAction<Partial<SalesOrder>>>;

  setLines: React.Dispatch<React.SetStateAction<SalesOrderLineUI[]>>;

  setPrimaryAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesOrderAddress>>
  >;

  setBillingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesOrderAddress>>
  >;

  setShippingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesOrderAddress>>
  >;

  setCurrencyConfig: React.Dispatch<
    React.SetStateAction<{
      currency_id: string;
      exchange_rate: number;
    }>
  >;

  setMasterData: React.Dispatch<
    React.SetStateAction<SalesOrderMasterData | null>
  >;

  show: (message: string) => void;
  hide: () => void;
}

export function useSalesOrderData({
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

    async function loadSalesOrder() {
      show("Fetching Record...");

      try {
        const response = await fetch(`/api/sales-orders/${id}`);

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
        console.error("Error loading sales order:", error);
      } finally {
        hide();
      }
    }

    loadSalesOrder();
  }, [
    id,
    setOrder,
    setLines,
    setPrimaryAddress,
    setBillingAddress,
    setShippingAddress,
    setCurrencyConfig,
    show,
    hide,
  ]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const response = await fetch("/api/sales-orders/master-data");

        if (!response.ok) {
          throw new Error("Failed to load master data");
        }

        const data = await response.json();

        setMasterData(data);
      } catch (error) {
        console.error("Failed to load sales order master data:", error);
      }
    }

    loadMasterData();
  }, [setMasterData]);
}
