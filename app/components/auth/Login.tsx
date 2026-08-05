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
  return (
    <>
      <div className="h-screen w-full flex justify-center items-center bg-[url('/images/logos/nevico-login-bg.png')] bg-cover"> {/* bg-lightprimary */}
        <div className="md:min-w-[450px] min-w-max">
          <CardBox className="bg-[#010d0c] text-white">
            <div className="flex justify-center mb-4">
              <FullLogo />
            </div>

            <div className="flex items-center justify-center gap-2">
              <hr className="grow border-ld" />
              <p className="text-base text-ld font-medium">
                GO BEYOND WITH NEVICO{/* SILVEROW */}
              </p>
              <hr className="grow border-ld" />
            </div>

            <h2 className=" text-center text-xl font-semibold text-white">
              Take full control of your business
            </h2>

            {error && (
              <div className="mb-4 text-xs text-red-500 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="email1" className="font-medium">
                    Email
                  </Label>
                </div>
                <Input
                  id="email1"
                  type="email"
                  placeholder="Enter your email"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mt-6">
                <div className="mb-2 block">
                  <Label htmlFor="password1" className="font-medium">
                    Password
                  </Label>
                </div>
                <Input
                  id="password1"
                  type="password"
                  placeholder="Enter your password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items center gap-2 justify-center mt-6 flex-wrap">
                <Button
                  className="w-full mt-6 text-xs font-medium"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>
          </CardBox>

          <div className=" w-[480px] min-h-[180px] mx-auto text-center ">
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
          </div>
        </div>
      </div>
    </>
  );
};
