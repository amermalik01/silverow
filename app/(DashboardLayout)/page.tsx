
import React from "react";
import SalesOverview from "../components/dashboard/SalesOverview";
import { YearlyBreakup } from "../components/dashboard/YearlyBreakup";
import { MonthlyEarning } from "../components/dashboard/MonthlyEarning";
import { RecentTransaction } from "../components/dashboard/RecentTransaction";
import { ProductPerformance } from "../components/dashboard/ProductPerformance";
import { Footer } from "../components/dashboard/Footer";
import { TopCards } from "../components/dashboard/TopCards";
import ProfileWelcome from "../components/dashboard/ProfileWelcome";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";



export default async function AdminDashboard()  {

  const session = await getServerSession(authOptions);

  if (!session || !session.user.is_platform_admin) {
    redirect("/login");
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <ProfileWelcome/>
        </div>

        <div>Super Admin Dashboard</div>

        <div className="col-span-12">
          <TopCards />
        </div>
        <div className="lg:col-span-8 col-span-12">
          <SalesOverview />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <YearlyBreakup />
            </div>
            <div className="col-span-12">
              <MonthlyEarning />
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 col-span-12">
          <RecentTransaction />
        </div>
        <div className="lg:col-span-8 col-span-12 flex">
          <ProductPerformance />
        </div>
        <div className="col-span-12">
          <Footer />
        </div>
      </div>
    </>
  );
};

