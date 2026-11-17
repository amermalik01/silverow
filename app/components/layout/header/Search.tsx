// app/components/layout/header/Search.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: string;
  category: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  status?: string | null;
  date?: string | null;
  href: string;
}

interface GlobalSearchApiResponse {
  success: boolean;
  results?: SearchResult[];
  total?: number;
  message?: string;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 300;

const getResultIcon = (type: string): string => {
  const icons: Record<string, string> = {
    party: "solar:users-group-rounded-linear",
    item: "solar:box-linear",
    sales_order: "solar:cart-large-2-linear",
    sales_invoice: "solar:bill-list-linear",
    purchase_order: "solar:cart-check-linear",
    credit_note: "solar:document-text-linear",
    debit_note: "solar:document-text-linear",
    journal_entry: "solar:book-2-linear",
  };

  return icons[type] || "solar:widget-2-linear";
};

const getTenantHref = (href: string, slug: string): string => {
  if (!href || !slug) return href;

  // Avoid adding the tenant slug twice.
  if (href === `/${slug}` || href.startsWith(`/${slug}/`)) {
    return href;
  }

  // Only prefix internal application routes.
  if (href.startsWith("/") && !href.startsWith("//")) {
    return `/${slug}${href}`;
  }

  return href;
};

const Search = () => {
  const router = useRouter();
  const params = useParams<{ slug?: string }>();

  const slug = params?.slug || "";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* =====================================================
     Global Search API
  ===================================================== */

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsLoading(false);
      setError("");
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");

      try {
        const searchParams = new URLSearchParams({
          q: trimmedQuery,
          limit: String(SEARCH_LIMIT),
        });

        const response = await fetch(
          `/api/global-search?${searchParams.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as GlobalSearchApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to perform global search.");
        }

        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Global search error:", error);

        setResults([]);
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while searching.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  /* =====================================================
     Keyboard Shortcut: Ctrl + K / Cmd + K
  ===================================================== */

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  /* =====================================================
     Close Dropdown On Outside Click
  ===================================================== */

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* =====================================================
     Navigate To Selected Result
  ===================================================== */

  const openResult = (result: SearchResult) => {
    const href = getTenantHref(result.href, slug);

    setIsOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);

    router.push(href);
  };

  /* =====================================================
     Keyboard Navigation
  ===================================================== */

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);

      setActiveIndex((previous) =>
        previous >= results.length - 1 ? 0 : previous + 1,
      );
    }

    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);

      setActiveIndex((previous) =>
        previous <= 0 ? results.length - 1 : previous - 1,
      );
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      openResult(results[activeIndex]);
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  /* =====================================================
     Clear Search
  ===================================================== */

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setError("");
    setIsOpen(false);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const hasQuery = query.trim().length >= MIN_SEARCH_LENGTH;

  return (
    <div ref={searchRef} className="relative w-full max-w-[460px]">
      {/* =================================================
          Search Input
      ================================================= */}

      <div
        className={`
          relative flex h-10 w-full items-center
          rounded-xl border bg-white
          transition-all duration-200
          dark:bg-[#11161D]
          ${
            isOpen
              ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
          }
        `}
      >
        <Icon
          icon="solar:magnifer-linear"
          width={19}
          height={19}
          className={`
            ml-3 shrink-0 transition-colors
            ${
              isOpen ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
            }
          `}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search in modules (Orders, Invoices, Customer, Suppliers, Items... etc)"
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="
            h-full min-w-0 flex-1
            border-0 bg-transparent
            px-3 text-[13px] font-medium
            text-slate-800 outline-none
            placeholder:text-slate-400
            focus:outline-none focus:ring-0
            dark:text-slate-100
            dark:placeholder:text-slate-500
          "
        />

        {isLoading && (
          <Icon
            icon="svg-spinners:180-ring"
            width={17}
            height={17}
            className="mr-2 shrink-0 text-emerald-500"
          />
        )}

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="
              mr-2 flex h-6 w-6 shrink-0
              items-center justify-center
              rounded-md text-slate-400
              transition hover:bg-slate-100
              hover:text-slate-700
              dark:hover:bg-slate-800
              dark:hover:text-white
            "
            aria-label="Clear search"
          >
            <Icon icon="solar:close-circle-linear" width={17} />
          </button>
        ) : (
          <div
            className="
              mr-2 hidden shrink-0 items-center gap-1
              rounded-md border border-slate-200
              bg-slate-50 px-1.5 py-1
              text-[10px] font-semibold text-slate-400
              sm:flex
              dark:border-slate-700 dark:bg-slate-800
            "
          >
            <Icon icon="solar:command-linear" width={12} />
            <span>K</span>
          </div>
        )}
      </div>

      {/* =================================================
          Search Dropdown
      ================================================= */}

      {isOpen && query.trim() && (
        <div
          className="
            absolute left-0 top-full z-[200]
            mt-2 w-full min-w-[320px]
            overflow-hidden rounded-xl
            border border-slate-200
            bg-white
            shadow-[0_12px_40px_rgba(15,23,42,0.14)]
            dark:border-slate-700
            dark:bg-[#151C25]
            dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]
          "
        >
          {/* Dropdown Header */}

          <div
            className="
              flex items-center justify-between
              border-b border-slate-100
              px-4 py-3
              dark:border-slate-700
            "
          >
            <div className="flex items-center gap-2">
              <Icon
                icon="solar:layers-linear"
                width={16}
                className="text-emerald-500"
              />

              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Global Search
              </span>
            </div>

            {!isLoading && results.length > 0 && (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                {results.length} found
              </span>
            )}
          </div>

          {/* Results */}

          <SimpleBar className="max-h-[350px]">
            {isLoading && results.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-slate-500">
                <Icon
                  icon="svg-spinners:180-ring"
                  width={18}
                  className="text-emerald-500"
                />
                Searching your ERP...
              </div>
            ) : error ? (
              <div className="px-5 py-8 text-center">
                <Icon
                  icon="solar:danger-circle-linear"
                  width={25}
                  className="mx-auto mb-2 text-red-500"
                />

                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Search unavailable
                </p>

                <p className="mt-1 text-[11px] text-slate-400">{error}</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1 p-2">
                {results.map((item, index) => {
                  const href = getTenantHref(item.href, slug);

                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={href}
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                        setIsOpen(false);
                        setActiveIndex(0);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`
                        group flex w-full items-center
                        gap-3 rounded-lg px-3 py-2.5
                        transition-colors
                        ${
                          activeIndex === index
                            ? "bg-emerald-50 dark:bg-emerald-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        }
                      `}
                    >
                      {/* Icon */}

                      <div
                        className={`
                          flex h-9 w-9 shrink-0
                          items-center justify-center
                          rounded-lg transition-colors
                          ${
                            activeIndex === index
                              ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }
                        `}
                      >
                        <Icon
                          icon={getResultIcon(item.type)}
                          width={19}
                          height={19}
                        />
                      </div>

                      {/* Result Details */}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p
                            className={`
                              truncate text-[12px] font-semibold
                              ${
                                activeIndex === index
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-slate-800 dark:text-slate-200"
                              }
                            `}
                          >
                            {item.title}
                          </p>

                          {item.status && (
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              {item.status}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500">
                          {item.subtitle || item.category}
                        </p>

                        {item.description && (
                          <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Category */}

                      <span className="hidden shrink-0 text-[9px] font-medium text-slate-400 sm:block">
                        {item.category}
                      </span>

                      {/* Navigate Icon */}

                      <Icon
                        icon="solar:arrow-right-up-linear"
                        width={16}
                        className={`
                          shrink-0 transition-colors
                          ${
                            activeIndex === index
                              ? "text-emerald-500"
                              : "text-slate-300 dark:text-slate-600"
                          }
                        `}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : hasQuery && !isLoading ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Icon
                    icon="solar:magnifer-linear"
                    width={23}
                    className="text-slate-400"
                  />
                </div>

                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  No results found
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Try another keyword or check your spelling.
                </p>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                Type at least {MIN_SEARCH_LENGTH} characters to search.
              </div>
            )}
          </SimpleBar>

          {/* Dropdown Footer */}

          <div
            className="
              flex items-center justify-between
              border-t border-slate-100
              bg-slate-50/80 px-4 py-2.5
              dark:border-slate-700
              dark:bg-[#11161D]
            "
          >
            <span className="text-[10px] text-slate-400">
              Navigate with arrow keys
            </span>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  ↵
                </kbd>
                Open
              </span>

              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  ESC
                </kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;

/* "use client";

import { useState, useMemo, useEffect, useRef } from "react";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Icon } from "@iconify/react";
import SidebarContent, { MenuItem, ChildItem } from "../sidebar/sidebaritems";

import SimpleBar from "simplebar-react";
import Link from "next/link";

interface SearchResult {
  name: string;
  url: string;
  path: string;
  icon?: string;
}

function Search() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchItems = (
    items: (MenuItem | ChildItem)[],
    q: string,
    parentPath = "",
  ): SearchResult[] => {
    const results: SearchResult[] = [];
    const normalizedQuery = q.toLowerCase();

    items.forEach((item) => {
      const itemName = item.name || "";
      const currentPath = parentPath ? `${parentPath} / ${itemName}` : itemName;

      if (itemName.toLowerCase().includes(normalizedQuery) && item.url) {
        results.push({
          name: itemName,
          url: item.url,
          path: currentPath,
          icon: item.icon,
        });
      }

      if (item.children?.length) {
        results.push(...searchItems(item.children, q, currentPath));
      }
    });

    return results;
  };



  const results = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) return [];

    return searchItems(SidebarContent, trimmedQuery).slice(0, 30);
  }, [query]);



  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);



  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);



  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev >= results.length - 1 ? 0 : prev + 1));
    }

    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    }

    if (event.key === "Enter" && results[activeIndex]) {
      window.location.href = results[activeIndex].url;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };



  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-[460px]">


      <div
        className={`
          relative flex h-10 w-full items-center
          rounded-xl border
          bg-white
          transition-all duration-200
          dark:bg-[#11161D]
          ${
            isOpen
              ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
          }
        `}
      >
        <Icon
          icon="solar:magnifer-linear"
          width={19}
          height={19}
          className={`
            ml-3 shrink-0 transition-colors
            ${
              isOpen ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
            }
          `}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search anything..."
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="
            h-full min-w-0 flex-1
            border-0 bg-transparent
            px-3 text-[13px] font-medium
            text-slate-800 outline-none
            placeholder:text-slate-400
            focus:outline-none focus:ring-0
            dark:text-slate-100
            dark:placeholder:text-slate-500
          "
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="
              mr-2 flex h-6 w-6 shrink-0
              items-center justify-center
              rounded-md text-slate-400
              transition hover:bg-slate-100
              hover:text-slate-700
              dark:hover:bg-slate-800
              dark:hover:text-white
            "
            aria-label="Clear search"
          >
            <Icon icon="solar:close-circle-linear" width={17} />
          </button>
        ) : (
          <div
            className="
              mr-2 hidden sm:flex shrink-0
              items-center gap-1
              rounded-md border
              border-slate-200 bg-slate-50
              px-1.5 py-1
              text-[10px] font-semibold
              text-slate-400
              dark:border-slate-700
              dark:bg-slate-800
            "
          >
            <Icon icon="solar:command-linear" width={12} />
            <span>K</span>
          </div>
        )}
      </div>



      {isOpen && query.trim() && (
        <div
          className="
            absolute left-0 top-full z-[200]
            mt-2 w-full min-w-[320px]
            overflow-hidden rounded-xl
            border border-slate-200
            bg-white
            shadow-[0_12px_40px_rgba(15,23,42,0.14)]
            dark:border-slate-700
            dark:bg-[#151C25]
            dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]
          "
        >


          <div
            className="
              flex items-center justify-between
              border-b border-slate-100
              px-4 py-3
              dark:border-slate-700
            "
          >
            <div className="flex items-center gap-2">
              <Icon
                icon="solar:layers-linear"
                width={16}
                className="text-emerald-500"
              />

              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Search Results
              </span>
            </div>

            {results.length > 0 && (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                {results.length} found
              </span>
            )}
          </div>



          <SimpleBar className="max-h-[350px]">
            {results.length > 0 ? (
              <div className="space-y-1 p-2">
                {results.map((item, index) => (
                  <Link
                    key={`${item.url}-${index}`}
                    href={item.url}
                    onClick={clearSearch}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`
                      group flex w-full items-center
                      gap-3 rounded-lg px-3 py-2.5
                      transition-colors
                      ${
                        activeIndex === index
                          ? "bg-emerald-50 dark:bg-emerald-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      }
                    `}
                  >
         

                    <div
                      className={`
                        flex h-9 w-9 shrink-0
                        items-center justify-center
                        rounded-lg transition-colors
                        ${
                          activeIndex === index
                            ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }
                      `}
                    >
                      <Icon
                        icon={item.icon || "solar:widget-2-linear"}
                        width={19}
                        height={19}
                      />
                    </div>

                 

                    <div className="min-w-0 flex-1">
                      <p
                        className={`
                          truncate text-[12px] font-semibold
                          ${
                            activeIndex === index
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-slate-800 dark:text-slate-200"
                          }
                        `}
                      >
                        {item.name}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500">
                        {item.path}
                      </p>
                    </div>

                    

                    <Icon
                      icon="solar:arrow-right-up-linear"
                      width={16}
                      className={`
                        shrink-0 transition-colors
                        ${
                          activeIndex === index
                            ? "text-emerald-500"
                            : "text-slate-300 dark:text-slate-600"
                        }
                      `}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Icon
                    icon="solar:magnifer-linear"
                    width={23}
                    className="text-slate-400"
                  />
                </div>

                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  No results found
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Try another keyword or check your spelling.
                </p>
              </div>
            )}
          </SimpleBar>

         

          <div
            className="
              flex items-center justify-between
              border-t border-slate-100
              bg-slate-50/80 px-4 py-2.5
              dark:border-slate-700
              dark:bg-[#11161D]
            "
          >
            <span className="text-[10px] text-slate-400">
              Navigate with arrow keys
            </span>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  ↵
                </kbd>
                Open
              </span>

              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  ESC
                </kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Search; */

/* 'use client'
import { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import SidebarContent, { MenuItem, ChildItem } from '../sidebar/sidebaritems'

import SimpleBar from 'simplebar-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface SearchResult {
  name: string
  url: string
  path: string | undefined
  icon?: string
}

function Search() {
  const [query, setQuery] = useState('')

  // 🔍 Recursive search through menu
  const searchItems = (
    items: (MenuItem | ChildItem)[],
    q: string,
    parentPath = ''
  ): SearchResult[] => {
    let results: SearchResult[] = []

    items.forEach((item) => {
      const currentPath = parentPath
        ? `${parentPath} → ${item.name}`
        : item.name

      // If match found
      if (item.name?.toLowerCase().includes(q.toLowerCase()) && item.url) {
        results.push({
          name: item.name,
          url: item.url,
          path: currentPath,
          icon: item.icon,
        })
      }

      // Search deeper children
      if (item.children) {
        results = [...results, ...searchItems(item.children, q, currentPath)]
      }
    })

    return results
  }

  // Memoize filtered results
  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchItems(SidebarContent, query)
  }, [query])

  return (
    <div className='relative w-full'>
      <div className='flex items-center relative lg:w-xs mx-auto text-black'>
        <Icon
          icon='solar:magnifer-linear'
          width='18'
          height='18'
          className='absolute left-3 top-1/2 -translate-y-1/2'
        />

        <Input
          placeholder='Search....'
          className='rounded-xl pl-10 '
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        className={`absolute w-full  bg-background rounded-md top-11 z-10 start-0 shadow-md border border-border ${
          Boolean(query) ? 'block' : 'hidden'
        }`}>
        <SimpleBar className='h-72 p-4 custom-scroll'>
          {Boolean(results.length) ? (
            results.map((item, i) => (
              <Link
                key={i}
                href={item.url}
                onClick={() => setQuery('')}
                className='  p-2 mb-1.5 last:mb-0 flex items-center bg-input/30 gap-2 text-xs font-medium rounded-md hover:bg-primary/20 hover:text-primary w-full'>
                <div className='flex items-center'>
                  <Icon icon='iconoir:component' width={18} height={18} />
                  <div className='ps-3'>
                    <h5 className='mb-1 text-xs group-hover/link:text-primary'>
                      {item.name}
                    </h5>
                    <span className='text-xs block truncate text-muted-foreground'>
                      {item.path}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className='flex items-center justify-center h-full'>
              <h1 className='text-medium font-medium'>
                No Components Found!
              </h1>
            </div>
          )}
        </SimpleBar>
      </div>
    </div>
  )
}

export default Search
 */
