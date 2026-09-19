import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type Preferences = {
  theme: ThemePreference;
  density: "compact" | "comfortable";
  emailNotifications: boolean;
};
type ThemeSnapshot = {
  preferences: Preferences;
  preferenceTheme: ThemePreference;
  effectiveTheme: "light" | "dark";
  persistenceError: string | null;
};
type ThemeRuntime = {
  getSnapshot(): ThemeSnapshot;
  subscribe(listener: () => void): () => void;
  updatePreferences(patch: Partial<Preferences>): boolean;
  setPreference(theme: ThemePreference): boolean;
};
declare global {
  interface Window { rtTheme: ThemeRuntime }
}

const ThemeContext = createContext<(ThemeSnapshot & Pick<ThemeRuntime, "setPreference" | "updatePreferences">) | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const runtime = window.rtTheme;
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  return <ThemeContext.Provider value={{ ...state, setPreference: runtime.setPreference, updatePreferences: runtime.updatePreferences }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
