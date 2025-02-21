import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';

interface NavigationContextType {
  navigate: (path: string) => void;
  currentPath: string;
  isMobile: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const isMobile = window.innerWidth < 768;

  const navigate = (path: string) => {
    // Prevent unnecessary page reloads
    if (location !== path) {
      setLocation(path);
    }
  };

  return (
    <NavigationContext.Provider value={{ navigate, currentPath: location, isMobile }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}