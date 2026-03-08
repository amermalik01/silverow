// app/company/[slug]/layout.tsx

import { getServerSession } from "next-auth";
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
  

  if (!session) redirect("/login");

  console.log('session.user ==== ',session.user);

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
      <div className="page-wrapper flex w-full">
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
}

// export default async function CompanyLayout({ children, params }: { children: React.ReactNode, params: { slug: string } }) {
//   const session = await getServerSession(authOptions);

//   if (!session) redirect("/login");

//   // Prevent "Tenant Leaking"
//   if (session.user.company_slug !== params.slug && !session.user.is_platform_admin) {
//     return <div>Access Denied: You do not belong to this organization.</div>;
//   }

//   return <>{children}</>;
// }