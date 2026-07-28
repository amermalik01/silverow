// app/components/layout/sidebar/CompanySidebar.tsx

// app/components/layout/sidebar/CompanySidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import FullLogo from "../shared/logo/FullLogo";
import { getCompanySidebarItems } from "./company_sidebaritems";

interface SidebarItemType {
  heading?: string;
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: SidebarItemType[];
}

const isItemActive = (item: SidebarItemType, currentPath: string): boolean => {
  if (item.url && currentPath.startsWith(item.url)) return true;
  if (item.children) {
    return item.children.some((child) => isItemActive(child, currentPath));
  }
  return false;
};

const getActiveParentIds = (
  items: SidebarItemType[],
  currentPath: string,
): (string | number)[] => {
  let result: (string | number)[] = [];
  for (const item of items) {
    if (item.children) {
      const active = isItemActive(item, currentPath);
      if (active && item.id) {
        result.push(item.id);
      }
      result = [...result, ...getActiveParentIds(item.children, currentPath)];
    }
  }
  return result;
};

const CompanySidebarLayout = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [manualOpenMenus, setManualOpenMenus] = useState<(string | number)[]>(
    [],
  );

  const slug = session?.user?.company_slug;
  const menuItems = slug ? getCompanySidebarItems(slug) : [];

  const autoOpenMenus = slug
    ? getActiveParentIds(
        menuItems.flatMap((section) => section.children || []),
        pathname,
      )
    : [];

  const openMenus = Array.from(new Set([...autoOpenMenus, ...manualOpenMenus]));

  const toggleMenu = (id: string | number) => {
    setManualOpenMenus((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const renderItems = (
    items: SidebarItemType[],
    level = 0,
  ): React.ReactNode => {
    return items.map((item) => {
      const isActive = isItemActive(item, pathname);
      const isOpen = openMenus.includes(item.id!);
      const isSelected = item.url && pathname.startsWith(item.url);
      const hasChildren = item.children?.length;

      if (item.heading) {
        return (
          <div
            key={item.heading}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mt-5 mb-1.5 px-2"
          >
            {item.heading}
          </div>
        );
      }

      return (
        <div key={item.id} className="w-full">
          <div
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu(item.id!);
              }
            }}
            className={`flex items-center justify-between cursor-pointer px-2.5 py-2 rounded-md transition-all duration-150 text-[13px] group mb-0.5
              ${isSelected ? "text-emerald-400 font-semibold bg-slate-800/40" : "text-slate-300"}
              ${isActive && !isSelected ? "bg-slate-800/30 text-white" : ""}
              hover:bg-slate-800/60 hover:text-white`}
            style={{ paddingLeft: `${level * 12 + 10}px` }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Icon
                icon={item.icon || "ri:circle-line"}
                width={16}
                className={`shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`}
              />
              {item.url ? (
                <Link href={item.url} className="truncate flex-1">
                  {item.title || item.name}
                </Link>
              ) : (
                <span className="truncate flex-1">
                  {item.title || item.name}
                </span>
              )}
            </div>

            {hasChildren && (
              <Icon
                icon="heroicons:chevron-down-20-solid"
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-slate-300" : ""}`}
              />
            )}
          </div>

          {/* Children with pure CSS height transition flags */}
          {hasChildren && (
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isOpen
                  ? "max-h-[1000px] opacity-100 mt-0.5"
                  : "max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              {renderItems(item.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-[240px] border-r border-slate-800 bg-slate-950 z-30 flex flex-col overflow-hidden select-none">
      {/* Logo Container */}
      <div className="px-5 mt-2 py-4 border-b border-slate-800 flex items-center h-[65px] bg-slate-950 dark:bg-[#11161D] shrink-0">
        <div className="scale-90 origin-left">
          <FullLogo />
        </div>
      </div>

      {/* Navigation Links Scroll Container */}
      <SimpleBar
        className="flex-1 px-2.5 py-3 overflow-y-auto overflow-x-hidden dark:bg-[#11161D] dark:text-[#8C9DAF]"
        style={{ maxHeight: "calc(100vh - 65px)" }}
      >
        {menuItems.map((section, index) => (
          <div key={index} className="space-y-0.5 mb-4">
            {renderItems([
              ...(section.heading ? [{ heading: section.heading }] : []),
              ...(section.children || []),
            ])}
          </div>
        ))}
      </SimpleBar>
    </div>
  );
};

export default CompanySidebarLayout;

/* "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import FullLogo from "../shared/logo/FullLogo";
import { getCompanySidebarItems } from "./company_sidebaritems";

interface SidebarItemType {
  heading?: string;
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: SidebarItemType[];
}

const isItemActive = (item: SidebarItemType, currentPath: string): boolean => {
  if (item.url && currentPath.startsWith(item.url)) return true;

  if (item.children) {
    return item.children.some((child) => isItemActive(child, currentPath));
  }

  return false;
};

const getActiveParentIds = (
  items: SidebarItemType[],
  currentPath: string,
): (string | number)[] => {
  let result: (string | number)[] = [];

  for (const item of items) {
    if (item.children) {
      const active = isItemActive(item, currentPath);

      if (active && item.id) {
        result.push(item.id);
      }

      result = [...result, ...getActiveParentIds(item.children, currentPath)];
    }
  }

  return result;
};

const CompanySidebarLayout = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [manualOpenMenus, setManualOpenMenus] = useState<(string | number)[]>(
    [],
  );

  const slug = session?.user?.company_slug;

  const menuItems = slug ? getCompanySidebarItems(slug) : [];

  const autoOpenMenus = slug
    ? getActiveParentIds(
        menuItems.flatMap((section) => section.children || []),
        pathname,
      )
    : [];

  const openMenus = Array.from(new Set([...autoOpenMenus, ...manualOpenMenus]));

  const toggleMenu = (id: string | number) => {
    setManualOpenMenus((prev) => {
      const exists = prev.includes(id);

      if (exists) {
        return prev.filter((i) => i !== id);
      }

      return [...prev, id];
    });
  };

  const renderItems = (
    items: SidebarItemType[],
    level = 0,
  ): React.ReactNode => {
    return items.map((item) => {
      const isActive = isItemActive(item, pathname);
      const isOpen = openMenus.includes(item.id!);
      const isSelected = item.url && pathname.startsWith(item.url);

      const hasChildren = item.children?.length;

      // Heading
      if (item.heading) {
        return (
          <div
            key={item.heading}
            className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2"
          >
            {item.heading}
          </div>
        );
      }

      return (
        <div key={item.id}>
     
          <div
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu(item.id!);
              }
            }}
            className={`flex items-center justify-between cursor-pointer px-3 py-2 rounded-md transition-all
              ${isSelected ? "text-primary font-semibold" : "text-gray-600"}
              ${isActive ? "bg-gray-100 dark:bg-gray-800" : ""}
              hover:bg-gray-100 dark:hover:bg-gray-800`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon icon={item.icon || "ri:circle-line"} width={18} />

              {item.url ? (
                <Link href={item.url} className="flex-1">
                  {item.title || item.name}
                </Link>
              ) : (
                <span className="flex-1">{item.title || item.name}</span>
              )}
            </div>

    
            {hasChildren && (
              <Icon
                icon="mdi:chevron-down"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </div>

          {hasChildren && isOpen && (
            <div className="mt-1">{renderItems(item.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-[270px] border-r bg-gray-900">
   
      <div className="px-6 py-4 border-b bg-gray-900">
        <FullLogo />
      </div>

 
      <SimpleBar className="h-[calc(100vh-80px)] px-3">
        {menuItems.map((section, index) => (
          <div key={index}>
            {renderItems([
              ...(section.heading ? [{ heading: section.heading }] : []),
              ...(section.children || []),
            ])}
          </div>
        ))}
      </SimpleBar>
    </div>
  );
};

export default CompanySidebarLayout; */
