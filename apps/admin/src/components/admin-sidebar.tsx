"use client";

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
  LogOut,
  Shield,
  KeyRound,
  TestTube,
  Droplets,
  Scale,
  Globe,
  Activity,
  Gauge,
  Eye,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Contaminants",
    url: "/stats",
    icon: Droplets,
  },
  {
    title: "Thresholds",
    url: "/thresholds",
    icon: Scale,
  },
  {
    title: "Jurisdictions",
    url: "/jurisdictions",
    icon: Globe,
  },
  {
    title: "Location Stats",
    url: "/zip-codes",
    icon: MapPin,
  },
  {
    title: "Import Data",
    url: "/import",
    icon: Upload,
  },
  {
    title: "Hazard Reports",
    url: "/reports",
    icon: AlertTriangle,
  },
  {
    title: "Testing Guide",
    url: "/testing",
    icon: TestTube,
  },
];

const omMenuItems = [
  {
    title: "Properties",
    url: "/properties",
    icon: Activity,
  },
  {
    title: "Property Thresholds",
    url: "/property-thresholds",
    icon: Gauge,
  },
  {
    title: "Observations",
    url: "/observations",
    icon: Eye,
  },
];

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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Observations & Measurements</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {omMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
