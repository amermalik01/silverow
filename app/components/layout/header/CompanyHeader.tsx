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
        className={`sticky top-0 z-40 border-b transition-all ${
          isSticky
            ? "bg-background/95 backdrop-blur shadow-sm"
            : "bg-[#103701] dark:bg-[#262F3C] text-white"
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
              <Icon
                icon={
                  theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                }
                width="20"
              />
            </button>
            <Profile />
          </div>

          <div className="hidden xl:flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <FullLogo />
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Switcher */}
              <button
                onClick={toggleMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800  transition"
              >
                {/* text-slate-600 dark:text-slate-400 */}
                <Icon
                  icon={
                    theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"
                  }
                  width="20"
                />
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
        <SheetContent
          side="left"
          className="w-64 p-0 bg-slate-950 border-r border-slate-800 text-white"
        >
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

/* 
return (
    <>
      <header
        className={`sticky top-0 z-20 transition-all duration-200 ${
          isSticky 
            ? "bg-background/95 backdrop-blur shadow-sm border-b dark:border-slate-800 fixed w-full" 
            : "bg-[#103701] dark:bg-[#262F3C] text-white border-b border-transparent"
        }`}
      >
        <nav className="h-[65px] px-6 flex justify-between items-center w-full">

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
 
              <button
                onClick={toggleMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800  transition"
              >
                <Icon icon={theme === "light" ? "tabler:moon" : "solar:sun-bold-duotone"} width="20" />
              </button>

     
              <Notifications />

      
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <Profile />
            </div>
          </div>
        </nav>
      </header>


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
*/
