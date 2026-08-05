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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Full width header */}
      <CompanyHeader />

      {/* Body */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden xl:block w-[190px] border-r bg-slate-950">
          <CompanySidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-auto px-4">
          <div className="container mx-auto py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
/* return (
    <div className="relative min-h-screen bg-background"> bg-[#F9FAFB]
      <div className="xl:block hidden">
        <CompanySidebar />
      </div>
      
 
      <div className="body-wrapper min-h-screen xl:pl-[240px] flex flex-col w-full">
        <CompanyHeader />
        

        <div className="flex-1 w-full overflow-x-auto">
          <div className="container mx-auto py-6 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  ); */
