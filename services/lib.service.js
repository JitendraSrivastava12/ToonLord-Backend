import React, { createContext, useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const queryClient = useQueryClient();

  // --- AUTH STATE ---
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // --- VISUAL THEME STATE (The Aesthetic DNA) ---
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem("site-theme") || "default");

  // --- SECURITY MODE STATE (The Functional Protocol) ---
  const [isRedMode, setIsRedMode] = useState(localStorage.getItem("red-mode") === "true");
  const [familyMode, setFamilyMode] = useState(localStorage.getItem("family-mode") === "true");

  // Initialize the DOM class on load
  useEffect(() => {
    document.documentElement.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  // Sync across tabs
  useEffect(() => {
    const syncStates = (e) => {
      if (e.key === "token") setIsLoggedIn(!!e.newValue);
      if (e.key === "site-theme") setCurrentTheme(e.newValue || "default");
      if (e.key === "red-mode") setIsRedMode(e.newValue === "true");
      if (e.key === "family-mode") setFamilyMode(e.newValue === "true");
    };
    window.addEventListener("storage", syncStates);
    return () => window.removeEventListener("storage", syncStates);
  }, []);

  // --- THEME ACTIONS ---
  const updateTheme = (id) => {
    setCurrentTheme(id);
    localStorage.setItem("site-theme", id);
  };

  // --- SECURITY ACTIONS ---
  const toggleRedMode = () => {
    const newStatus = !isRedMode;
    setIsRedMode(newStatus);
    localStorage.setItem("red-mode", newStatus);
    if (newStatus) setFamilyMode(false); // Mutually exclusive for clarity
    refreshData();
  };

  const toggleFamilyMode = () => {
    const newStatus = !familyMode;
    setFamilyMode(newStatus);
    localStorage.setItem("family-mode", newStatus);
    if (newStatus) setIsRedMode(false);
    refreshData();
  };

  const refreshData = () => {
    try {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const k = query.queryKey;
          return Array.isArray(k) && k.some(part => 
            ['manga', 'catalog', 'home'].includes(String(part).toLowerCase())
          );
        }
      });
    } catch (e) {
      console.warn('Refresh failed', e);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider value={{ 
      isLoggedIn, user, setUser, login, logout, 
      currentTheme, setTheme: updateTheme, 
      isRedMode, toggleRedMode, 
      familyMode, toggleFamilyMode 
    }}>
      {children}
    </AppContext.Provider>
  );
}