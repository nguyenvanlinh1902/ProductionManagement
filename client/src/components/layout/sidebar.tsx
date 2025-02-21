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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/firebase";
import { useNavigation } from "@/contexts/NavigationContext";

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

  const filteredMenuItems = menuItems.filter(
    item => !item.requiredRole || item.requiredRole === userRole
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-64 bg-sidebar border-r border-border flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-foreground">Quản lý Sản xuất</h1>
        </div>
        <nav className="flex-1 px-4">
          {filteredMenuItems.map((item) => (
            <div
              key={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent mt-1 cursor-pointer",
                currentPath === item.href && "bg-sidebar-accent"
              )}
              onClick={() => navigate(item.href)}
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

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <nav className="flex justify-around py-2">
          {filteredMenuItems.map((item) => (
            <button
              key={item.href}
              className={cn(
                "flex flex-col items-center p-2 rounded-md",
                currentPath === item.href && "text-primary"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}