"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import {
  LayoutDashboard,
  MapPin,
  Upload,
  AlertTriangle,
  Megaphone,
  LogOut,
  Shield,
  KeyRound,
  BookOpen,
  Droplets,
  Scale,
  Globe,
  FolderTree,
  Layers,
  Activity,
  Gauge,
  Eye,
  Factory,
  Settings,
  BarChart3,
  Mail,
  FileText,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  orphan?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
};

/** Sidebar groupings:
 *  - Operations: data the mobile app surfaces directly to end users.
 *  - Reference: schema-adjacent lookup data, mostly seeded from Risks.xlsx.
 *  - Content: marketing surfaces (landing page, subscribers).
 *  - System: admin meta tools.
 *  - Orphaned: pages whose mobile consumer was removed in #309 and whose
 *    fate is pending on EPI-25 / EPI-44 / EPI-45 / EPI-48. Kept visible
 *    (collapsible, default-open) so the gap stays on the radar. */
const menuGroups: MenuGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Measurements", url: "/measurements", icon: MapPin },
      { title: "Import Data", url: "/import", icon: Upload },
      { title: "Hazard Reports", url: "/hazard-reports", icon: AlertTriangle },
      { title: "Warning Banners", url: "/banners", icon: Megaphone },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "Contaminants", url: "/contaminants", icon: Droplets },
      { title: "Thresholds", url: "/thresholds", icon: Scale },
      { title: "Threshold Coverage", url: "/threshold-coverage", icon: Gauge },
      { title: "Categories", url: "/categories", icon: FolderTree },
      { title: "Sub-Categories", url: "/subcategories", icon: Layers },
      { title: "Jurisdictions", url: "/jurisdictions", icon: Globe },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Landing Page", url: "/landing-page", icon: FileText },
      { title: "Subscribers", url: "/subscribers", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Guide", url: "/guide", icon: BookOpen },
    ],
  },
  {
    label: "Orphaned — pending mobile surface",
    collapsible: true,
    defaultOpen: true,
    items: [
      { title: "Pollution Sources", url: "/pollution-sources", icon: Factory, orphan: true },
      { title: "Properties", url: "/properties", icon: Activity, orphan: true },
      { title: "Property Thresholds", url: "/property-thresholds", icon: Gauge, orphan: true },
      { title: "Observations", url: "/observations", icon: Eye, orphan: true },
    ],
  },
];

function MenuGroupBlock({
  group,
  pathname,
}: {
  group: MenuGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);
  const isCollapsible = group.collapsible ?? false;
  const expanded = isCollapsible ? open : true;

  return (
    <SidebarGroup>
      {isCollapsible ? (
        <SidebarGroupLabel
          asChild
          className="cursor-pointer select-none hover:text-foreground"
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-between"
          >
            <span>{group.label}</span>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      )}
      {expanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.orphan && (
                      <span
                        title="No mobile consumer — see EPI-25"
                        className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      >
                        Orphan
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">MapYourHealth</span>
        </div>
        <p className="text-xs text-muted-foreground">Admin Portal</p>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <MenuGroupBlock key={group.label} group={group} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {user?.email || user?.username}
          </p>
          <ChangePasswordDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
