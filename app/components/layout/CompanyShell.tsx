// app/components/layout/CompanyShell.tsx

"use client";

import { ReactNode, useState } from "react";
import CompanySidebar from "@/app/components/layout/sidebar/CompanySidebar";
import CompanyHeader from "./header/CompanyHeader";

interface CompanyShellProps {
  children: ReactNode;
}

export default function CompanyShell({ children }: CompanyShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* =========================================
          Desktop Sidebar - Full Height
      ========================================= */}
      <aside
        className={`
          hidden xl:flex xl:flex-col
          h-screen shrink-0
          border-r border-white/10
          transition-[width] duration-200 ease-in-out
          ${sidebarCollapsed ? "w-[64px]" : "w-[220px]"}
        `}
      >
        <CompanySidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* =========================================
          Main Application Area
      ========================================= */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="h-16 shrink-0">
          <CompanyHeader />
        </div>

        {/* Mobile Sidebar + Main Content */}
        <main
          className="
            flex-1
            min-w-0
            min-h-0
            overflow-y-auto
            overflow-x-hidden
            [scrollbar-gutter:stable]
          "
        >
          <div className="w-full max-w-[1600px] mx-auto px-4 py-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/* "use client";

import { ReactNode, useState } from "react";
import CompanySidebar from "@/app/components/layout/sidebar/CompanySidebar";
import CompanyHeader from "./header/CompanyHeader";

interface CompanyShellProps {
  children: ReactNode;
}

export default function CompanyShell({ children }: CompanyShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden  flex flex-col">
      bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]
      <div className="shrink-0 h-16">
        <CompanyHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`
            hidden xl:block shrink-0 h-full border-r
            transition-[width] duration-200 ease-in-out
            ${sidebarCollapsed ? "w-[64px]" : "w-[220px]"}
          `}
        >
          <CompanySidebar collapsed={sidebarCollapsed} />
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <div className="w-full max-w-[1600px] mx-auto px-4 py-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} */
