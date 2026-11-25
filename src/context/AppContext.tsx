import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../lib/api';
import type { LocationRecord, NotificationRecord, PlatformStats, PublicUser } from '../types/civic';

interface AppContextValue {
  user: PublicUser | null;
  locations: LocationRecord[];
  selectedLocation: LocationRecord | null;
  setSelectedLocationSlug: (slug: string) => void;
  stats: PlatformStats | null;
  notifications: NotificationRecord[];
  unreadCount: number;
  setSession: (token: string, user: PublicUser) => void;
  updateUser: (user: PublicUser) => void;
  logout: () => void;
  refreshStats: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('bengaluru');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const refreshStats = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch {
      // Non-blocking stats load
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    api
      .getLocations()
      .then((locs) => setLocations(locs))
      .catch(() => {});
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, refreshNotifications]);

  const setSession = useCallback((token: string, nextUser: PublicUser) => {
    setAuthToken(token);
    setUser(nextUser);
    if (nextUser.homeLocationSlug) {
      setSelectedSlug(nextUser.homeLocationSlug);
    }
  }, []);

  const updateUser = useCallback((nextUser: PublicUser) => {
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setNotifications([]);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  }, []);

  const selectedLocation =
    locations.find((l) => l.slug === selectedSlug) ||
    locations.find((l) => l.slug === 'bengaluru') ||
    locations[0] ||
    null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        user,
        locations,
        selectedLocation,
        setSelectedLocationSlug: setSelectedSlug,
        stats,
        notifications,
        unreadCount,
        setSession,
        updateUser,
        logout,
        refreshStats,
        refreshNotifications,
        markNotificationRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
