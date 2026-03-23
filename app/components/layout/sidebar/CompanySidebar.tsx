// app/components/layout/sidebar/CompanySidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import FullLogo from "../shared/logo/FullLogo";
import { getCompanySidebarItems } from "./company_sidebaritems";

interface SidebarItemType {
  heading?: string;
  id?: number | string;
  name?: string;
  title?: string;
  icon?: string;
  url?: string;
  children?: SidebarItemType[];
}

/**
 * ✅ Check if item OR any child is active
 */
const isItemActive = (item: SidebarItemType, currentPath: string): boolean => {
  if (item.url && currentPath.startsWith(item.url)) return true;

  if (item.children) {
    return item.children.some((child) => isItemActive(child, currentPath));
  }

  return false;
};

/**
 * ✅ Get all parent IDs that should be open based on route
 */
const getActiveParentIds = (
  items: SidebarItemType[],
  currentPath: string,
): (string | number)[] => {
  let result: (string | number)[] = [];

  for (const item of items) {
    if (item.children) {
      const active = isItemActive(item, currentPath);

      if (active && item.id) {
        result.push(item.id);
      }

      result = [...result, ...getActiveParentIds(item.children, currentPath)];
    }
  }

  return result;
};

const CompanySidebarLayout = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  /**
   * ✅ Controlled user toggles
   */
  const [manualOpenMenus, setManualOpenMenus] = useState<(string | number)[]>(
    [],
  );

  const slug = session?.user?.company_slug;

  const menuItems = slug ? getCompanySidebarItems(slug) : [];

  /**
   * ✅ Auto-open menus from route (NO useEffect)
   */
  const autoOpenMenus = slug
    ? getActiveParentIds(
        menuItems.flatMap((section) => section.children || []),
        pathname,
      )
    : [];

  /**
   * ✅ Merge auto + manual
   */
  const openMenus = Array.from(new Set([...autoOpenMenus, ...manualOpenMenus]));

  /**
   * 🔥 Toggle handler
   */
  const toggleMenu = (id: string | number) => {
    setManualOpenMenus((prev) => {
      const exists = prev.includes(id);

      if (exists) {
        return prev.filter((i) => i !== id);
      }

      return [...prev, id];
    });
  };

  /**
   * 🔁 Recursive renderer
   */
  const renderItems = (
    items: SidebarItemType[],
    level = 0,
  ): React.ReactNode => {
    return items.map((item) => {
      const isActive = isItemActive(item, pathname);
      const isOpen = openMenus.includes(item.id!);
      const isSelected = item.url && pathname.startsWith(item.url);

      const hasChildren = item.children?.length;

      // Heading
      if (item.heading) {
        return (
          <div
            key={item.heading}
            className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2"
          >
            {item.heading}
          </div>
        );
      }

      return (
        <div key={item.id}>
          {/* Item */}
          <div
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu(item.id!);
              }
            }}
            className={`flex items-center justify-between cursor-pointer px-3 py-2 rounded-md transition-all
              ${isSelected ? "text-primary font-semibold" : "text-gray-600"}
              ${isActive ? "bg-gray-100 dark:bg-gray-800" : ""}
              hover:bg-gray-100 dark:hover:bg-gray-800`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon icon={item.icon || "ri:circle-line"} width={18} />

              {item.url ? (
                <Link href={item.url} className="flex-1">
                  {item.title || item.name}
                </Link>
              ) : (
                <span className="flex-1">{item.title || item.name}</span>
              )}
            </div>

            {/* Arrow */}
            {hasChildren && (
              <Icon
                icon="mdi:chevron-down"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </div>

          {/* Children */}
          {hasChildren && isOpen && (
            <div className="mt-1">{renderItems(item.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  /**
   * ✅ Safe return AFTER hooks
   */
  if (!slug) {
    return (
      <div className="w-[270px] h-screen flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-[270px] border-r bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="px-6 py-4 border-b">
        <FullLogo />
      </div>

      {/* Menu */}
      <SimpleBar className="h-[calc(100vh-80px)] px-3">
        {menuItems.map((section, index) => (
          <div key={index}>
            {renderItems([
              ...(section.heading ? [{ heading: section.heading }] : []),
              ...(section.children || []),
            ])}
          </div>
        ))}
      </SimpleBar>
    </div>
  );
};

export default CompanySidebarLayout;

/* 



// import {
//   AMLogo,
//   AMMenu,
//   AMMenuItem,
//   AMSidebar,
//   AMSubmenu,
// } from "tailwind-sidebar";
// import "tailwind-sidebar/styles.css";

const renderSidebarItems = (
  items: SidebarItemType[],
  currentPath: string,
  onClose?: () => void,
  isSubItem: boolean = false
) => {
  return items.map((item, index) => {
    const isSelected = currentPath === item?.url
    const IconComp = item.icon || null

    const iconElement = IconComp ? (
      <Icon icon={IconComp} height={21} width={21} />
    ) : (
      <Icon icon={'ri:checkbox-blank-circle-line'} height={9} width={9} />
    )

    // Heading
    if (item.heading) {
      return (
        <div className='mb-1' key={item.heading}>
          <AMMenu
            subHeading={item.heading}
            ClassName='hide-menu leading-21 text-sidebar-foreground dark:text-sidebar-foreground font-bold uppercase text-xs'
          />
        </div>
      )
    }

    // Submenu
    if (item.children?.length) {
      return (
        <AMSubmenu
          key={item.id}
          icon={iconElement}
          title={item.name}
          ClassName='mt-0.5 text-sidebar-foreground dark:text-sidebar-foreground'>
          {renderSidebarItems(item.children, currentPath, onClose, true)}
        </AMSubmenu>
      )
    }

    // Regular menu item
    const linkTarget = item.url?.startsWith('https') ? '_blank' : '_self'

    const itemClassNames = isSubItem
      ? `mt-0.5 text-sidebar-foreground dark:text-sidebar-foreground !hover:bg-transparent ${
          isSelected ? '!bg-transparent !text-primary' : ''
        } !px-1.5`
      : `mt-0.5 text-sidebar-foreground dark:text-sidebar-foreground`

    return (
      <div onClick={onClose} key={index}>
        <AMMenuItem
          key={item.id}
          icon={iconElement}
          isSelected={isSelected}
          link={item.url || undefined}
          target={linkTarget}
          badge={!!item.isPro}
          badgeColor='bg-lightsecondary'
          badgeTextColor='text-secondary'
          disabled={item.disabled}
          badgeContent={item.isPro ? 'Pro' : undefined}
          component={Link}
          className={`${itemClassNames}`}>
          <span className='truncate flex-1'>{item.title || item.name}</span>
        </AMMenuItem>
      </div>
    )
  })
} 
  
const CompanySidebarLayout = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname()
  const { theme } = useTheme()

  // Only allow "light" or "dark" for AMSidebar
  const sidebarMode = theme === 'light' || theme === 'dark' ? theme : undefined;

  const { data: session } = useSession();

  const slug = session?.user?.company_slug;

  if (!slug) return null;

  const menuItems = getCompanySidebarItems(slug);


  return (
    <AMSidebar
      collapsible='none'
      animation={true}
      showProfile={false}
      width={'270px'}
      showTrigger={false}
      mode={sidebarMode}
      className='fixed left-0 top-0 border border-border bg-sidebar dark:bg-sidebar z-10 h-screen'>

      <div className='px-6 flex items-center brand-logo overflow-hidden'>
        <AMLogo component={Link} href='/' img=''>
          <FullLogo />
        </AMLogo>
      </div>

      <SimpleBar className='h-[calc(100vh-100px)]'>
        <div className='px-6'>
          {menuItems.map((section, index) => (
            <div key={index}>
              {renderSidebarItems(
                [
                  ...(section.heading ? [{ heading: section.heading }] : []),
                  ...(section.children || []),
                ],
                pathname,
                onClose
              )}
            </div>
          ))}

        </div>
      </SimpleBar>
    </AMSidebar>
  )
}

export default CompanySidebarLayout
*/
