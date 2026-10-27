// app/components/energy/sites/hooks/useSiteRecord.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import {
  createDefaultSite,
  type SitesFormData,
  type SiteMeter,
  type SiteBessUnit,
  type SiteServiceRecord,
  type SitePaymentSchedule,
} from "@/types/sites";
import { SiteSchema } from "@/lib/validations/site.schema";

// import { SiteSchema } from "../validation/site.schema";

export type SiteTabKey = "details" | "service" | "payments";

interface UseSiteRecordProps {
  id: string;
  slug: string;
  initialReadonly?: boolean;
}

interface SiteApiRecord extends Partial<SitesFormData> {
  mpan_no?: string | null;
}

interface SiteGetResponse {
  site: SiteApiRecord;
  meters?: SiteMeter[];
  bess_units?: SiteBessUnit[];
  services?: SiteServiceRecord[];
  payment_schedules?: SitePaymentSchedule[];
}

interface SiteSaveResponse {
  success?: boolean;
  id?: string;
  site?: { id: string };
  error?: string;
  errors?: Record<string, string>;
}

const textValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

const numericValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const dateValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.slice(0, 10);
};

function normalizeSite(record: SiteGetResponse): SitesFormData {
  const defaults = createDefaultSite();
  const source = record.site;

  const meters = record.meters ?? source.meters ?? [];
  const bessUnits = record.bess_units ?? source.bess_units ?? [];
  const services = record.services ?? source.services ?? [];
  const payments = record.payment_schedules ?? source.payment_schedules ?? [];

  return {
    ...defaults,
    ...source,

    site_no: textValue(source.site_no),
    site_name: textValue(source.site_name),
    gsp_uk: textValue(source.gsp_uk),
    distributor_network_operator: textValue(
      source.distributor_network_operator,
    ),
    segments: textValue(source.segments),

    connection_size: numericValue(source.connection_size),
    connection_size_approved: numericValue(source.connection_size_approved),

    connection_size_unit: source.connection_size_unit ?? "KW",

    bess_brand_model: textValue(source.bess_brand_model),
    bess_function_trading: textValue(source.bess_function_trading),
    bess_function: source.bess_function ?? "TRADING",
    ups_enabled: source.ups_enabled === true,

    status: Number(source.status) === 0 ? 0 : 1,

    service_interval_months: numericValue(source.service_interval_months),
    service_start_date: dateValue(source.service_start_date),
    service_notes: textValue(source.service_notes),

    payment_frequency: source.payment_frequency ?? "QUARTERLY",
    allow_partial_payments: source.allow_partial_payments ?? true,
    payment_currency: source.payment_currency ?? "GBP",
    contract_amount: numericValue(source.contract_amount),
    payment_notes: textValue(source.payment_notes),

    meters: meters.map((meter) => ({
      ...meter,
      mpan_no: textValue(meter.mpan_no),
      meter_serial_no: textValue(meter.meter_serial_no),
    })),

    bess_units: bessUnits.map((unit) => ({
      ...unit,
      brand: textValue(unit.brand),
      model: textValue(unit.model),
      serial_no: textValue(unit.serial_no),
      capacity_kw: numericValue(unit.capacity_kw),
      capacity_kwh: numericValue(unit.capacity_kwh),
      allocation_date: dateValue(unit.allocation_date),
      notes: textValue(unit.notes),
    })),

    services: services.map((service) => ({
      ...service,
      service_date: dateValue(service.service_date),
      next_service_date: dateValue(service.next_service_date),
      cost: numericValue(service.cost),
    })),

    payment_schedules: payments.map((payment) => ({
      ...payment,
      due_date: dateValue(payment.due_date),
      paid_date: dateValue(payment.paid_date),
      amount: numericValue(payment.amount) ?? 0,
      paid_amount: numericValue(payment.paid_amount) ?? 0,
    })),
  };
}

function getTabFromPath(path: string): SiteTabKey {
  if (path.startsWith("services.") || path.startsWith("service_")) {
    return "service";
  }

  if (
    path.startsWith("payment_") ||
    path.startsWith("contract_") ||
    path === "allow_partial_payments"
  ) {
    return "payments";
  }

  return "details";
}

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "global";
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return errors;
}

