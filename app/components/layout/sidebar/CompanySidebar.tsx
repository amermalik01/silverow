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
            className="text-[10px] font-bold capitalize tracking-wider text-slate-400/80 mt-5 mb-1.5 px-2"
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
            }} /* text-[13px] */
            className={`flex items-center justify-between cursor-pointer px-1.5 py-2 rounded-md transition-all duration-150 text-xs group mb-0.5
              ${isSelected ? "text-emerald-400 font-semibold bg-slate-900/40" : "text-slate-300"}
              ${isActive && !isSelected ? "bg-slate-800/30 text-white" : ""}
              hover:bg-slate-800/60 hover:text-white`}
            style={{ paddingLeft: `${level * 12 + 10}px` }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* ri:circle-line */}
              <Icon
                icon={item.icon || ""}
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
          </div>

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
    // <div className="h-[calc(100vh-65px)] w-auto flex flex-col overflow-hidden bg-slate-950">
      <SimpleBar
        // className="flex-1 px-1.5 py-3 overflow-y-auto overflow-x-hidden bg-[#103701] text-xs text-[#fff] dark:bg-[#11161D] dark:text-[#8C9DAF]"
        className="h-full px-1.5 py-3 overflow-x-hidden bg-[#103701] text-xs text-[#fff] dark:bg-[#11161D] dark:text-[#8C9DAF]"  
        style={{
          height: "100%",
        }}
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
    // </div>
  );
};

export default CompanySidebarLayout;

/* 
return (
    // <div className="fixed left-0 top-0 h-screen w-[240px] border-r border-slate-800 bg-slate-950 z-30 flex flex-col overflow-hidden select-none">
    <div className="h-[calc(100vh-65px)] w-[240px] flex flex-col overflow-hidden bg-slate-950">

      <div className="px-5 mt-2 py-4 border-b border-slate-800 flex items-center h-[65px] bg-slate-950 dark:bg-[#11161D] shrink-0">
        <div className="scale-90 origin-left">
          <FullLogo />
        </div>
      </div>


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

*/
