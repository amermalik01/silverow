// app/components/layout/sidebar/CompanySidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
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

interface CompanySidebarProps {
  collapsed?: boolean;
}

const isItemActive = (item: SidebarItemType, currentPath: string): boolean => {
  if (item.url && currentPath === item.url) {
    return true;
  }

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

const CompanySidebar = ({ collapsed = false }: CompanySidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [manualOpenMenus, setManualOpenMenus] = useState<(string | number)[]>(
    [],
  );

  const [manualClosedMenus, setManualClosedMenus] = useState<
    (string | number)[]
  >([]);

  const slug = session?.user?.company_slug;

  const allMenuItems = slug ? getCompanySidebarItems(slug) : [];

  const menuItems = allMenuItems.filter(
    (section) => section.heading !== "Management",
  );

  const autoOpenMenus = slug
    ? getActiveParentIds(
        menuItems.flatMap((section) => section.children || []),
        pathname,
      )
    : [];

  const openMenus = Array.from(
    new Set([
      ...autoOpenMenus.filter((id) => !manualClosedMenus.includes(id)),
      ...manualOpenMenus,
    ]),
  );

  const toggleMenu = (id: string | number) => {
    setManualOpenMenus((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });

    setManualClosedMenus((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });
  };

  const renderItems = (
    items: SidebarItemType[],
    level = 0,
  ): React.ReactNode => {
    return items.map((item) => {
      if (item.heading) {
        if (collapsed) {
          return null;
        }

        return (
          <div
            key={item.heading}
            className="mt-5 mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"
          >
            {item.heading}
          </div>
        );
      }

      const isActive = isItemActive(item, pathname);
      const isSelected = item.url === pathname;
      const hasChildren = Boolean(item.children?.length);
      const isOpen = item.id != null && openMenus.includes(item.id);

      const rowClassName = ` relative flex w-full items-center rounded-md transition-all duration-150 group ${collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2 py-2"}
          ${isSelected ? "bg-slate-900/50 font-semibold text-emerald-400" : isActive ? "bg-slate-800/40 text-white" : "text-slate-300"} hover:bg-slate-800/60 hover:text-white `;

      const iconName = item.icon || "solar:widget-2-linear";

      const icon = (
        <Icon
          icon={iconName}
          width={18}
          height={18}
          className={` shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`}
        />
      );

      const label = (
        <span
          className={` min-w-0 flex-1 truncate text-left text-xs transition-all duration-150 ${collapsed ? "hidden" : "block"}`}
        >
          {item.title || item.name}
        </span>
      );

      const arrow = hasChildren && !collapsed && (
        <Icon
          icon={
            isOpen ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"
          }
          width={14}
          className="shrink-0 text-slate-400"
        />
      );

      const content = (
        <>
          {icon}
          {label}
          {arrow}

          {/* Tooltip when collapsed */}
          {collapsed && (
            <span className=" pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {item.title || item.name}
            </span>
          )}
        </>
      );

      if (collapsed && hasChildren) {
        return (
          <div key={item.id ?? item.name} className="group relative mb-0.5">
            <button
              type="button"
              title={item.title || item.name}
              onClick={() => {
                if (item.id != null) {
                  toggleMenu(item.id);
                }
              }}
              className={rowClassName}
            >
              {content}
            </button>

            {isOpen && (
              <div className=" absolute left-full top-0 z-50 ml-2 min-w-[220px] rounded-lg border border-slate-700 bg-[#11161D] p-2 shadow-2xl ">
                <div className="mb-1 px-2 py-1.5 text-xs font-semibold text-white">
                  {item.title || item.name}
                </div>

                <div className="space-y-0.5">
                  {renderItems(item.children!, level + 1)}
                </div>
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={item.id ?? item.name} className="w-full">
          {item.url ? (
            <Link
              href={item.url}
              title={collapsed ? item.title || item.name : undefined}
              className={rowClassName}
              style={{
                paddingLeft: collapsed ? undefined : `${level * 12 + 10}px`,
              }}
            >
              {content}
            </Link>
          ) : (
            <button
              type="button"
              title={collapsed ? item.title || item.name : undefined}
              onClick={() => {
                if (item.id != null) {
                  toggleMenu(item.id);
                }
              }}
              className={`${rowClassName} cursor-pointer`}
              style={{
                paddingLeft: collapsed ? undefined : `${level * 12 + 10}px`,
              }}
            >
              {content}
            </button>
          )}

          {/* Expanded submenu */}
          {hasChildren && !collapsed && (
            <div
              className={` overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${isOpen ? "max-h-[1000px] opacity-100" : "pointer-events-none max-h-0 opacity-0"} `}
            >
              {renderItems(item.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <SimpleBar
      className=" h-full overflow-x-visible bg-[#103701] text-xs text-white dark:bg-[#11161D] dark:text-[#8C9DAF] "
      style={{ height: "100%" }}
    >
      <div
        className={`py-3 transition-all duration-200 ${collapsed ? "px-1.5" : "px-1.5"}`}
      >
        {menuItems.map((section, index) => (
          <div key={index} className="mb-4 space-y-0.5">
            {renderItems([
              ...(section.heading ? [{ heading: section.heading }] : []),
              ...(section.children || []),
            ])}
          </div>
        ))}
      </div>
    </SimpleBar>
  );
};

export default CompanySidebar;

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

interface CompanySidebarProps {
collapsed?: boolean;
}

const isItemActive = (
  item: SidebarItemType, 
  currentPath: string
): boolean => {

  if (item.url && currentPath === item.url) {
    return true;
  }

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
      result = [
        ...result, 
        ...getActiveParentIds(item.children, currentPath)
      ];
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

  const [manualClosedMenus, setManualClosedMenus] = useState<
    (string | number)[]
  >([]);

  const slug = session?.user?.company_slug;
  const menuItems = slug ? getCompanySidebarItems(slug) : [];

  const autoOpenMenus = slug
    ? getActiveParentIds(
        menuItems.flatMap((section) => section.children || []),
        pathname,
      )
    : [];

  // const openMenus = Array.from(new Set([...autoOpenMenus, ...manualOpenMenus]));
  const openMenus = Array.from(
    new Set([
      ...autoOpenMenus.filter((id) => !manualClosedMenus.includes(id)),
      ...manualOpenMenus,
    ]),
  );

  // const toggleMenu = (id: string | number) => {
  //   setManualOpenMenus((prev) =>
  //     prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
  //   );
  // };

  const toggleMenu = (id: string | number) => {
    setManualOpenMenus((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }

      return [...prev, id];
    });

    setManualClosedMenus((prev) => {
      if (prev.includes(id)) {
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
      if (item.heading) {
        return (
          <div
            key={item.heading}
            className="mt-5 mb-1.5 px-2 text-xs font-bold capitalize tracking-wider text-slate-300"
          >
            {item.heading}
          </div>
        );
      }
      const isActive = isItemActive(item, pathname);
      const isSelected = item.url === pathname;
      // const isOpen = openMenus.includes(item.id!);
      // const isSelected = Boolean(item.url && pathname.startsWith(item.url));
      const hasChildren = Boolean(item.children?.length);

      const isOpen = item.id != null && openMenus.includes(item.id);

      const rowClassName = `
        flex w-full items-center gap-2.5 rounded-md px-1.5 py-2
        text-xs transition-all duration-150
        group mb-0.5
        hover:bg-slate-800/60 hover:text-white
        ${
          isSelected
            ? "bg-slate-900/40 font-semibold text-emerald-400"
            : isActive
              ? "bg-slate-800/30 text-white"
              : "text-slate-300"
        }
      `;

      const content = (
        <>
          <Icon
            icon={item.icon || "solar:alt-arrow-right-linear"}
            width={16}
            className={`shrink-0 ${
              isSelected
                ? "text-emerald-400"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          />

          <span className="min-w-0 flex-1 truncate text-left">
            {item.title || item.name}
          </span>

          {hasChildren && (
            <Icon
              icon={
                isOpen
                  ? "solar:alt-arrow-up-linear"
                  : "solar:alt-arrow-down-linear"
              }
              width={14}
              className="shrink-0 text-slate-400"
            />
          )}
        </>
      );

      return (
        <div key={item.id ?? item.name} className="w-full">
          {item.url ? (
            <Link
              href={item.url}
              className={rowClassName}
              style={{
                paddingLeft: `${level * 12 + 10}px`,
              }}
            >
              {content}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (item.id != null) {
                  toggleMenu(item.id);
                }
              }}
              className={`${rowClassName} cursor-pointer`}
              style={{
                paddingLeft: `${level * 12 + 10}px`,
              }}
            >
              {content}
            </button>
          )}

          {hasChildren && (
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
                isOpen
                  ? "max-h-[1000px] opacity-100"
                  : "pointer-events-none max-h-0 opacity-0"
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
    <SimpleBar
      className="h-full px-1.5 py-3 overflow-x-hidden bg-[#103701] text-xs text-white dark:bg-[#11161D] dark:text-[#8C9DAF]"
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
  );
};

export default CompanySidebarLayout; */
