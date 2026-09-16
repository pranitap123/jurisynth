import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("jurisynth_token"));

  const setToken = useCallback((value) => {
    if (value) localStorage.setItem("jurisynth_token", value);
    else localStorage.removeItem("jurisynth_token");
    setTokenState(value);
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated: Boolean(token) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
