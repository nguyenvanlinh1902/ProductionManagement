import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  Package,
  Settings,
  Users,
  QrCode,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/firebase";
import { useNavigation } from "@/contexts/NavigationContext";
import { useState } from "react";

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
  { icon: QrCode, label: "Quét QR", href: "/scan", requiredRole: "worker" },
  { icon: Package, label: "Kho vận", href: "/warehouse", requiredRole: "admin" },
  { icon: Users, label: "Người dùng", href: "/users", requiredRole: "admin" },
  { icon: Settings, label: "Cài đặt", href: "/settings", requiredRole: "admin" },
];

interface SidebarProps {
  userRole?: string | null;
}

export function Sidebar({ userRole }: SidebarProps) {
  const { currentPath, navigate } = useNavigation();
  const [isOpen, setIsOpen] = useState(true);

  const filteredMenuItems = menuItems.filter(
    item => !item.requiredRole || item.requiredRole === userRole
  );

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed right-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>
      <nav
        className={cn(
          "fixed right-0 top-0 z-40 flex h-screen flex-col gap-4 border-l bg-card p-4 transition-transform duration-200",
          isOpen ? "translate-x-0" : "translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-foreground">Quản lý Sản xuất</h1>
        </div>
        <div className="flex-1 px-4">
          {filteredMenuItems.map((item) => (
            <div
              key={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent mt-1 cursor-pointer",
                currentPath === item.href && "bg-primary text-primary-foreground font-medium shadow-md"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
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
      </nav>
    </>
  );
}