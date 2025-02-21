import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { auth, getUserRole, createAdminAccount } from "@/lib/firebase";
import { useEffect, useState, Suspense } from "react";

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

// Layout components
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

function LoadingSpinner() {
  return <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>;
}

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await createAdminAccount();
      } catch (error) {
        console.error("Error creating admin account:", error);
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const role = await getUserRole(user.uid);
        setUserRole(role);
        if (requiredRole && role !== requiredRole) {
          setLocation("/dashboard");
        }
      } else if (location !== "/login") {
        setLocation("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [location, setLocation, requiredRole]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!auth.currentUser || (requiredRole && userRole !== requiredRole)) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
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
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;