export function useSiteRecord({
  id,
  slug,
  initialReadonly = false,
}: UseSiteRecordProps) {
  const router = useRouter();
  const isNew = !id;

  const [site, setSiteRec] = useState<SitesFormData>(createDefaultSite);

  const [activeTab, setActiveTab] = useState<SiteTabKey>("details");

  const [isEditing, setIsEditing] = useState(isNew);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const savedSnapshot = useRef<SitesFormData>(createDefaultSite());

  const effectiveReadonly = loading || saving || (!isNew && !isEditing);

  const loadSite = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setFormErrors({});

    try {
      const response = await fetch(
        `/api/energy/site/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Site record not found."
            : "Failed to load site record.",
        );
      }

      const data: SiteGetResponse = await response.json();

      // API contract: { site, meters, bess_units,
      // services, payment_schedules }
      if (!data.site) {
        throw new Error("Invalid site response.");
      }

      const normalized = normalizeSite(data);

      setSiteRec(normalized);
      savedSnapshot.current = structuredClone(normalized);
      setIsEditing(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load site.";

      setFormErrors({ global: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadSite();
    }
  }, [id, loadSite]);

  const startEditing = useCallback(() => {
    if (initialReadonly || loading || saving) return;
    setFormErrors({});
    setIsEditing(true);
  }, [initialReadonly, loading, saving]);

  const cancelEditing = useCallback(() => {
    if (saving) return;

    setFormErrors({});

    if (isNew) {
      router.push(`/${slug}/energy/sites`);
      return;
    }

    setSiteRec(structuredClone(savedSnapshot.current));
    setIsEditing(false);
  }, [isNew, router, saving, slug]);

  const validateForm = useCallback((): boolean => {
    const result = SiteSchema.safeParse(site);

    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors = flattenZodErrors(result.error);
    setFormErrors(errors);

    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setActiveTab(getTabFromPath(firstError));
    }

    toast.error("Please correct the highlighted fields.");
    return false;
  }, [site]);

  const saveSite = useCallback(async (): Promise<void> => {
    if (saving || loading || !isEditing) return;
    if (!validateForm()) return;

    setSaving(true);
    setFormErrors({});

    try {
      const parsed = SiteSchema.parse(site);

      const { meters, bess_units, services, payment_schedules, ...siteFields } =
        parsed;

      const payload = {
        site: siteFields,
        meters,
        bess_units,
        services,
        payment_schedules,
      };

      const url = isNew
        ? "/api/energy/site"
        : `/api/energy/site/${encodeURIComponent(id)}`;

      const response = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: SiteSaveResponse = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFormErrors(data.errors);

          const firstError = Object.keys(data.errors)[0];
          if (firstError) {
            setActiveTab(getTabFromPath(firstError));
          }
        }

        throw new Error(data.error || "Failed to save site.");
      }

      const savedId = data.id ?? data.site?.id ?? id;

      toast.success(
        isNew ? "Site created successfully." : "Site updated successfully.",
      );

      if (isNew) {
        if (!savedId) {
          router.push(`/${slug}/energy/sites`);
          return;
        }

        router.replace(`/${slug}/energy/sites/${encodeURIComponent(savedId)}`);
        router.refresh();
        return;
      }

      // Reload persisted child IDs and database-generated values.
      await loadSite();
      setIsEditing(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to save site.";

      setFormErrors((prev) => ({
        ...prev,
        global: message,
      }));

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    id,
    isNew,
    isEditing,
    loadSite,
    loading,
    router,
    saving,
    site,
    slug,
    validateForm,
  ]);

  const updateStatus = useCallback(
    async (status: 0 | 1): Promise<boolean> => {
      if (!id || loading || saving) return false;

      try {
        const response = await fetch(
          `/api/energy/site/${encodeURIComponent(id)}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: status === 1 ? "active" : "inactive",
            }),
          },
        );

        const data: { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to change site status.");
        }

        setSiteRec((prev) => ({ ...prev, status }));
        savedSnapshot.current = {
          ...savedSnapshot.current,
          status,
        };

        toast.success(
          status === 1
            ? "Site activated successfully."
            : "Site deactivated successfully.",
        );

        return true;
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to change status.",
        );
        return false;
      }
    },
    [id, loading, saving],
  );

  return {
    site,
    setSiteRec,
    activeTab,
    setActiveTab,
    isNew,
    isEditing,
    loading,
    saving,
    formErrors,
    effectiveReadonly,
    canEdit: !initialReadonly,
    startEditing,
    cancelEditing,
    validateForm,
    saveSite,
    updateStatus,
    reload: loadSite,
  };
}
