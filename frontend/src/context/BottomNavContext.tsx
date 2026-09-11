import React, { createContext, useContext, useState } from 'react';

interface BottomNavContextValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const BottomNavContext = createContext<BottomNavContextValue | null>(null);

export const BottomNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidden, setHidden] = useState(false);
  return (
    <BottomNavContext.Provider value={{ hidden, setHidden }}>{children}</BottomNavContext.Provider>
  );
};

export function useBottomNavVisibility() {
  const ctx = useContext(BottomNavContext);
  if (!ctx) throw new Error('useBottomNavVisibility must be used within BottomNavProvider');
  return ctx;
}

/** Hides the global mobile BottomNav for as long as the calling component is mounted. */
export function useHideBottomNav(active: boolean) {
  const { setHidden } = useBottomNavVisibility();
  React.useEffect(() => {
    if (!active) return;
    setHidden(true);
    return () => setHidden(false);
  }, [active, setHidden]);
}
