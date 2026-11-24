// app/components/crm/prospects/hooks/useProspectOffers.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ProspectOffer,
  ProspectOfferDefaults,
  ProspectOfferPayload,
  ProspectOfferStatus,
} from "@/types/prospect";

async function readError(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export type ProspectOffersState = ReturnType<typeof useProspectOffers>;

/**
 * Loads and mutates the offers (price lists) of one prospect.
 * Shared by the Pricing tab and the "Interested Products" field.
 */
export function useProspectOffers(prospectId?: string) {
  const [offers, setOffers] = useState<ProspectOffer[]>([]);
  const [defaults, setDefaults] = useState<ProspectOfferDefaults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = prospectId
    ? `/api/sales/crm/prospects/${prospectId}/offers`
    : null;

  const reload = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(baseUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load offers."));
      }

      const result = (await response.json()) as {
        offers: ProspectOffer[];
        defaults: ProspectOfferDefaults;
      };

      setOffers(result.offers);
      setDefaults(result.defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = useCallback(
    async (
      url: string,
      method: "POST" | "PUT" | "PATCH" | "DELETE",
      body?: unknown,
    ): Promise<ProspectOffer | null> => {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to save offer."));
      }

      const result = (await response.json()) as { data?: ProspectOffer };
      await reload();
      return result.data ?? null;
    },
    [reload],
  );

  const saveOffer = useCallback(
    (payload: ProspectOfferPayload, offerId?: string) => {
      if (!baseUrl) throw new Error("Save the prospect first.");
      return offerId
        ? send(`${baseUrl}/${offerId}`, "PUT", payload)
        : send(baseUrl, "POST", payload);
    },
    [baseUrl, send],
  );

  const setStatus = useCallback(
    (offerId: string, status: ProspectOfferStatus) =>
      send(`${baseUrl}/${offerId}/status`, "PATCH", { status }),
    [baseUrl, send],
  );

  const setPrimary = useCallback(
    (offerId: string) =>
      send(`${baseUrl}/${offerId}/primary`, "PATCH", { is_primary: true }),
    [baseUrl, send],
  );

  /** Creates a draft sales quote from the offer; returns its id and number. */
  const convertToQuote = useCallback(
    async (offerId: string) => {
      const response = await fetch(`${baseUrl}/${offerId}/convert-to-quote`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to convert to a sales quote."),
        );
      }

      const result = (await response.json()) as {
        data: { salesQuoteId: string; quoteNo: string };
      };

      await reload();
      return result.data;
    },
    [baseUrl, reload],
  );

  const deleteOffer = useCallback(
    (offerId: string) => send(`${baseUrl}/${offerId}`, "DELETE"),
    [baseUrl, send],
  );

  const primaryOffer = useMemo(
    () => offers.find((offer) => offer.is_primary) ?? offers[0] ?? null,
    [offers],
  );

  return {
    enabled: Boolean(prospectId),
    offers,
    defaults,
    primaryOffer,
    loading,
    error,
    reload,
    saveOffer,
    setStatus,
    setPrimary,
    deleteOffer,
    convertToQuote,
  };
}
