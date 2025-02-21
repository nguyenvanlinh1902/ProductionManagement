import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';

interface NavigationContextType {
  navigate: (path: string) => void;
  currentPath: string;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const navigate = (path: string) => {
    setLocation(path);
  };

  return (
    <NavigationContext.Provider value={{ navigate, currentPath: location }}>
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
