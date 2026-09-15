// app/components/layout/CompanyShell.tsx

"use client";

import { ReactNode, useState } from "react";
// import CompanyHeader from "@/app/components/layout/header/CompanyHeader";
import CompanySidebar from "@/app/components/layout/sidebar/CompanySidebar";
import CompanyHeader from "./header/CompanyHeader";

interface CompanyShellProps {
  children: ReactNode;
}

export default function CompanyShell({ children }: CompanyShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-16">
        <CompanyHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`
        hidden xl:block shrink-0 h-full border-r
        transition-[width] duration-200 ease-in-out
        ${sidebarCollapsed ? "w-[64px]" : "w-[220px]"}
      `}
        >
          <CompanySidebar collapsed={sidebarCollapsed} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <div className="w-full max-w-[1600px] mx-auto px-4 py-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
