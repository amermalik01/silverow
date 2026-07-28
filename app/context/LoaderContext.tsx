// app/context/LoaderContext.tsx

"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

type LoaderContextType = {
  loading: boolean;
  message: string;
  show: (msg?: string) => void;
  hide: () => void;
};

const LoaderContext = createContext<LoaderContextType | null>(null);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const show = useCallback((msg = "") => {
    setMessage(msg);
    setLoading(true);
  }, []);

  const hide = useCallback(() => {
    setLoading(false);
    setMessage("");
  }, []);

  const value = useMemo(
    () => ({
      loading,
      message,
      show,
      hide,
    }),
    [loading, message, show, hide],
  );

  return (
    <LoaderContext.Provider value={value}>{children}</LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);

  if (!context) {
    throw new Error("useLoader must be used inside LoaderProvider");
  }

  return context;
}
