// app/components/layout/sidebar/CompanySidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import { getCompanySidebarItems } from "./company_sidebaritems";
import FullLogo from "../shared/logo/FullLogo";

import SidebarSvgIcon from "@/app/components/layout/sidebar/components/SidebarSvgIcon";

interface SidebarItemType {
  heading?: string;
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: SidebarItemType[];
}

// interface CompanySidebarProps {
//   collapsed?: boolean;
// }

interface CompanySidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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

// const CompanySidebar = ({ collapsed = false }: CompanySidebarProps) => {

const CompanySidebar = ({
  collapsed = false,
  onToggleCollapse,
}: CompanySidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [manualOpenMenu, setManualOpenMenu] = useState<string | number | null>(
    null,
  );

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
      ...autoOpenMenus,
      ...(manualOpenMenu != null ? [manualOpenMenu] : []),
    ]),
  );

  const toggleMenu = (id: string | number) => {
    setManualOpenMenu((prev) => (prev === id ? null : id));
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

      // const iconName = item.icon || "solar:widget-2-linear";
      const iconName =
        item.icon ||
        (hasChildren
          ? "solar:folder-with-files-linear"
          : "solar:record-circle-linear");

      const icon = (
        <SidebarSvgIcon
          src={iconName}
          size={level === 0 ? 20 : 18}
          collapsed={collapsed}
          className={` shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`}
        />
      );

      // const icon = (
      //   <Icon
      //     icon={iconName}
      //     width={level === 0 ? 18 : 16}
      //     height={level === 0 ? 18 : 16}
      //     // width={18}
      //     // height={18}
      //     className={` shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`}
      //   />
      // );

      const label = (
        <span
          className={` min-w-0 flex-1 truncate text-left text-md transition-all duration-150 ${collapsed ? "hidden" : "block"}`}
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
            <span className=" pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-md text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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
                <div className="mb-1 px-2 py-1.5 text-md font-semibold text-white">
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
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* =========================================
        Sidebar Background Image
    ========================================= */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/images/logos/Silvin_sidebar_bg.png')",
          backgroundSize: collapsed ? "auto 100%" : "cover",
          backgroundPosition: "center top",
        }}
      />

      {/* Background Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5, 20, 12, 0.78) 0%, rgba(5, 20, 12, 0.88) 100%)",
        }}
      />

      {/* =========================================
        Sidebar Brand / Logo Section
    ========================================= */}
      <div
        className={`
        relative z-20
        flex h-16 shrink-0 items-center
        border-b border-white/10
        transition-all duration-200
        ${collapsed ? "justify-center px-1" : "justify-between px-3"}
      `}
      >
        {/* Logo */}
        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <FullLogo />
          </div>
        )}

        {/* Collapse / Expand Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-md
          text-white/80
          transition-colors
          hover:bg-white/10
          hover:text-white
        "
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon
            icon={
              collapsed
                ? "solar:sidebar-minimalistic-outline"
                : "solar:sidebar-minimalistic-outline"
            }
            width={20}
            height={20}
          />
        </button>
      </div>

      {/* =========================================
        Sidebar Navigation
    ========================================= */}
      <SimpleBar
        className="
        relative z-10
        min-h-0 flex-1
        overflow-x-visible
        bg-transparent
        text-lg text-white
      "
        style={{ height: "auto" }}
      >
        <div
          className={`py-3 transition-all duration-200 ${
            collapsed ? "px-1.5" : "px-1.5"
          }`}
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
    </div>
  );
};

export default CompanySidebar;
/* return (
    <SimpleBar
      className=" h-full overflow-x-visible bg-[#103701] text-md text-white dark:bg-[#11161D] dark:text-[#8C9DAF] "
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
  ); */

/* return (
    <div className="relative h-full w-full overflow-hidden">

      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/images/logos/Silvin_sidebar_bg.png')",
          backgroundSize: collapsed ? "auto 100%" : "cover",
          backgroundPosition: "center top",
        }}
      />

      
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5, 20, 12, 0.78) 0%, rgba(5, 20, 12, 0.88) 100%)",
        }}
      />


      <SimpleBar
        className="relative z-10 h-full overflow-x-visible bg-transparent text-md text-white"
        style={{ height: "100%" }}
      >
        <div
          className={`py-3 transition-all duration-200 ${
            collapsed ? "px-1.5" : "px-1.5"
          }`}
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
    </div>
  ); */
