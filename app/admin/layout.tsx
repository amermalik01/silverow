// app/admin/layout.tsx

import { authOptions } from "@/lib/auth";
import Header from "../components/layout/header/Header";
import Sidebar from "../components/layout/sidebar/Sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user.is_platform_admin) {
    redirect("/login");
  }

  return (
    <div className="flex w-full min-h-screen">
      <div className="page-wrapper flex w-full">
        <div className="xl:block hidden">
          <Sidebar />
        </div>
        <div className="body-wrapper w-full bg-background">
          <Header />
          <div className="container mx-auto px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex w-full min-h-screen">
      <div className="page-wrapper flex w-full">
        <div className="xl:block hidden">
          <Sidebar />
        </div>
        <div className="body-wrapper w-full bg-background">
          <Header />
          <div className={`container mx-auto px-6 py-30`}>{children}</div>
        </div>
      </div>
    </div>
  );
} */