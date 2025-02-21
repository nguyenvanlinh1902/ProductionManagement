import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Production from "@/pages/production";
import Warehouse from "@/pages/warehouse";
import NotFound from "@/pages/not-found";

// Layout components
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user && location !== "/login") {
        setLocation("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [location, setLocation]);

  if (loading) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      </Route>
      <Route path="/orders">
        <PrivateRoute>
          <Orders />
        </PrivateRoute>
      </Route>
      <Route path="/production">
        <PrivateRoute>
          <Production />
        </PrivateRoute>
      </Route>
      <Route path="/warehouse">
        <PrivateRoute>
          <Warehouse />
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
