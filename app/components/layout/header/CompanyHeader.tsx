// app/components/layout/header/CompanyHeader.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Icon } from "@iconify/react";

import Profile from "./Profile";
import Notifications from "./Notifications";
import SidebarLayout from "../sidebar/Sidebar";
import FullLogo from "../shared/logo/FullLogo";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { getCompanySidebarItems } from "../sidebar/company_sidebaritems";

interface CompanyHeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface MenuItem {
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: MenuItem[];
}

const isItemActive = (item: MenuItem, pathname: string): boolean => {
  if (item.url && pathname === item.url) {
    return true;
  }

  if (item.children?.length) {
    return item.children.some((child) => isItemActive(child, pathname));
  }

  return false;
};

interface ManagementMenuItemProps {
  item: MenuItem;
  pathname: string;
  level?: number;
  defaultOpen?: boolean;
}

const ManagementMenuItem = ({
  item,
  pathname,
  level = 0,
  defaultOpen = false,
}: ManagementMenuItemProps) => {
  const hasChildren = Boolean(item.children?.length);
  const active = isItemActive(item, pathname);

  // const [open, setOpen] = useState(active && hasChildren);

  const [open, setOpen] = useState(defaultOpen || (active && hasChildren));

  // useEffect(() => {
  //   setOpen(true);
  // }, []);

  if (item.url) {
    return (
      <Link
        href={item.url}
        className={` group flex items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${active ? "bg-emerald-500/10 text-emerald-500" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"} `}
        style={{ marginLeft: level * 12 }}
      >
        {" "}
        {/* Nested item bullet */}{" "}
        {level > 0 && (
          <span
            className={` h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"} `}
          />
        )}
        {/* Top-level icon */}
        {level === 0 && item.icon && (
          <Icon icon={item.icon} width={17} height={17} className="shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">
          {" "}
          {item.title || item.name}{" "}
        </span>{" "}
      </Link>
    );
  }

  /*

  Parent item with children
  */
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${active ? "text-emerald-500" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}
        style={{
          marginLeft: level * 12,
          width: `calc(100% - ${level * 12}px)`,
        }}
      >
        {level === 0 && item.icon && (
          <Icon icon={item.icon} width={17} height={17} className="shrink-0" />
        )}

        {/* Nested bullet */}
        {level > 0 && (
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`}
          />
        )}

        <span className="min-w-0 flex-1 font-medium">
          {" "}
          {item.title || item.name}{" "}
        </span>
        <Icon
          icon={
            open ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"
          }
          width={14}
          height={14}
          className="shrink-0 text-slate-400"
        />
      </button>

      {/* Children */}

      <div
        className={` overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${open ? "max-h-[2000px] opacity-100" : "pointer-events-none max-h-0 opacity-0"} `}
      >
        {" "}
        <div className="mt-0.5 space-y-0.5">
          {" "}
          {item.children?.map((child) => (
            <ManagementMenuItem
              key={child.id ?? child.name}
              item={child}
              pathname={pathname}
              level={level + 1}
            />
          ))}{" "}
        </div>{" "}
      </div>
    </div>
  );
};

/* =========================================================
    Company Header
    ========================================================= */

const CompanyHeader = ({
  sidebarCollapsed = false,
  onToggleSidebar,
}: CompanyHeaderProps) => {
  const { theme, setTheme } = useTheme();

  const pathname = usePathname();
  const { data: session } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);

  const managementRef = useRef<HTMLDivElement>(null);

  setTheme("light");

  /* =======================================================
      Theme
      ======================================================= */

  const toggleMode = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  /* =======================================================
      Company Menu
      ======================================================= */

  const slug = session?.user?.company_slug;

  const allSections = slug ? getCompanySidebarItems(slug) : [];

  const managementSection = allSections.find(
    (section) => section.heading === "Management",
  );

  const managementItems = (managementSection?.children || []) as MenuItem[];

  /* =======================================================
      Close Management Dropdown On Outside Click
      ======================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        managementRef.current &&
        !managementRef.current.contains(event.target as Node)
      ) {
        setManagementOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* =======================================================
      Close Management After Navigation
      ======================================================= */

  // useEffect(() => {
  //   setManagementOpen(false);
  // }, [pathname]);

  /* =======================================================
      Render
      ======================================================= */

  return (
    <>
      <header className=" h-16 shrink-0 border-b bg-[#103701] text-white dark:bg-[#262F3C] ">
        <nav className=" h-16 px-4 xl:px-6 flex items-center justify-between w-full ">
          {/* =================================================
              Mobile Toggle
              ================================================= */}
          <div className="flex items-center xl:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="
                  p-2
                  flex
                  justify-center
                  items-center
                  cursor-pointer
                  rounded-full
                  hover:bg-white/10
                  transition
                  "
              aria-label="Open sidebar"
            >
              <Icon icon="tabler:menu-2" height={20} width={20} />
            </button>
          </div>

          {/* =================================================
                  Mobile Logo
              ================================================= */}
          <div className="block xl:hidden">
            <FullLogo />
          </div>

          {/* =================================================
                  Mobile Actions
              ================================================= */}
          <div
            className="
              flex
              xl:hidden
              items-center
              gap-1
            "
          >
            {/* Theme */}
            {/* <button
              type="button"
              onClick={toggleMode}
              className="
            p-2
            rounded-full
            hover:bg-white/10
            transition
          "
              aria-label="Toggle theme"
            >
              <Icon
                icon={
                  theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                }
                width={20}
              />
            </button> */}

            <Profile />
          </div>

          {/* =================================================
                  Desktop Header
              ================================================= */}
          <div
            className="
                hidden
                xl:flex
                items-center
                justify-between
                w-full
              "
          >
            {/* ===============================================
                    Left Side
                =============================================== */}
            <div className="flex items-center gap-3">
              {/* Sidebar Collapse Button */}
              <button
                type="button"
                onClick={onToggleSidebar}
                className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-md
                    text-white/80
                    hover:bg-white/10
                    hover:text-white
                    transition
                  "
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={
                  sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                <Icon
                  icon={
                    sidebarCollapsed
                      ? "solar:sidebar-minimalistic-outline"
                      : "solar:sidebar-minimalistic-outline"
                  }
                  width={20}
                  height={20}
                />
              </button>

              {/* Logo */}
              <FullLogo />
            </div>

            {/* ===============================================
                    Right Side
                =============================================== */}
            <div className="flex items-center gap-2">
              {/* <button
                type="button"
                onClick={toggleMode}
                className="
                  p-2
                  rounded-full
                  hover:bg-white/10
                  transition
                "
                aria-label="Toggle theme"
              >
                <Icon
                  icon={
                    theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                  }
                  width={20}
                />
              </button>

             
              <Notifications /> */}

              {/* =============================================
                      Management Settings
                  ============================================= */}
              <div ref={managementRef} className="relative">
                <button
                  type="button"
                  onClick={() => setManagementOpen((prev) => !prev)}
                  className={`
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      transition
                      ${
                        managementOpen
                          ? "bg-white/15 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  title="Management"
                  aria-label="Management"
                  aria-expanded={managementOpen}
                >
                  <Icon icon="solar:settings-linear" width={20} height={20} />
                </button>

                {/* =========================================
                        Management Dropdown
                    ========================================= */}
                {managementOpen && (
                  <div
                    className="
                      absolute
                      right-0
                      top-full
                      z-[100]
                      mt-2

                      w-[300px]
                      max-w-[calc(100vw-2rem)]

                      overflow-hidden
                      rounded-xl

                      border
                      border-slate-200
                      bg-white

                      shadow-2xl

                      dark:border-slate-700
                      dark:bg-[#11161D]
                    "
                  >
                    {/* -------------------------------------
                            Dropdown Header
                        ------------------------------------- */}
                    <div
                      className="
                        border-b
                        border-slate-200
                        px-4
                        py-3
                        dark:border-slate-700
                      "
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-emerald-500/10
                            text-emerald-500
                          "
                        >
                          <Icon
                            icon="solar:settings-linear"
                            width={19}
                            height={19}
                          />
                        </div>

                        <div className="min-w-0">
                          <div
                            className="
                              text-sm
                              font-semibold
                              text-slate-900
                              dark:text-white
                            "
                          >
                            Management
                          </div>

                          <div
                            className="
                          text-[11px]
                          text-slate-500
                          dark:text-slate-400
                        "
                          >
                            System configuration
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* -------------------------------------
                            Dropdown Menu
                        ------------------------------------- */}
                    <div
                      className="
                        max-h-[70vh]
                        overflow-y-auto
                        p-2
                      "
                    >
                      {managementItems.length > 0 ? (
                        <div className="space-y-0.5">
                          {managementItems.map((item) => (
                            <ManagementMenuItem
                              key={item.id ?? item.name}
                              item={item}
                              pathname={pathname}
                              defaultOpen={item.id === "Settings"}
                            />
                          ))}
                          {/* {managementItems.map((item) => (
                            <ManagementMenuItem
                              key={item.id ?? item.name}
                              item={item}
                              pathname={pathname}
                            />
                          ))} */}
                        </div>
                      ) : (
                        <div
                          className="
                            px-3
                            py-5
                            text-center
                            text-xs
                            text-slate-500
                          "
                        >
                          No management options available.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div
                className="
                  mx-1
                  h-8
                  w-px
                  bg-white/20
                "
              />

              {/* Profile */}
              <Profile />
            </div>
          </div>
        </nav>
      </header>

      {/* =====================================================
              Mobile Sidebar
          ===================================================== */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          className="
              w-64
              p-0
              bg-slate-950
              border-r
              border-slate-800
              text-white
            "
        >
          <VisuallyHidden>
            <SheetTitle>Sidebar</SheetTitle>
          </VisuallyHidden>

          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompanyHeader;

/* "use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
import Profile from "./Profile";
import Notifications from "./Notifications";
import SidebarLayout from "../sidebar/Sidebar";
import FullLogo from "../shared/logo/FullLogo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const CompanyHeader = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMode = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <header className="h-16 shrink-0 border-b bg-[#103701] dark:bg-[#262F3C] text-white">
        <nav className="h-16 px-6 flex justify-between items-center w-full">

          <div
            onClick={() => setIsOpen(true)}
            className="p-2 xl:hidden flex justify-center items-center cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon icon="tabler:menu-2" height={20} width={20} />
          </div>


          <div className="block xl:hidden">
            <FullLogo />
          </div>


          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={toggleMode}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Icon
                icon={
                  theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                }
                width="20"
              />
            </button>

            <Profile />
          </div>


          <div className="hidden xl:flex items-center justify-between w-full">
            <FullLogo />

            <div className="flex items-center gap-4">
              <button
                onClick={toggleMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Icon
                  icon={
                    theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                  }
                  width="20"
                />
              </button>

              <Notifications />

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

              <Profile />
            </div>
          </div>
        </nav>
      </header>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-slate-950 border-r border-slate-800 text-white"
        >
          <VisuallyHidden>
            <SheetTitle>sidebar</SheetTitle>
          </VisuallyHidden>

          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompanyHeader; */
