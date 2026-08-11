// components/ui/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
  const handleLogout = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    await signOut({
      callbackUrl: `${baseUrl}/login`,
      redirect: true,
    });
  };

  return (
    <Button
      variant="outline"
      // className="w-full rounded-md"
      className="
        w-full
        h-12
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
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};
