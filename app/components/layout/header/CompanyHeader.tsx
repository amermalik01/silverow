// app/components/layout/header/CompanyHeader.tsx

// app/components/layout/header/CompanyHeader.tsx

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
import Profile from "./Profile";
import Notifications from "./Notifications";
import SidebarLayout from "../sidebar/Sidebar";
import FullLogo from "../shared/logo/FullLogo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const CompanyHeader = () => {
  const { theme, setTheme } = useTheme();
  const [isSticky, setIsSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMode = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <header
        className={`sticky top-0 z-20 transition-all duration-200 ${
          isSticky 
            ? "bg-background/95 backdrop-blur shadow-sm border-b dark:border-slate-800 fixed w-full" 
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <nav className="h-[65px] px-6 flex justify-between items-center w-full">
          {/* Mobile Toggle Icon */}
          <div
            onClick={() => setIsOpen(true)}
            className="p-2 hover:text-primary text-foreground xl:hidden flex justify-center items-center cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon icon="tabler:menu-2" height={20} width={20} />
          </div>

          <div className="block xl:hidden">
            <FullLogo />
          </div>

          <div className="flex xl:hidden items-center gap-2">
            <button 
              onClick={toggleMode}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
            >
              <Icon icon={theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"} width="20" />
            </button>
            <Profile />
          </div>

          <div className="hidden xl:flex items-center justify-between w-full">
            <div className="flex items-center gap-2" />
            <div className="flex items-center gap-4">
              {/* Theme Switcher */}
              <button
                onClick={toggleMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              >
                <Icon icon={theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"} width="20" />
              </button>

              {/* Notification Trigger */}
              <Notifications />

              {/* User Profile Info Info */}
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <Profile />
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Sheet Draw Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-slate-950 border-r border-slate-800 text-white">
          <VisuallyHidden>
            <SheetTitle>sidebar</SheetTitle>
          </VisuallyHidden>
          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompanyHeader;

/* "use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
import Profile from "./Profile";
import Notifications from "./Notifications";
import SidebarLayout from "../sidebar/Sidebar";
import FullLogo from "../shared/logo/FullLogo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Search from "./Search";

const CompanyHeader = () => {
  const { theme, setTheme } = useTheme();
  const [isSticky, setIsSticky] = useState(false);
  const [mobileMenu, setMobileMenu] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleMode = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <header
        className={`sticky top-0 z-2 ${
          isSticky ? "bg-background shadow-md dark:shadow-white fixed w-full" : "bg-transparent"
        }`}
      >
        <nav
          className={`rounded-none  py-4 sm:ps-6 max-w-full! sm:pe-10 dark:bg-dark flex justify-between items-center px-6`}
        >
     
          <div
            onClick={() => {
              setIsOpen(true);
            }}
            className="px-[15px] hover:text-primary dark:hover:text-primary text-foreground dark:text-muted-foreground relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-lightprimary  after:bg-transparent rounded-full xl:hidden flex justify-center items-center cursor-pointer"
          >
            <Icon icon="tabler:menu-2" height={20} width={20} />
          </div>

          <div className="block xl:hidden">
            <FullLogo />
          </div>

          <div className="flex xl:hidden items-center">
            <div
              className="hover:text-primary px-2 md:px-15 group focus:ring-0 rounded-full flex justify-center items-center cursor-pointer relative"
              onClick={toggleMode}
            >
              <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                {theme === "light" ? (
                  <Icon icon="tabler:moon" width="20" className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary" />
                ) : (
                  <Icon
                    icon="solar:sun-bold-duotone"
                    width="20"
                    className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                  />
                )}
              </span>
            </div>

            <Profile />
          </div>

          <div className="hidden xl:flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
            </div>
            <div className="flex w-full justify-end items-end">
              <div className="flex gap-0 items-center ">
        
                <div
                  className="hover:text-primary px-15 group focus:ring-0 rounded-full flex justify-center items-center cursor-pointer text-gray relative"
                  onClick={toggleMode}
                >
                  <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                    {theme === "light" ? (
                      <Icon icon="tabler:moon" width="20" className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary" />
                    ) : (
                      <Icon
                        icon="solar:sun-bold-duotone"
                        width="20"
                        className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                      />
                    )}
                  </span>
                </div>

                <div className="xl:block ">
                  <div className="flex gap-0 items-center relative">
            
                    <Notifications />
                  </div>
                </div>

     
                <Profile />
              </div>
            </div>
          </div>
        </nav>
      </header>

 
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden>
            <SheetTitle>sidebar</SheetTitle>
          </VisuallyHidden>
          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompanyHeader; */
