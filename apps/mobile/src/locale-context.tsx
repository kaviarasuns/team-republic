import type { Locale } from "@team-republic/client";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const deviceLanguage = getLocales()[0]?.languageCode;
const initialLocale: Locale = deviceLanguage === "ta" ? "ta" : "en";

type LocaleContextValue = {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const LocaleProvider = ({ children }: { readonly children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const toggleLocale = useCallback(() => {
    setLocale((current) => (current === "en" ? "ta" : "en"));
  }, []);

  const value = useMemo(() => ({ locale, setLocale, toggleLocale }), [locale, toggleLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = (): LocaleContextValue => {
  const value = useContext(LocaleContext);
  if (value === null) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return value;
};
