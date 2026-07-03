import { useLocation } from 'wouter';
import { useCallback } from 'react';

export function useNavigation() {
  const [location, setLocation] = useLocation();

  const navigate = useCallback(
    (to: string) => {
      setLocation(to);
    },
    [setLocation]
  );

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return { location, navigate, goBack };
}
