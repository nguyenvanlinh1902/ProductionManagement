import { useLocation } from "wouter";
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

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  requiredRole?: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Tổng quan", href: "/dashboard" },
  { icon: ClipboardList, label: "Đơn hàng", href: "/orders", requiredRole: "admin" },
  { icon: Factory, label: "Sản xuất", href: "/production" },
  { icon: Package, label: "Kho vận", href: "/warehouse", requiredRole: "admin" },
  { icon: Settings, label: "Cài đặt", href: "/settings", requiredRole: "admin" },
];

interface SidebarProps {
  userRole?: string | null;
}

export function Sidebar({ userRole }: SidebarProps) {
  const [location] = useLocation();

  const filteredMenuItems = menuItems.filter(
    item => !item.requiredRole || item.requiredRole === userRole
  );

  return (
    <div className="h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">Quản lý Sản xuất</h1>
      </div>
      <nav className="flex-1 px-4">
        {filteredMenuItems.map((item) => (
          <div
            key={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent mt-1 cursor-pointer",
              location === item.href && "bg-sidebar-accent"
            )}
            onClick={() => window.location.href = item.href}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </div>
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