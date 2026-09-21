// app/components/sales/quotes/hooks/useSalesQuoteData.ts

import { useEffect } from "react";
import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLineUI,
  SalesQuoteMasterData,
} from "@/types/sales-quote";

interface UseSalesQuoteDataProps {
  id?: string;
  showLoader: (msg?: string) => void;
  hideLoader: () => void;
  setQuote: React.Dispatch<React.SetStateAction<Partial<SalesQuote>>>;
  setLines: React.Dispatch<React.SetStateAction<SalesQuoteLineUI[]>>;
  setPrimaryAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setBillingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setShippingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setCurrencyConfig: React.Dispatch<
    React.SetStateAction<{ currency_id: string; exchange_rate: number }>
  >;
  setMasterData: React.Dispatch<
    React.SetStateAction<SalesQuoteMasterData | null>
  >;
}

export function useSalesQuoteData({
  id,
  showLoader,
  hideLoader,
  setQuote,
  setLines,
  setPrimaryAddress,
  setBillingAddress,
  setShippingAddress,
  setCurrencyConfig,
  setMasterData,
}: UseSalesQuoteDataProps) {
  useEffect(() => {
    if (!id || id === "new") return;

    showLoader("Fetching Record...");

    fetch(`/api/sales/sales-quotes/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hideLoader();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          // ✅ Updated from actualData.order to actualData.quote
          setQuote(actualData.quote || actualData.order || {});
          setLines(actualData.lines || []);

          setPrimaryAddress(
            actualData.primary_address || { address_type: "primary" },
          );
          setBillingAddress(
            actualData.billing_address || { address_type: "billing" },
          );
          setShippingAddress(
            actualData.shipping_address || { address_type: "shipping" },
          );

          // ✅ Updated currency fallback check
          const activeQuote = actualData.quote || actualData.order;
          setCurrencyConfig({
            currency_id: activeQuote?.currency_id || "",
            exchange_rate: activeQuote?.exchange_rate || 1,
          });
        }
      })
      .catch((err) => {
        hideLoader();
        console.error("Error hydrating historical sales quote matrix:", err);
      });
  }, [id]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/sales/sales-orders/master-data");
        if (!res.ok) throw new Error();

        const data = await res.json();
        setMasterData(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadMasterData();
  }, []);

  const refreshLines = async (quoteId?: string) => {
    if (!quoteId || quoteId === "new") return;

    const response = await fetch(`/api/sales/sales-quotes/${quoteId}/lines`);
    const data = await response.json();

    setLines(data.lines ?? []);
  };

  return {
    refreshLines,
  };
}

/* import { useEffect } from "react";
import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLineUI,
  SalesQuoteMasterData,
} from "@/types/sales-quote";

interface UseSalesQuoteDataProps {
  id?: string;
  showLoader: (msg?: string) => void;
  hideLoader: () => void;
  setQuote: React.Dispatch<React.SetStateAction<Partial<SalesQuote>>>;
  setLines: React.Dispatch<React.SetStateAction<SalesQuoteLineUI[]>>;
  setPrimaryAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setBillingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setShippingAddress: React.Dispatch<
    React.SetStateAction<Partial<SalesQuoteAddress>>
  >;
  setCurrencyConfig: React.Dispatch<
    React.SetStateAction<{ currency_id: string; exchange_rate: number }>
  >;
  setMasterData: React.Dispatch<
    React.SetStateAction<SalesQuoteMasterData | null>
  >;
}

export function useSalesQuoteData({
  id,
  showLoader,
  hideLoader,
  setQuote,
  setLines,
  setPrimaryAddress,
  setBillingAddress,
  setShippingAddress,
  setCurrencyConfig,
  setMasterData,
}: UseSalesQuoteDataProps) {
  useEffect(() => {
    if (!id || id === "new") return;

    showLoader("Fetching Record...");

    fetch(`/api/sales/sales-quotes/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hideLoader();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          setQuote(actualData.order || {});
          setLines(actualData.lines || []);

          setPrimaryAddress(
            actualData.primary_address || { address_type: "primary" },
          );
          setBillingAddress(
            actualData.billing_address || { address_type: "billing" },
          );
          setShippingAddress(
            actualData.shipping_address || { address_type: "shipping" },
          );

          setCurrencyConfig({
            currency_id: actualData.order?.currency_id || "",
            exchange_rate: actualData.order?.exchange_rate || 1,
          });
        }
      })
      .catch((err) => {
        hideLoader();
        console.error("Error hydrating historical sales quote matrix:", err);
      });
  }, [id]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/sales/sales-orders/master-data");
        if (!res.ok) throw new Error();

        const data = await res.json();
        setMasterData(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadMasterData();
  }, []);

  const refreshLines = async (quoteId?: string) => {
    if (!quoteId || quoteId === "new") return;

    const response = await fetch(`/api/sales/sales-quotes/${quoteId}/lines`);
    const data = await response.json();

    setLines(data.lines ?? []);
  };

  return {
    refreshLines,
  };
} */
