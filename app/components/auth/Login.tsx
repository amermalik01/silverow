//  app/components/auth/Login.tsx
"use client";

import CardBox from "../shared/CardBox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Icon } from "@iconify/react";

import { useState, FormEvent, useEffect } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import FullLogo from "../layout/shared/logo/FullLogo";
import { useRouter, useParams } from "next/navigation";

export const Login = () => {
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const redirectUser = (user: Session["user"]) => {
    if (user.is_platform_admin) {
      window.location.href = `/admin/dashboard`;
      return;
    }

    if (user.company_slug) {
      window.location.href = `/${user.company_slug}/dashboard`;
      return;
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      redirectUser(session.user);
    }
  }, [status, session]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!res?.ok) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const session = await getSession();

    if (session?.user?.is_platform_admin) {
      router.push("/admin/dashboard");
    }

    if (session?.user?.company_slug) {
      router.push(`/${session.user.company_slug}/dashboard`);
    }
  };

  const modules = [
    {
      icon: "streamline:money-graph-analytics-business-product-graph-data-chart-analysis",
      title: "Finance",
    },
    {
      icon: "hugeicons:sale-tag-01",
      title: "Sales",
    },
    {
      icon: "bx:purchase-tag-alt",
      title: "Purchases",
    },
    {
      icon: "carbon:inventory-management",
      title: "Inventory",
    },
    {
      icon: "material-symbols:mail-outline-rounded",
      title: "Mail",
    },
  ];

  return (
    <>
      <div className="h-screen w-full flex justify-center items-center bg-[url('/images/logos/nevico-login-bg-1.png')] bg-cover bg-center p-4">
        {" "}
        {/* bg-lightprimary */}
        {/* <div className="md:min-w-[480px] min-w-max "> */}
        <div className="w-full sm:max-w-[480px] md:max-w-[520px] ">
          <CardBox
            className="
            w-full
            rounded-3xl
            bg-white/90
            backdrop-blur-xl
            border border-emerald-100/60
            shadow-[0_20px_80px_rgba(0,0,0,0.15)]
            text-slate-800
            p-8 sm:p-10
          "
          >
            {/* <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700 mx-auto mb-6" /> */}
            {/* <div className="h-1.5 w-16 rounded-full bg-emerald-600 mx-auto mb-6" /> */}

            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                {/* <div
                  className="
                    bg-gradient-to-r
                    from-emerald-800
                    to-emerald-700
                    rounded-2xl
                    px-8
                    py-5
                    shadow-lg
                    shadow-emerald-900/20
                  "
                >
                  <FullLogo />
                </div> */}

                <div
                  className="
                  bg-emerald-800
                  rounded-2xl
                  px-8
                  py-4
                  shadow-md
                  shadow-emerald-950/20
                "
                >
                  <FullLogo />
                </div>
              </div>

              {/* <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  GO BEYOND WITH NEVICO
                </h1>

                <h1 className="text-3xl font-bold text-slate-800">
                  Welcome Back
                </h1>

                <p className="text-sm text-slate-500 mt-2">
                  Sign in to continue to your workspace
                </p>
              </div> */}

              <div>
                <span className="text-xs font-bold tracking-widest text-emerald-800 uppercase block mb-1">
                  Go Beyond With Nevico{/* SILVEROW */}
                </span>
                {/* <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Welcome Back
                </h1> */}
                <h2 className=" text-center text-xl font-semibold text-slate-800">
                  Take full control of your business
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sign in to continue to your workspace
                </p>
              </div>
            </div>

            {/* <h2 className=" text-center text-xl font-semibold text-white">
              Take full control of your business
            </h2> */}

            {error && (
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-red-50
                  border
                  border-red-200
                  text-red-600
                  text-sm
                  p-3
                  text-center
                "
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <div>
                  {/* className="mb-2 block" */}
                  {/* <Label htmlFor="email1" className="font-medium"> */}
                  <Label
                    htmlFor="email1"
                    className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-700"
                  >
                    Email
                  </Label>
                </div>

                <div className="relative">
                  <Icon
                    icon="solar:letter-linear"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
                  />
                  <Input
                    className="
                        h-12
                        pl-11
                        rounded-xl
                        border-slate-200
                        bg-slate-50/80
                        focus:bg-white
                        focus:border-emerald-600
                        focus:ring-4
                        focus:ring-emerald-100
                        transition-all
                    "
                    id="email1"
                    type="email"
                    placeholder="Enter your email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div>
                  <Label
                    htmlFor="password1"
                    className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-700"
                  >
                    Password
                  </Label>
                </div>

                <div className="relative">
                  <Icon
                    icon="solar:lock-password-linear"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
                  />
                  <Input
                    className="
                      h-12
                      pl-11
                      rounded-xl
                      border-slate-200
                      bg-slate-50/80
                      focus:bg-white
                      focus:border-emerald-600
                      focus:ring-4
                      focus:ring-emerald-100
                      transition-all
                    "
                    id="password1"
                    type="password"
                    placeholder="Enter your password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* <div className="flex items center gap-2 justify-center mt-6 flex-wrap"> */}
              <Button
                className="
                    w-full
                    h-12
                    mt-2
                    rounded-xl
                    bg-emerald-700
                    hover:bg-emerald-800
                    text-white
                    font-semibold
                    shadow-md
                    shadow-emerald-900/20
                    transition-all
                    duration-200
                    active:scale-[0.99]
                  "
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              {/* </div> */}
            </form>
          </CardBox>

          {/* Bottom Modules Section */}
          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/90 drop-shadow-sm mb-4">
              Business in Motion
            </p>

            <div className="grid grid-cols-5 gap-2.5">
              {modules.map((item) => (
                <div
                  key={item.title}
                  className="
                  backdrop-blur-md
                  bg-slate-900/40
                  border
                  border-white/15
                  rounded-xl
                  py-3
                  px-1
                  flex
                  flex-col
                  items-center
                  justify-center
                  transition-all
                  duration-200
                  hover:bg-slate-900/60
                  hover:-translate-y-0.5
                  shadow-sm
                "
                >
                  <Icon icon={item.icon} className="text-xl text-emerald-300" />
                  <span className="mt-1.5 text-[11px] font-medium text-slate-100">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* <div className="mt-10">
            <p className="text-center text-white font-semibold tracking-wide mb-5">
              Business in Motion
            </p>

            <div className="grid grid-cols-5 gap-3">
              {[
                {
                  icon: "streamline:money-graph-analytics-business-product-graph-data-chart-analysis",
                  title: "Finance",
                },
                {
                  icon: "hugeicons:sale-tag-01",
                  title: "Sales",
                },
                {
                  icon: "bx:purchase-tag-alt",
                  title: "Purchases",
                },
                {
                  icon: "carbon:inventory-management",
                  title: "Inventory",
                },
                {
                  icon: "material-symbols:mail-outline-rounded",
                  title: "Mail",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="
                    backdrop-blur-md
                    bg-white/15
                    border
                    border-white/20
                    rounded-xl
                    py-4
                    flex
                    flex-col
                    items-center
                    transition-all
                    duration-300
                    hover:bg-white/25
                    hover:-translate-y-1
                "
                >
                  <Icon icon={item.icon} className="text-2xl text-white" />

                  <span className="mt-2 text-xs font-medium text-white">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
};

{
  /* // shadow-[0_20px_60px_rgba(16,24,40,0.15)] */
}
{
  /* className="bg-[#010d0c] text-white" */
}
{
  /* <div className="flex justify-center mb-4">
              <FullLogo />
            </div>

            <div className="flex items-center justify-center gap-2">
              <hr className="grow border-ld" />
              <p className="text-base text-ld font-medium">
                GO BEYOND WITH NEVICO 
              </p>
              <hr className="grow border-ld" />
            </div> */
}
{
  /* <div className=" w-[480px] min-h-[180px] mx-auto text-center ">
            <div className=" w-full float-right px-5 mt-5 text-white">
              <p className="mt-5 font-medium">Business in Motion</p>

              <div className="flex flex-wrap justify-between mt-4">
                <div className="icon-holder text-center ">
                  <Icon
                    icon="streamline:money-graph-analytics-business-product-graph-data-chart-analysis"
                    className="text-[20px] mx-auto"
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Finance
                  </div>
                </div>

                <div className="icon-holder text-center ">
                  <Icon
                    icon="hugeicons:sale-tag-01"
                    className="text-[20px] mx-auto"
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Sales
                  </div>
                </div>

                <div className="icon-holder text-center">
                  <Icon
                    icon="bx:purchase-tag-alt"
                    className="text-[20px] mx-auto"
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Purchases
                  </div>
                </div>

                <div className="icon-holder text-center">
                  <Icon
                    icon="carbon:inventory-management"
                    className="text-[20px] mx-auto"
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Inventory
                  </div>
                </div>

                <div className="icon-holder text-center ">
                  <Icon
                    icon="material-symbols:mail-outline-rounded"
                    className="text-[20px]"
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Mail
                  </div>
                </div>
              </div>
            </div>
          </div> */
}
