
import { useLocation, useNavigate } from "react-router-dom";

export function useNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  return {
    current: location.pathname,
    navigate: navigate,
    isActive: (path: string) => location.pathname === path
  };
}
