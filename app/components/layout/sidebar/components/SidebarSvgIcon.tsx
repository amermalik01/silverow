// app/components/layout/sidebar/components/SidebarSvgIcon.tsx

"use client";

import Image from "next/image";

interface SidebarSvgIconProps {
  src?: string;
  alt?: string;
  size?: number;
  collapsed?: boolean;
  className?: string;
}

export default function SidebarSvgIcon({
  src,
  alt = "",
  size = 20,
  collapsed = false,
  className = "",
}: SidebarSvgIconProps) {
  if (!src) return null;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`object-contain transition-opacity duration-200 ${
          collapsed ? "opacity-100" : "opacity-90"
        }`}
        unoptimized
      />
    </span>
  );
}
