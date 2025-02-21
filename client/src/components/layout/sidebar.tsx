import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  Package,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/firebase";

const menuItems = [
  { icon: LayoutDashboard, label: "Tổng quan", href: "/dashboard" },
  { icon: ClipboardList, label: "Đơn hàng", href: "/orders" },
  { icon: Factory, label: "Sản xuất", href: "/production" },
  { icon: Package, label: "Kho vận", href: "/warehouse" },
  { icon: Settings, label: "Cài đặt", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">Quản lý Sản xuất</h1>
      </div>
      <nav className="flex-1 px-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent mt-1",
                location === item.href && "bg-sidebar-accent"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}