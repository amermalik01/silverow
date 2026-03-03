"use client";

import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";
import CardBox from "../shared/CardBox";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Icon } from "@iconify/react";

import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import type { Session } from "next-auth";

export const Login = () => {
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectUser = (user: Session["user"]) => {
    if (user.is_platform_admin) {
      window.location.href = "http://admin.localhost:3000/admin/dashboard";
      return;
    }

    if (user.company_slug) {
      window.location.href = `http://${user.company_slug}.localhost:3000/company/dashboard`;
      return;
    }
  };

  // 🚀 Auto redirect if already logged in
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

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Session will auto update → useEffect will redirect
  };
  return (
    <>
      <div className="h-screen w-full flex justify-center items-center bg-lightprimary">
        <div className="md:min-w-[450px] min-w-max">
          <CardBox>
            <div className="flex justify-center mb-4">
              <FullLogo />
            </div>

            <div className="flex items-center justify-center gap-2">
              <hr className="grow border-ld" />
              <p className="text-base text-ld font-medium">
                GO BEYOND WITH SILVEROW
              </p>
              <hr className="grow border-ld" />
            </div>

            <h2 className=" text-center text-xl font-semibold">
              Take full control of your business
            </h2>

            {error && (
              <div className="mb-4 text-sm text-red-500 text-center">
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
                {/* <Link
                href="/auth/register"
                className="text-sm font-medium text-primary hover:text-primaryemphasis"
              >
                Create an account
              </Link> */}

                <Button
                  className="w-full mt-6 text-sm font-medium"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>
          </CardBox>

          <div className=" w-[480px] min-h-[180px] mx-auto text-center ">
            <div className=" w-full float-right px-5 mt-5">
              <p className="mt-5 font-medium">Business in Motion</p>

              <div className="flex flex-wrap justify-between mt-4">
                <div className="icon-holder text-center ">
                  <Icon
                    icon="streamline:money-graph-analytics-business-product-graph-data-chart-analysis"
                    height={21}
                    width={21}
                  />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Finance
                  </div>
                </div>

                <div className="icon-holder text-center ">
                  <Icon icon="solar:tag-price-bold" height={21} width={21} />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Sales
                  </div>
                </div>

                <div className="icon-holder text-center">
                  <Icon icon="solar:bag-4-linear" className="text-[20px]" />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Purchases
                  </div>
                </div>

                <div className="icon-holder text-center">
                  <Icon icon="solar:bag-4-linear" className="text-[20px]" />
                  <div className="icon-name font-bold text-[10px] mt-2">
                    Inventory
                  </div>
                </div>

                <div className="icon-holder text-center ">
                  <Icon icon="solar:bag-4-linear" className="text-[20px]" />
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

// const { data: session } = useSession();
// const router = useRouter();

// useEffect(() => {
//   if (!session) return;

//   if (session.user.is_platform_admin) {
//     window.location.href = "https://admin.crmsystem.com";
//     return;
//   }

//   if (session.user.company_slug) {
//     window.location.href = `https://${session.user.company_slug}.crmsystem.com`;
//   }
// }, [session]);

/* async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    });
  } */

{
  /* <div className="main-panel__content2 bg-white/85 w-[680px] min-h-[180px] mx-auto text-center pt-5 mt-6">
          <div className="enterprise-panel__content w-1/2 float-left px-5">
            <h2 className="enterprise-panel__header text-[#103701] text-xl font-semibold">
              <small className="enterprise-panel__subheader block text-[#103701] text-sm font-normal">
                GO BEYOND WITH Silverow
              </small>
              Take full control of your business
            </h2>
          </div>

          <div className="enterprise-panel__footer2 w-1/2 float-right px-5 mt-5">
            <p className="enterprise-panel__footer__lead text-[#103701] mt-5 font-medium">
              Business in Motion
            </p>

            <div className="flex flex-wrap justify-between mt-4">
              <div className="icon-holder text-center text-[#103701]">
                <span className="mbri-growing-chart text-[20px]"></span>
                <div className="icon-name font-bold text-[10px] mt-2">
                  Finance
                </div>
              </div>

              <div className="icon-holder text-center text-[#103701]">
                <span className="mbri-sale text-[20px]"></span>
                <div className="icon-name font-bold text-[10px] mt-2">
                  Sales
                </div>
              </div>

              <div className="icon-holder text-center text-[#103701]">
                <span className="mbri-shopping-bag text-[20px]"></span>
                <div className="icon-name font-bold text-[10px] mt-2">
                  Purchases
                </div>
              </div>

              <div className="icon-holder text-center text-[#103701]">
                <span className="mbri-extension text-[20px]"></span>
                <div className="icon-name font-bold text-[10px] mt-2">
                  Inventory
                </div>
              </div>

              <div className="icon-holder text-center text-[#103701]">
                <span className="mbri-letter text-[20px]"></span>
                <div className="icon-name font-bold text-[10px] mt-2">Mail</div>
              </div>
            </div>
          </div>
        </div> */
}
/* 


  <div className="main-panel__table">
    <div className="main-panel__table-cell pt-[160px]">
      
  
      <div className="main-panel__content max-w-[680px] p-[20px_60px] bg-white/85 mx-auto">
        <div className="ipadUsermessage mb-4">
          <span className="mbri-italic"></span> Tablet users: For better user experience, view Nevico in landscape mode.
        </div>

        <div className="w-full flex flex-wrap">

          <div className="w-1/2 text-[#103701]">
            <h1 className="main-panel__heading text-2xl font-bold">
              Sign in to Nevico
              <small className="main-panel__subheading block text-base font-normal">
                Enter your details below.
              </small>
            </h1>
          </div>

 
          <div className="w-1/2 mt-10 flex justify-end">
            <button
              className="btn-login px-[45px] py-2 bg-[#103701] text-white rounded hover:bg-green-800"
              type="button"
              onClick={() => window.open('https://silverrow.co.uk/', '_blank')}
            >
              <span>Visit Our Website</span>
            </button>
          </div>
        </div>


        <form
          className="mt-6 bg-white p-4"
          role="form"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="authmessage text-red-600 mb-2" ng-if="session_expiry_message">
            <i className="material-icons align-middle">error_outline</i> {{session_expiry_message}}
          </div>

          <div className="authmessage text-red-600 mb-2" ng-if="authMsg">
            <i className="material-icons align-middle">error_outline</i> {{authMsg}}
          </div>

          <div className="form__group mb-4">
            <label className="form__label block mb-1">Email Address</label>
            <input
              type="text"
              ng-className="{'border-red-500': authMsg}"
              className="form__input topre fields_h w-full border border-gray-300 rounded px-3 py-2"
              id="userName"
              placeholder="Username"
              autoComplete="off"
              required
            />
          </div>

          <div className="form__group mb-4">
            <label className="form__label block mb-1">Password</label>
            <input
              type="password"
              ng-className="{'border-red-500': authMsg}"
              className="form__input botre fields_h w-full border border-gray-300 rounded px-3 py-2 mb-2"
              id="Password1"
              placeholder="Password"
              required
            />
          </div>

          <div className="actions text-center mt-4">
            <button
              className="btn-login px-6 py-2 bg-[#103701] text-white rounded hover:bg-green-800 disabled:opacity-50"
              type="submit"
            >
              <span ng-if="!flagSignin">SIGN IN</span>
              <span ng-if="flagSignin">
                SIGNING IN
                <i className="fa fa-circle-o-notch fa-spin fa-3x fa-fw text-[13px]"></i>
              </span>
            </button>
          </div>
        </form>
      </div>


      <div className="main-panel__content2 bg-white/85 w-[680px] min-h-[180px] mx-auto text-center pt-5 mt-6">
        <div className="enterprise-panel__content w-1/2 float-left px-5">
          <h2 className="enterprise-panel__header text-[#103701] text-xl font-semibold">
            <small className="enterprise-panel__subheader block text-[#103701] text-sm font-normal">
              GO BEYOND WITH NEVICO
            </small>
            Take full control of your business
          </h2>
        </div>

        <div className="enterprise-panel__footer2 w-1/2 float-right px-5 mt-5">
          <p className="enterprise-panel__footer__lead text-[#103701] mt-5 font-medium">
            Business in Motion
          </p>

  
          <div className="flex flex-wrap justify-between mt-4">
            <div className="icon-holder text-center text-[#103701]">
              <span className="mbri-growing-chart text-[20px]"></span>
              <div className="icon-name font-bold text-[10px] mt-2">Finance</div>
            </div>

            <div className="icon-holder text-center text-[#103701]">
              <span className="mbri-sale text-[20px]"></span>
              <div className="icon-name font-bold text-[10px] mt-2">Sales</div>
            </div>

            <div className="icon-holder text-center text-[#103701]">
              <span className="mbri-shopping-bag text-[20px]"></span>
              <div className="icon-name font-bold text-[10px] mt-2">Purchases</div>
            </div>

            <div className="icon-holder text-center text-[#103701]">
              <span className="mbri-extension text-[20px]"></span>
              <div className="icon-name font-bold text-[10px] mt-2">Inventory</div>
            </div>

            <div className="icon-holder text-center text-[#103701]">
              <span className="mbri-letter text-[20px]"></span>
              <div className="icon-name font-bold text-[10px] mt-2">Mail</div>
            </div>
          </div>
        </div>
      </div>


      <div className="main-panel-footer mt-6">
        <a
          data-toggle="modal"
          data-target="#forgotPassword"
          className="tooltips_clsshilight cursor-pointer text-[13px] font-bold"
        >
          Reset your password
        </a>
      </div>

    </div>
  </div>
*/
{
  /* <div>
                <div className="mb-2 block">
                  <Label htmlFor="username1" className="font-medium">
                    Username
                  </Label>
                </div>
                <Input
                  id="username1"
                  type="text"
                  placeholder="Enter your username"
                  required
                />

              </div> */
}
{
  /* <div className="flex flex-wrap gap-6 items-center justify-between my-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked />
                  <Label
                    className="text-link font-normal text-sm"
                    htmlFor="remember"
                  >
                    Remember this device
                  </Label>
                </div>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary hover:text-primaryemphasis"
                >
                  Forgot Password ?
                </Link>
              </div> */
}
{
  /* <Button className="w-full" asChild>
                <Link href="/">Sign In</Link>
              </Button> */
}
