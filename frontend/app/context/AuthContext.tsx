"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
  state: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  language: string;
  state: string;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setLanguage: (lang: string) => void;
  setState: (st: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>("hi-IN");
  const [state, setStateState] = useState<string>("India");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("vani_token");
    const storedUser = localStorage.getItem("vani_user");
    const storedLang = localStorage.getItem("vani_lang");
    const storedState = localStorage.getItem("vani_state");
    const storedTheme = localStorage.getItem("vani_theme") as "light" | "dark" | null;

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error restoring user session:", e);
      }
    }
    if (storedLang) setLanguageState(storedLang);
    if (storedState) setStateState(storedState);

    // Dark Mode initialization
    const initialTheme = storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setIsLoading(false);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("vani_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (newUser.preferred_language) {
      setLanguageState(newUser.preferred_language);
      localStorage.setItem("vani_lang", newUser.preferred_language);
    }
    if (newUser.state) {
      setStateState(newUser.state);
      localStorage.setItem("vani_state", newUser.state);
    }
    localStorage.setItem("vani_token", newToken);
    localStorage.setItem("vani_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("vani_token");
    localStorage.removeItem("vani_user");
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("vani_lang", lang);
  };

  const setState = (st: string) => {
    setStateState(st);
    localStorage.setItem("vani_state", st);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        language,
        state,
        theme,
        toggleTheme,
        setLanguage,
        setState,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
