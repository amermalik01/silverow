// app/[slug]/layout.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import CompanyShell from "@/app/components/layout/CompanyShell";

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

  return <CompanyShell>{children}</CompanyShell>;
}
