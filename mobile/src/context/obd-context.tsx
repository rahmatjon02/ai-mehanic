import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { ObdReading } from '../types';

interface ObdContextValue {
  useObdData: boolean;
  latestReading: ObdReading | null;
  setUseObdData: (value: boolean) => void;
  saveReading: (reading: ObdReading) => void;
}

const ObdContext = createContext<ObdContextValue | undefined>(undefined);

export function ObdProvider({ children }: PropsWithChildren) {
  const [useObdData, setUseObdData] = useState(false);
  const [latestReading, setLatestReading] = useState<ObdReading | null>(null);

  const value = useMemo(
    () => ({
      useObdData,
      latestReading,
      setUseObdData,
      saveReading: (reading: ObdReading) => setLatestReading(reading),
    }),
    [latestReading, useObdData],
  );

  return <ObdContext.Provider value={value}>{children}</ObdContext.Provider>;
}

export function useObd() {
  const context = useContext(ObdContext);

  if (!context) {
    throw new Error('useObd must be used inside ObdProvider');
  }

  return context;
}
