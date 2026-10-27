// app/components/energy/sites/SitesList.tsx


"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import type {
  ColumnConfig,
  FetchParams,
  FetchResponse,
  DataTableColumnConfigApi,
} from "@/types/table";

import type { SitesListRow } from "@/types/sites";
import { getSitesCellRenderers } from "./SitesCellRenderers";

interface Props {
  slug: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();

  if (!response.ok) {
    const error =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`;

    throw new Error(error);
  }

  return body as T;
}

const columnsConfigApi: DataTableColumnConfigApi = {
  get: async (moduleKey: string): Promise<ColumnConfig[]> => {
    const response = await fetch(
      `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
      { cache: "no-store" },
    );

    const configs = await parseResponse<ColumnConfig[]>(response);

    if (!Array.isArray(configs)) {
      throw new Error("Invalid column configuration response.");
    }

    return configs;
  },

  save: async (
    moduleKey: string,
    configs: ColumnConfig[],
  ): Promise<void> => {
    const response = await fetch("/api/table-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey, configs }),
    });

    await parseResponse<unknown>(response);
  },

  reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
    const response = await fetch(
      `/api/table-config/reset?moduleKey=${encodeURIComponent(moduleKey)}`,
      { method: "POST" },
    );

    await parseResponse<unknown>(response);

    return columnsConfigApi.get(moduleKey);
  },
};

const fetchSites = async (
  params: FetchParams,
): Promise<FetchResponse<SitesListRow>> => {
  const response = await fetch("/api/energy/site/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const result =
    await parseResponse<FetchResponse<SitesListRow>>(response);

  if (!Array.isArray(result.data)) {
    throw new Error("Energy sites API did not return a data array.");
  }

  if (
    typeof result.totalRecords !== "number" ||
    !Number.isFinite(result.totalRecords)
  ) {
    throw new Error("Energy sites API returned an invalid totalRecords.");
  }

  return result;
};

export default function SitesList({ slug }: Props) {
  const cellRenderers = useMemo(
    () => getSitesCellRenderers(slug),
    [slug],
  );

  const renderRowCell = useCallback(
    (row: SitesListRow, columnKey: string) => {
      const renderer =
        cellRenderers[columnKey as keyof typeof cellRenderers];

      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Energy" },
          { label: "Sites" },
        ]}
      />

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">
            Energy Sites
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage grid connections, meters, battery storage,
            servicing and payments
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="gap-1.5 bg-emerald-700 font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          <Link href={`/${slug}/energy/sites/new`}>
            <Icon icon="lucide:plus" />
            Create
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DataTable<SitesListRow>
          moduleKey="energy_sites"
          fetchApi={fetchSites}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          rowKey="id"
        />
      </div>
    </div>
  );
}


/* "use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import type { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";

import type { SitesListRow } from "@/types/sites";
import { getSitesCellRenderers } from "./SitesCellRenderers";

interface Props {
  slug: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const error: { error?: string; message?: string } = await response.json();

      message = error.error || error.message || message;
    } catch {
      // Preserve HTTP error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

const columnsConfigApi = {
  get: async (moduleKey: string): Promise<ColumnConfig[]> => {
    const response = await fetch(
      `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
    );

    return parseResponse<ColumnConfig[]>(response);
  },

  save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
    const response = await fetch("/api/table-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey, configs }),
    });

    await parseResponse<unknown>(response);
  },

  reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
    const resetResponse = await fetch(
      `/api/table-config/reset?moduleKey=${encodeURIComponent(moduleKey)}`,
      { method: "POST" },
    );

    if (!resetResponse.ok) {
      throw new Error("Failed to reset site table configuration.");
    }

    return columnsConfigApi.get(moduleKey);
  },
};



const fetchSites = async (
  params: FetchParams,
): Promise<FetchResponse<SitesListRow>> => {
  console.log("[SitesList] DataTable request:", params);

  const response = await fetch("/api/energy/site/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const result: unknown = await response.json();

  console.log("[SitesList] API response:", result);

  if (!response.ok) {
    throw new Error(`Failed to fetch energy sites (${response.status})`);
  }

  return result as FetchResponse<SitesListRow>;
};

export default function SitesList({ slug }: Props) {
  const cellRenderers = useMemo(() => getSitesCellRenderers(slug), [slug]);

  const renderRowCell = (row: SitesListRow, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];

    return renderer ? renderer(row) : undefined;
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Energy" }, { label: "Sites" }]} />

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Energy Sites</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage grid connections, meters, battery storage, servicing and
              payments
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="gap-1.5 bg-emerald-700 font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          <Link href={`/${slug}/energy/sites/new`}>
            <Icon icon="lucide:plus" />
            Create
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DataTable<SitesListRow>
          moduleKey="energy_sites"
          fetchApi={fetchSites}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
} */

/* "use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { getSitesCellRenderers } from "./SitesCellRenderers";
import { SitesListRow } from "@/types/sites";

type Props = {
  slug: string;
};

export default function SitesList({ slug }: Props) {
  // 1. Cell renderers registry
  const cellRenderers = getSitesCellRenderers(slug);

  // 2. Cell dispatcher
  const renderRowCell = (row: SitesListRow, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // 3. Data Fetcher
  const fetchSites = async (
    params: FetchParams,
  ): Promise<FetchResponse<SitesListRow>> => {
    const res = await fetch("/api/energy/site/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // 4. Configuration APIs
  const columnsConfigApi = {
    get: async (moduleKey: string): Promise<ColumnConfig[]> => {
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
    save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
      await fetch("/api/table-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, configs }),
      });
    },
    reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
      await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
        method: "POST",
      });
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
  };

  return (
    <div className="space-y-4 ">
      <Breadcrumbs items={[{ label: "Energy" }, { label: "Sites" }]} />

  
      <div className="flex flex-col sm:flex-row justify-between Sites-start sm:Sites-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Sites</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage energy sites and power configurations
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/energy/sites/new`}>+ Create</Link>
        </Button>
      </div>


      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<SitesListRow>
          moduleKey="energy_Sites"
          fetchApi={fetchSites}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
} */
