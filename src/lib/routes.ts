import {
  IconDashboard,
  IconDatabase,
  IconUsers,
  IconListDetails,
  IconInnerShadowTop,
  IconHistory,
  IconCreditCard,
  type Icon
} from "@tabler/icons-react"

export type Role = 'admin' | 'cashier' | 'customer';

export interface Route {
  title: string;
  url: string;
  icon?: Icon;
  roles: Role[];
}

export const ROUTES: Route[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    roles: ["admin", "cashier"],
  },
  {
    title: "Members",
    url: "/dashboard/members",
    icon: IconUsers,
    roles: ["admin", "cashier"],
  },
  {
    title: "Check-ins",
    url: "/dashboard/checkins",
    icon: IconCreditCard,
    roles: ["admin", "cashier"],
  },
  {
    title: "Rewards",
    url: "/dashboard/rewards",
    icon: IconDatabase,
    roles: ["admin"],
  },
  {
    title: "Redemptions",
    url: "/dashboard/redemptions",
    icon: IconInnerShadowTop,
    roles: ["cashier", "admin"],
  },
  {
    title: "Staff Management",
    url: "/dashboard/staff",
    icon: IconUsers,
    roles: ["admin"],
  },
  {
    title: "Audit Logs",
    url: "/dashboard/audit",
    icon: IconHistory,
    roles: ["admin"],
  },
]

export const isAuthorized = (role: Role, path: string): boolean => {
  const publicPaths = ['/login', '/admin/login', '/'];
  if (publicPaths.includes(path)) return true;
  if (role === 'customer' && path.startsWith('/dashboard')) return false;
  if (role !== 'customer' && path.startsWith('/customer')) return false;
  const route = [...ROUTES].reverse().find(r => path === r.url || path.startsWith(r.url + '/'));
  if (!route) return true;
  return route.roles.includes(role);
};
