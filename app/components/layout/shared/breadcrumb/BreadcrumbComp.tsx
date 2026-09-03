// app/components/layout/shared/breadcrumb/BreadcrumbComp.tsx
// app/components/layout/shared/breadcrumb/BreadcrumbComp.tsx

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import CardBox from "@/app/components/shared/CardBox";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <CardBox
      className="
        mb-4
        py-2
        px-3
        bg-[#103701]
        overflow-hidden
        rounded-md
        border
        border-[#1a4f03]
        shadow-none
        relative
      "
    >
      <nav
        aria-label="Breadcrumb"
        className="flex items-center text-xs text-slate-300"
      >
        {/* Home */}
        <Link
          href={`/${slug}/dashboard`}
          className="
            flex
            items-center
            gap-1
            px-2
            py-1
            rounded-md
            transition-all
            duration-150
            hover:bg-slate-800/60
            hover:text-white
          "
        >
          <Home className="h-3.5 w-3.5 text-slate-400" />
          Home
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="flex items-center">
              {/* Separator */}
              <ChevronRight className="h-3.5 w-3.5 mx-1 text-slate-500 shrink-0" />

              {/* Intermediate breadcrumb */}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="
                    flex
                    items-center
                    px-2
                    py-1
                    rounded-md
                    transition-all
                    duration-150
                    hover:bg-slate-800/60
                    hover:text-white
                  "
                >
                  {item.label}
                </Link>
              ) : (
                /* Current / Active breadcrumb */
                item.label && (
                  <span
                    className={
                      isLast
                        ? `
                          bg-slate-900/50
                          text-emerald-400
                          border
                          border-emerald-500/20
                          px-2.5
                          py-0.5
                          rounded-md
                          font-semibold
                        `
                        : "px-2 py-1"
                    }
                  >
                    {item.label}
                  </span>
                )
              )}
            </div>
          );
        })}
      </nav>
    </CardBox>
  );
}

/* "use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import CardBox from "@/app/components/shared/CardBox";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <CardBox
      className="
        mb-4
        py-2
        px-2
        bg-[#F2F7F3]
        overflow-hidden
        rounded-md
        border
        border-[#D8E7DC]
        shadow-none
        relative
      "
    >
      <nav
        aria-label="Breadcrumb"
        className="flex items-center text-xs text-[#6B7F75]"
      >

        <Link
          href={`/${slug}/dashboard`}
          className="
            flex
            items-center
            gap-1
            px-2
            py-0.5
            rounded
            transition-colors
            hover:bg-[#E2EFE5]
            hover:text-[#0B4A0A]
          "
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="flex items-center">
      
              <ChevronRight className="h-3 w-3 mx-0.5 text-[#A7B8AE]" />


              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="
                    flex
                    items-center
                    px-2
                    py-0.5
                    rounded
                    transition-colors
                    hover:bg-[#E2EFE5]
                    hover:text-[#0B4A0A]
                  "
                >
                  {item.label}
                </Link>
              ) : (

                item.label && (
                  <span
                    className={
                      isLast
                        ? `
                        bg-[#0B4A0A]
                        text-white
                        px-2.5
                        py-0.5
                        rounded
                        font-medium
                      `
                        : ""
                    }
                  >
                    {item.label}
                  </span>
                )
              )}
            </div>
          );
        })}
      </nav>
    </CardBox>
  );
} */

/* "use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import CardBox from "@/app/components/shared/CardBox";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  return (
    <CardBox className="mb-4 py-2 px-2 bg-lightsecondary overflow-hidden rounded-md border-none shadow-none relative">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center  text-xs text-slate-500"
      >
        <Link
          href= {`/${slug}/dashboard`} 
          className="flex items-center gap-1 px-2 py-0.5 transition-colors hover:bg-[#0b3310] hover:text-white hover:rounded "
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex items-center"
            >
              <ChevronRight className="h-3 w-3 text-slate-400" />

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center hover:bg-[#0b3310] hover:text-white hover:rounded transition-colors px-2 py-0.5"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "bg-[#0b3310] text-white px-2 py-0.5 rounded"
                      : ""
                  }
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </CardBox>
  );
} */
/* text-emerald-800 bg-emerald-50 */
/* 'use client'

import CardBox from '@/app/components/shared/CardBox'
import Image from 'next/image'
import Link from 'next/link'

interface BreadcrumbItem {
  title: string
  to?: string
}

interface BreadCrumbType {
  title: string
  items?: BreadcrumbItem[]
}

const BreadcrumbComp = ({ items = [], title }: BreadCrumbType) => {
  return (
    <CardBox className="mb-6 py-4 bg-lightsecondary overflow-hidden rounded-md border-none shadow-none relative">
      <div className="grid grid-cols-12 gap-6 items-center">
        <div className="col-span-10">
          <h4 className="font-semibold text-xl mb-3">{title}</h4>

          <ol className="flex items-center whitespace-nowrap" aria-label="Breadcrumb">
            {items.map((item, index) => {
              const isLast = index === items.length - 1

              return (
                <li key={index} className="flex items-center">
                  {item.to && !isLast ? (
                    <Link
                      href={item.to}
                      className="text-xs text-muted-foreground opacity-80 leading-none hover:underline"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span
                      className="text-xs text-muted-foreground leading-none"
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.title}
                    </span>
                  )}

                  {!isLast && (
                    <span className="mx-2.5 h-1 w-1 rounded-full bg-muted-foreground" />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="col-span-2 flex justify-center -mb-7 max-h-[120px] max-w-[140px]">
          <div className="hidden sm:block absolute right-7 bottom-0">
            <Image
              src="/images/dashboard/customer-support-img.png"
              alt="support-img"
              width={145}
              height={95}
            />
          </div>
        </div>
      </div>
    </CardBox>
  )
}

export default BreadcrumbComp */
