// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { LoaderProvider } from "./context/LoaderContext";
import GlobalLoader from "@/components/ui/GlobalLoader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LoaderProvider>
        <GlobalLoader />
        {children}
      </LoaderProvider>
    </SessionProvider>
  );
}
