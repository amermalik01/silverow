// app/components/layout/sidebar/company_sidebaritems.ts
import { uniqueId } from 'lodash'

export interface ChildItem {
  id?: number | string
  name?: string
  icon?: string
  children?: ChildItem[]
  item?: unknown
  url?: string
  color?: string
  disabled?: boolean
  subtitle?: string
  badge?: boolean
  badgeType?: string
  isPro?: boolean
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: string
  id?: number | string
  to?: string
  items?: MenuItem[]
  children?: ChildItem[]
  url?: string
  disabled?: boolean
  subtitle?: string
  badgeType?: string
  badge?: boolean
  isPro?: boolean
}

const CompanySidebarContent: MenuItem[] = [
  // ==================== NON-PRO SECTIONS ====================
  {
    heading: 'Home',
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-2-linear',
        id: uniqueId(),
        url: '/',
        isPro: false,
      },

      {
        name: 'Finance',
        id: uniqueId(),
        icon: 'solar:shield-keyhole-minimalistic-linear',
        children: [
          {
            id: uniqueId(),
            name: 'Chart of Accounts',
            url: 'https://react.tailwind-admin.com/auth/auth1/two-steps',
            isPro: true,
          },
          {
            id: uniqueId(),
            name: 'General Journal',
            url: 'https://react.tailwind-admin.com/auth/auth2/two-steps',
            isPro: true,
          },
          {
            id: uniqueId(),
            name: 'Posted General Journal',
            url: 'https://react.tailwind-admin.com/auth/auth2/two-steps',
            isPro: true,
          },
          {
            id: uniqueId(),
            name: 'Finance Matrix',
            url: 'https://react.tailwind-admin.com/auth/auth2/two-steps',
            isPro: true,
          },
        ],
      },

    ],
  },

  /* {
    heading: 'Finance',
    children: [
      
      {
        name: 'Two Steps',
        id: uniqueId(),
        icon: 'solar:shield-keyhole-minimalistic-linear',
        children: [
          {
            id: uniqueId(),
            name: 'Side Two Steps',
            url: 'https://react.tailwind-admin.com/auth/auth1/two-steps',
            isPro: true,
          },
          {
            id: uniqueId(),
            name: 'Boxed Two Steps',
            url: 'https://react.tailwind-admin.com/auth/auth2/two-steps',
            isPro: true,
          },
        ],
      },
      {
        id: uniqueId(),
        name: 'Sales',
        icon: 'solar:settings-linear',
        url: 'settings',
        isPro: true,
      },
    ],
  }, */


  {
    heading: 'Settings',
    children: [
      
      {
        name: 'Two Steps',
        id: uniqueId(),
        icon: 'solar:shield-keyhole-minimalistic-linear',
        children: [
          {
            id: uniqueId(),
            name: 'Side Two Steps',
            url: 'https://react.tailwind-admin.com/auth/auth1/two-steps',
            isPro: true,
          },
          {
            id: uniqueId(),
            name: 'Boxed Two Steps',
            url: 'https://react.tailwind-admin.com/auth/auth2/two-steps',
            isPro: true,
          },
        ],
      },
      {
        id: uniqueId(),
        name: 'Sales',
        icon: 'solar:settings-linear',
        url: 'settings',
        isPro: true,
      },
    ],
  },

]

export default CompanySidebarContent
