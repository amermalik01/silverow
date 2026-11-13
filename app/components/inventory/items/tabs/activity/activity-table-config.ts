// app/components/inventory/items/tabs/activity/activity-table-config.ts

import type { ColumnConfig } from "@/types/table";

function getColumns(result: unknown, fallback: ColumnConfig[]): ColumnConfig[] {
  if (Array.isArray(result) && result.length > 0) {
    return result as ColumnConfig[];
  }

  if (
    result !== null &&
    typeof result === "object" &&
    "columns" in result &&
    Array.isArray(result.columns) &&
    result.columns.length > 0
  ) {
    return result.columns as ColumnConfig[];
  }

  return fallback;
}

export function createActivityTableConfigApi(defaultColumns: ColumnConfig[]) {
  return {
    async get(moduleKey: string): Promise<ColumnConfig[]> {
      const response = await fetch(
        `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
      );

      if (!response.ok) {
        return defaultColumns;
      }

      const result: unknown = await response.json();

      return getColumns(result, defaultColumns);
    },

    async save(moduleKey: string, configs: ColumnConfig[]): Promise<void> {
      const response = await fetch("/api/table-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleKey,
          configs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save table configuration.");
      }
    },

    async reset(moduleKey: string): Promise<ColumnConfig[]> {
      const response = await fetch(
        `/api/table-config/reset?moduleKey=${encodeURIComponent(moduleKey)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reset table configuration.");
      }

      // Reload the saved default configuration.
      const configResponse = await fetch(
        `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
      );

      if (!configResponse.ok) {
        return defaultColumns;
      }

      const result: unknown = await configResponse.json();

      return getColumns(result, defaultColumns);
    },
  };
}

/* import type { ColumnConfig } from "@/types/table";

export const activityTableConfigApi = {
  async get(moduleKey: string): Promise<ColumnConfig[]> {
    const response = await fetch(
      `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to load table configuration.");
    }

    const result: unknown = await response.json();

    if (Array.isArray(result)) {
      return result as ColumnConfig[];
    }

    if (
      result &&
      typeof result === "object" &&
      "columns" in result &&
      Array.isArray(result.columns)
    ) {
      return result.columns as ColumnConfig[];
    }

    return [];
  },

  async save(moduleKey: string, columns: ColumnConfig[]): Promise<void> {
    const response = await fetch("/api/table-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moduleKey,
        columns,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save table configuration.");
    }
  },

  async reset(moduleKey: string): Promise<ColumnConfig[]> {
    const response = await fetch("/api/table-config/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ moduleKey }),
    });

    if (!response.ok) {
      throw new Error("Failed to reset table configuration.");
    }

    const result: unknown = await response.json();

    if (Array.isArray(result)) {
      return result as ColumnConfig[];
    }

    if (
      result &&
      typeof result === "object" &&
      "columns" in result &&
      Array.isArray(result.columns)
    ) {
      return result.columns as ColumnConfig[];
    }

    return [];
  },
}; */
