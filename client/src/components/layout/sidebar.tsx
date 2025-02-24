import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  requiredRole?: string | string[];
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: "📊", requiredRole: "admin" },
  { label: "Đơn hàng", path: "/orders", icon: "📦", requiredRole: "admin" },
  { label: "Sản xuất", path: "/production", icon: "🏭" },
  { label: "Kho hàng", path: "/warehouse", icon: "🏪", requiredRole: "admin" },
  { label: "Người dùng", path: "/users", icon: "👥", requiredRole: "admin" },
  { label: "Quản lý máy", path: "/machines", icon: "⚙️", requiredRole: ["admin", "machine_manager"] },
  { label: "Theo dõi máy", path: "/machine-monitor", icon: "📊", requiredRole: ["machine_manager", "admin"] },
  { label: "Shopify", path: "/shopify", icon: "🔄", requiredRole: "admin" },
  { label: "Cài đặt", path: "/settings", icon: "⚙️", requiredRole: "admin" }
];

export function Sidebar() {
  const { currentPath, navigate, isMobile } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredRole) return true;
    if (Array.isArray(item.requiredRole)) {
      return item.requiredRole.includes(userRole!) || userRole === 'admin';
    }
    return userRole === item.requiredRole || userRole === 'admin';
  });

  // Mobile navigation bar at bottom
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {filteredMenuItems.slice(0, 5).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg text-sm",
                currentPath === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  // Desktop sidebar
  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform bg-background transition-transform duration-200 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:flex md:flex-col"
      )}>
        <div className="flex h-16 items-center justify-center border-b px-4">
          <h2 className="text-lg font-semibold">Quản lý sản xuất</h2>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                currentPath === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}