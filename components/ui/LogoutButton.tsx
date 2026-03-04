// components/ui/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
    
  const handleLogout = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    await signOut({ 
      callbackUrl: `${baseUrl}/login`, 
      redirect: true 
    });
  };

  return (
    <Button 
      variant="outline" 
      className="w-full rounded-md"
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};