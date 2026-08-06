// components/ui/GlobalLoader.tsx

"use client";

import Image from "next/image";
import { useLoader } from "@/app/context/LoaderContext";

export default function GlobalLoader() {
  const { loading, message } = useLoader();

  if (!loading) return null;

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-4">
          <Image
            // src="/images/logos/silverow-logo.png"
            src="/images/logos/nevico-logo.png"
            alt="Loading"
            width={204}
            height={36}
            className="loader-logo"
            priority
          />

          {message && (
            <p className="text-white text-sm font-medium">{message}</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .loader-logo {
          animation: pulse 1.8s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.45;
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
}

/* export default function GlobalLoader() {
  const { loading, message } = useLoader();

  if (!loading) return null;

  return (
    // <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[1px] transition-all duration-300 ${loading ? "opacity-100 visible" : "opacity-0 invisible"}`}
    >
      <div className="flex flex-col items-center gap-4">

        <Image
          src="/images/logos/silverow-logo.png"
          alt="Loading"
          width={204}
          height={36}
          className="animate-slow-spin"
        />

        {message && <p className="text-white text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
} */
