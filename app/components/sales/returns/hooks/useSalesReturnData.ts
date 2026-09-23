// app/components/sales/returns/hooks/useSalesReturnData.ts

"use client";

import { useEffect } from "react";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLineUI,
  SalesReturnMasterData,
} from "@/types/sales-return";

interface Params {
  id?: string;

  setReturnOrder: React.Dispatch<React.SetStateAction<Partial<SalesReturn>>>;

  setLines: React.Dispatch<React.SetStateAction<SalesReturnLineUI[]>>;

  setPrimaryAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesReturnAddress>>
  >;

  setBillingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesReturnAddress>>
  >;

  setShippingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesReturnAddress>>
  >;

  setCurrencyConfig: React.Dispatch<
    React.SetStateAction<{
      currency_id: string;
      exchange_rate: number;
    }>
  >;

  setMasterData: React.Dispatch<
    React.SetStateAction<SalesReturnMasterData | null>
  >;

  show: (message: string) => void;
  hide: () => void;
}

export function useSalesReturnData({
  id,
  setReturnOrder,
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

    async function loadSalesReturn() {
      show("Fetching Record...");

      try {
        const response = await fetch(`/api/sales/returns/${id}`);

        const payload = await response.json();

        if (!payload?.success || !payload?.data) {
          return;
        }

        const data = payload.data;

        setReturnOrder(data.return || {});
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
          currency_id: data.return?.currency_id || "",
          exchange_rate: data.return?.exchange_rate || 1,
        });
      } catch (error) {
        console.error("Error loading sales return:", error);
      } finally {
        hide();
      }
    }

    loadSalesReturn();
  }, [
    id,
    setReturnOrder,
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
        const response = await fetch("/api/sales/returns/master-data");

        if (!response.ok) {
          throw new Error("Failed to load master data");
        }

        const data = await response.json();

        setMasterData(data);
      } catch (error) {
        console.error("Failed to load sales return master data:", error);
      }
    }

    loadMasterData();
  }, [setMasterData]);
}
