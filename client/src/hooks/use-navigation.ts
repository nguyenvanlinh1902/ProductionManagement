
import { useLocation } from 'wouter';

export function useNavigation() {
  const [location, setLocation] = useLocation();
  
  return {
    current: location,
    navigate: setLocation,
    isActive: (path: string) => location === path
  };
}
