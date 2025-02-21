import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useNavigation } from "@/hooks/use-navigation";
import { useState } from "react";

const menuItems = [
  { label: "Dashboard", path: "/", icon: "📊" },
  { label: "Orders", path: "/orders", icon: "📦" },
  { label: "Production", path: "/production", icon: "🏭" },
  { label: "Warehouse", path: "/warehouse", icon: "🏪" },
  { label: "Settings", path: "/settings", icon: "⚙️", requiredRole: "admin" },
];

export function Sidebar() {
  const { currentPath, navigate } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

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
          <h2 className="text-lg font-semibold">Management System</h2>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {menuItems.map((item) => (
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