// app/components/energy/sites/SiteRecord.tsx

"use client";

import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import SiteDetailHeader from "./SiteDetailHeader";
import SiteDetailsTab from "./tabs/SiteDetailsTab";
import SiteServiceTab from "./tabs/SiteServiceTab";
import SitePaymentsTab from "./tabs/SitePaymentsTab";

import { useSiteRecord, type SiteTabKey } from "./hooks/useSiteRecord";

interface Props {
  id: string;
  slug: string;
  isReadonly?: boolean;
}

const tabs: {
  key: SiteTabKey;
  label: string;
  description: string;
}[] = [
  {
    key: "details",
    label: "Site Details",
    description: "Grid, meters and BESS",
  },
  {
    key: "service",
    label: "Site Service",
    description: "Maintenance and repairs",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Terms and schedules",
  },
];

export default function SiteRecord({ id, slug, isReadonly = false }: Props) {
  const router = useRouter();

  const {
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
    startEditing,
    cancelEditing,
    saveSite,
    updateStatus,
  } = useSiteRecord({
    id,
    slug,
    // Existing pages pass true to open in viewing mode.
    // Editing is still available from the Edit button.
    initialReadonly: false,
  });

  const goBack = () => {
    router.push(`/${slug}/energy/sites`);
  };

  /* if (loading) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            {
              label: "Sites",
              href: `/${slug}/energy/sites`,
            },
            { label: "Loading..." },
          ]}
        />

        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Icon
              icon="svg-spinners:180-ring-with-bg"
              className="text-xl text-emerald-600"
            />
            Loading site details...
          </div>
        </div>
      </div>
    );
  } */

  const showEditButton = !isNew && !isEditing;
  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Energy" },
          {
            label: "Sites",
            href: `/${slug}/energy/sites`,
          },
          {
            label: isNew ? "New Site" : site.site_no || "Site Details",
          },
        ]}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <SiteDetailHeader
          site={site}
          isNew={isNew}
          isEditing={isEditing}
          canChangeStatus={!isNew && !isEditing && !saving}
          onStatusChange={updateStatus}
        />

        {hasErrors && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20"
          >
            <div className="flex items-start gap-2">
              <Icon
                icon="lucide:alert-circle"
                className="mt-0.5 shrink-0 text-rose-600"
              />
              <div>
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Please resolve the following errors:
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-rose-600 dark:text-rose-400">
                  {Object.entries(formErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
          {tabs.map((tab) => {
            const hasTabError = Object.keys(formErrors).some((key) => {
              if (tab.key === "details") {
                return (
                  key.startsWith("meters") ||
                  key.startsWith("bess_") ||
                  key.startsWith("connection_") ||
                  key.startsWith("site_") ||
                  key.startsWith("gsp_") ||
                  key.startsWith("distributor_") ||
                  key === "segments" ||
                  key === "ups_enabled"
                );
              }

              if (tab.key === "service") {
                return key.startsWith("services") || key.startsWith("service_");
              }

              return (
                key.startsWith("payment_") ||
                key.startsWith("contract_") ||
                key === "allow_partial_payments"
              );
            });

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>{tab.label}</span>

                {hasTabError && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="py-2 min-h-80">
          {activeTab === "details" && (
            <SiteDetailsTab
              site={site}
              setSiteRec={setSiteRec}
              errors={formErrors}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "service" && (
            <SiteServiceTab
              site={site}
              setSiteRec={setSiteRec}
              errors={formErrors}
              isReadonly={effectiveReadonly}
            />
          )}

          {activeTab === "payments" && (
            <SitePaymentsTab
              site={site}
              setSiteRec={setSiteRec}
              errors={formErrors}
              isReadonly={effectiveReadonly}
            />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="text-[11px] text-slate-500">
            {isNew
              ? "Creating a new energy site"
              : isEditing
                ? "Editing site information"
                : "Viewing site information"}
          </div>

          <div className="flex items-center gap-2">
            {showEditButton ? (
              <>
                <Button
                  type="button"
                  variant="edit"
                  onClick={startEditing}
                  className="gap-1.5"
                >
                  <Icon icon="lucide:pencil" />
                  Edit
                </Button>

                <Button type="button" variant="cancel" onClick={goBack}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="save"
                  disabled={saving}
                  onClick={() => void saveSite()}
                  className="gap-1.5"
                >
                  {saving ? (
                    <>
                      <Icon icon="svg-spinners:180-ring-with-bg" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:save" />
                      Save
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="cancel"
                  disabled={saving}
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

import SiteDetailHeader from "./SiteDetailHeader";
import GeneralTab from "./tabs/GeneralTab";
// import ItemActivityTab from "./tabs/ItemActivityTab";

import { SitesFormData } from "@/types/sites";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { toast } from "sonner";

type Props = {
  id: string;
  slug: string;
  isReadonly?: boolean;
};

const defaultSiteForm: SitesFormData = {
  site_no: "",
  distributor_network_operator: "",
  mpan_no: "",
  connection_size: "",
  connection_size_approved: "",
  status: 1,
  bess_brand_model: "",
  bess_function_trading: "",

  segments: "",
  gsp_uk: "",
};

export default function SiteRecord({
  id,
  slug,
  isReadonly: isReadonlyProp = false,
}: Props) {
  const router = useRouter();
  const { show, hide } = useLoader();

  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(!id);

  const [site, setSiteRec] = useState<SitesFormData>(defaultSiteForm);

  const effectiveReadonly = isReadonlyProp || (!!id && !isEditing);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      show("Loading Site details...");

      try {
        // Always fetch lookups
        const [catRes, brandRes, uomRes, vatRes, setupRes, currencyRes] =
          await Promise.all([
            fetch("/api/setup/inventory/categories"),
            fetch("/api/setup/inventory/brands"),
            fetch("/api/setup/inventory/uoms"),
            fetch("/api/setup/vat-product-posting-groups"),
            fetch("/api/setup/posting/inventory-system"),
            fetch("/api/setup/general/company/currencies/base"),
          ]);

        // if (catRes.ok) setCategories(await catRes.json());
        // if (brandRes.ok) setBrands(await brandRes.json());
        // if (uomRes.ok) setUoms(await uomRes.json());


        // Fetch Site Record & Price Offers in parallel if editing existing Site
        const [siteRes, offersRes] = await Promise.all([
          fetch(`/api/energy/site/${id}`),
          fetch(`/api/energy/site/${id}/price-offers`),
        ]);

        if (siteRes.ok) {
          const result = await siteRes.json();

          const itemData = result.item || result;

          setSiteRec({
            id: itemData.id,
            site_no: itemData.site_no || "",
            distributor_network_operator: itemData.distributor_network_operator || "",
            mpan_no: itemData.mpan_no || "",
            connection_size: itemData.connection_size || "",
            connection_size_approved: itemData.connection_size_approved || 1,
            status: itemData.status || 1,
            bess_brand_model: itemData.bess_brand_model || "",
            bess_function_trading: itemData.bess_function_trading || "",
            segments: itemData.segments || "",
            gsp_uk: itemData.gsp_uk || "",
          });
        }
      } catch (err) {
        console.error("Failed to load site record context", err);
      } finally {
        hide();
      }
    };

    loadInitialData();
  }, [id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // if (!site.name?.trim()) {
    //   errors["general.name"] = "site name is required";
    // }
    // if (!site.base_uom_id) {
    //   errors["general.base_uom_id"] = "Base Unit of Measure is required";
    // }
    if (!site.site_no?.trim()) {
      errors["general.site_no"] = "Site No. is required";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (Object.keys(errors).some((k) => k.startsWith("general."))) {
        setActiveTab("general");
      }
      return false;
    }
    return true;
  };

  const handleCancelEdit = () => {
    setFormErrors({});

    if (!id) {
      router.back();
      return;
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        site: {
          ...site,
          site_no: site.site_no || null,
          distributor_network_operator: site.distributor_network_operator || null,
          mpan_no: site.mpan_no || null,

          connection_size: site.connection_size || null,
          connection_size_approved: site.connection_size_approved || null,
          bess_brand_model: site.bess_brand_model || null,

          bess_function_trading: site.bess_function_trading || null,
          segments: site.segments || null,
          gsp_uk: site.gsp_uk || null,
        },
      };

      const res = await fetch(`/api/energy/site${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save site details.");
      }

      setFormErrors({});
      setIsEditing(false);
      toast.success("Record saved successfully! ✅");
    } catch (err) {
      if (err instanceof Error) {
        setFormErrors({ global: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "general", label: "General" },
    // { key: "activities", label: "Activities" },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Sites",
            href: `/${slug}/energy/sites`,
          },
          { label: site.site_no || "" },
        ]}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <SiteDetailHeader
          site={site}
          onSiteUpdated={(updatedAccount) => {
            setSiteRec((prev) => ({
              ...prev,
              ...updatedAccount,
            }));
          }}
        />

        {Object.keys(formErrors).length > 0 && (
          <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
            <p className="font-semibold mb-1">
              Please resolve errors before saving:
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {Object.entries(formErrors).map(([key, msg]) => (
                <li key={key}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
          {tabs.map((tab) => {
            const hasError = Object.keys(formErrors).some((k) =>
              k.startsWith(`${tab.key}.`),
            );
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                {hasError && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="py-2">
          {activeTab === "general" && (
            <GeneralTab
              site={site}
              setSiteRec={setSiteRec}
              errors={formErrors}
              isReadonly={effectiveReadonly}
            />
          )}
          
          {activeTab === "activities" && <ItemActivityTab itemId={id} />}
        </div>

        <div className="flex justify-end items-center gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
          {!isReadonlyProp && (
            <>
              {!isEditing ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    variant="edit"
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="cancel"
                    onClick={() => router.back()}
                  >
                    Close
                  </Button>
                </>
              ) : (
     
                <>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    variant="save"
                  >
                    {saving ? (
                      <>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>Save</>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="cancel"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} */
