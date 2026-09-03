// app/[slug]/layout.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import CompanyHeader from "@/app/components/layout/header/CompanyHeader";
import CompanySidebar from "@/app/components/layout/sidebar/CompanySidebar";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CompanyLayout({ children, params }: LayoutProps) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  const session_slug = session?.user?.company_slug;

  if (!session_slug) {
    return (
      <div className="h-screen flex items-center justify-center text-xs text-gray-500">
        Loading...
      </div>
    );
  }

  if (session.user.company_slug !== slug && !session.user.is_platform_admin) {
    return (
      <div className="h-screen flex items-center justify-center p-10 text-center">
        <div>
          <h1 className="text-red-600 font-bold">Access Denied</h1>
          <p>You do not belong to this organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] flex flex-col">
      {/* Fixed application header */}
      <div className="shrink-0 h-16">
        <CompanyHeader />
      </div>

      {/* Application body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden xl:block w-[190px] shrink-0 h-full border-r">
          <CompanySidebar />
        </aside>

        {/* Main content scroll area */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <div className="w-full max-w-[1600px] mx-auto px-4 py-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/* import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import CompanyHeader from "@/app/components/layout/header/CompanyHeader";
import CompanySidebar from "@/app/components/layout/sidebar/CompanySidebar";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CompanyLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const session_slug = session?.user?.company_slug;

  if (!session_slug) {
    return (
      <div className="w-auto h-screen flex items-center justify-center text-xs text-gray-500">
        Loading...
      </div>
    );
  }

  if (!session) redirect("/login");

  if (session.user.company_slug !== slug && !session.user.is_platform_admin) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-red-600 font-bold">Access Denied</h1>
        <p>You do not belong to this organization.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] flex flex-col">
      <CompanyHeader />

      <div className="flex flex-1">
        <aside className="hidden xl:block w-[190px] shrink-0 sticky top-[64px] h-[calc(100vh-4rem)] border-r">
          <CompanySidebar />
        </aside>
        <main className="flex-1 min-w-0 overflow-x-auto px-4">
          <div className="container mx-auto py-2">{children}</div>
        </main>
      </div>
    </div>
  );
} */
