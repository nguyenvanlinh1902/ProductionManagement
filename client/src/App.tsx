import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { auth, getUserRole, createAdminAccount, testFirestoreConnection } from "@/lib/firebase";
import { useEffect, useState, Suspense } from "react";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { useToast } from "@/hooks/use-toast";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Production from "@/pages/production";
import Warehouse from "@/pages/warehouse";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Scan from "@/pages/scan";
import Shopify from "@/pages/shopify";
import Machines from "@/pages/machines"; // Add import
import MachineGroupView from "@/pages/machine-group"; // Added import


// Layout components
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Test Firebase connection
        await testFirestoreConnection();

        // Create custom admin account
        try {
          await createAdminAccount("linhnv@gmail.com", "admin123");
          toast({
            title: "Tạo tài khoản admin thành công",
            description: "Email: linhnv@gmail.com, Mật khẩu: admin123",
          });
        } catch (error: any) {
          console.error("Error creating custom admin:", error);
          if (error.message.includes('email-already-in-use')) {
            toast({
              title: "Thông báo",
              description: "Tài khoản admin đã tồn tại.",
            });
          } else {
            toast({
              title: "Lỗi tạo tài khoản",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      } catch (error: any) {
        console.error("Firebase initialization error:", error);
        toast({
          title: "Lỗi kết nối",
          description: "Không thể kết nối với hệ thống. Vui lòng thử lại sau.",
          variant: "destructive"
        });
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const role = await getUserRole(user.uid);
        setUserRole(role);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!auth.currentUser || (requiredRole && userRole !== requiredRole)) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      </Route>
      <Route path="/dashboard">
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      </Route>
      <Route path="/orders">
        <PrivateRoute requiredRole="admin">
          <Orders />
        </PrivateRoute>
      </Route>
      <Route path="/production">
        <PrivateRoute>
          <Production />
        </PrivateRoute>
      </Route>
      <Route path="/scan">
        <PrivateRoute requiredRole="worker">
          <Scan />
        </PrivateRoute>
      </Route>
      <Route path="/warehouse">
        <PrivateRoute requiredRole="admin">
          <Warehouse />
        </PrivateRoute>
      </Route>
      <Route path="/users">
        <PrivateRoute requiredRole="admin">
          <Users />
        </PrivateRoute>
      </Route>
      <Route path="/shopify">
        <PrivateRoute requiredRole="admin">
          <Shopify />
        </PrivateRoute>
      </Route>
      <Route path="/machines">
        <PrivateRoute requiredRole="admin">
          <Machines />
        </PrivateRoute>
      </Route>
      <Route path="/machine-group"> {/* Added route */}
        <PrivateRoute>
          <MachineGroupView />
        </PrivateRoute>
      </Route> {/* Added route */}
      <Route path="/settings">
        <PrivateRoute requiredRole="admin">
          <Settings />
        </PrivateRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>
        <Router />
        <Toaster />
      </NavigationProvider>
    </QueryClientProvider>
  );
}

export default App;