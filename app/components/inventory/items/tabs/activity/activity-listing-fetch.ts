// app/components/inventory/items/tabs/activity/activity-listing-fetch.ts

import type { FetchParams, FetchResponse } from "@/types/table";

export type ActivityListingType = "movements" | "warehouse";

export async function fetchActivityListing<T extends object>(
  itemId: string,
  listingType: ActivityListingType,
  params: FetchParams,
): Promise<FetchResponse<T>> {
  const response = await fetch(
    `/api/inventory/items/${encodeURIComponent(itemId)}/activity-listings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        listingType,
      }),
    },
  );

  if (!response.ok) {
    let message = "Failed to load item activity.";

    try {
      const result: { error?: string } = await response.json();
      message = result.error || message;
    } catch {
      // Keep the fallback message.
    }

    throw new Error(message);
  }

  return (await response.json()) as FetchResponse<T>;
}
