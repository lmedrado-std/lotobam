"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Sparkles,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/generate", label: "Gerar Apostas", icon: Sparkles },
  { href: "/results", label: "Resultados", icon: Award },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link
            href={item.href}
            className={cn(
              "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
            )}
            data-sidebar="menu-button"
            data-size="default"
            data-active={pathname.startsWith(item.href)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
