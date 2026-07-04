import React, {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import { RestaurantProfile, loadProfile, saveProfile } from '@/store/restaurant';

interface RestaurantContextValue {
  profile: RestaurantProfile | null;
  isReady: boolean;
  save: (p: RestaurantProfile) => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<RestaurantProfile | null>(() => loadProfile());
  const [isReady] = useState(true);

  const save = useCallback((p: RestaurantProfile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  return (
    <RestaurantContext.Provider value={{ profile, isReady, save }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider');
  return ctx;
}
