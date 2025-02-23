import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function Header() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setLocation('/login');
      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã đăng xuất khỏi hệ thống"
      });
    } catch (error: any) {
      toast({
        title: "Lỗi đăng xuất",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background flex items-center px-6 justify-between">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuItem disabled>
              {auth.currentUser?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}