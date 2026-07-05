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
      <div className="w-[240px] h-screen flex items-center justify-center text-sm text-gray-500">
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
    <div className="relative min-h-screen bg-background">
      {/* Sidebar is fixed on desktop and isolated from horizontal scrolls */}
      <div className="xl:block hidden">
        <CompanySidebar />
      </div>
      
      {/* Shift the entire body precisely by 240px on desktop screens */}
      <div className="body-wrapper min-h-screen xl:pl-[240px] flex flex-col w-full">
        <CompanyHeader />
        
        {/* Main horizontal data scroll boundary layer */}
        <div className="flex-1 w-full overflow-x-auto">
          <div className="container mx-auto px-4 sm:px-6 py-6 min-w-0">
            {children}
          </div>
        </div>
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

// 1. Update the type definition: params is now a Promise
interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>; 
}


export default async function CompanyLayout({ children, params }: LayoutProps) {
  // 2. Await the params before using them
  const { slug } = await params;
  
  const session = await getServerSession(authOptions);

  const session_slug = session?.user?.company_slug;

  if (!session_slug) {
    return (
      <div className="w-[270px] h-screen flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }
  

  if (!session) redirect("/login");

  // console.log('session.user ==== ',session.user);

  // 3. Use the awaited 'slug' for the check
  if (session.user.company_slug !== slug && !session.user.is_platform_admin) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-red-600 font-bold">Access Denied</h1>
        <p>You do not belong to this organization.</p>
      </div>
    );
  }
  return (
    <div className="flex w-full min-h-screen">
      <div className="page-wrapper flex w-full overflow-x-auto">
        <div className="xl:block hidden">
          <CompanySidebar />
        </div>
        <div className="body-wrapper w-full bg-background">
          <CompanyHeader />
          <div className="container mx-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
} */
