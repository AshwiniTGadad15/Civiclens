import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CivicLensLogo } from './Logo';

const PRIMARY_LINKS = [
  { to: '/explore', label: 'Explore India' },
  { to: '/issues', label: 'Civic Issues' },
  { to: '/projects', label: 'Projects' },
  { to: '/assistant', label: 'CivicLens AI' },
];

const MORE_LINKS = [
  { to: '/departments', label: 'Government Directory', desc: 'Municipal & state authorities' },
  { to: '/knowledge', label: 'Knowledge Hub', desc: 'Civic rights & governance guides' },
  { to: '/community', label: 'Community', desc: 'Local discussions & updates' },
  { to: '/report', label: 'Report an Issue', desc: 'Submit geo-tagged civic evidence' },
  { to: '/admin', label: 'Administration', desc: 'Protected moderation console' },
];

export function Navbar() {
  const {
    user,
    locations,
    selectedLocation,
    setSelectedLocationSlug,
    notifications,
    unreadCount,
    markNotificationRead,
    logout,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'more' | 'location' | 'notifications' | 'profile' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleMenu = (key: 'more' | 'location' | 'notifications' | 'profile') => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-[#20364A] bg-[#07111F]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-bold tracking-tight text-[#F4F8FC] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#19C98A]"
        >
          <CivicLensLogo className="h-7 w-7 shrink-0" />
          <span className="font-display">CivicLens</span>
        </Link>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {PRIMARY_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors ${
                  isActive
                    ? 'text-[#19C98A] border-b-2 border-[#19C98A]'
                    : 'text-[#9AABBB] hover:text-[#F4F8FC]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('more')}
              className="flex items-center gap-1 whitespace-nowrap shrink-0 py-1 text-sm font-medium text-[#9AABBB] transition-colors hover:text-[#F4F8FC]"
              aria-expanded={openMenu === 'more'}
            >
              <span>Resources</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openMenu === 'more' ? 'rotate-180' : ''}`} />
            </button>

            {openMenu === 'more' && (
              <div className="absolute left-0 top-11 w-68 rounded-xl border border-[#20364A] bg-[#102338] p-2 shadow-2xl">
                {MORE_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[#142B40]"
                  >
                    <div className="text-sm font-medium text-[#F4F8FC]">{item.label}</div>
                    <div className="text-xs text-[#9AABBB]">{item.desc}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Location Selector, Notifications, Account & Primary Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Location Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('location')}
              className="flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 text-xs font-medium text-[#F4F8FC] transition-colors hover:border-[#19C98A]/60 whitespace-nowrap shrink-0"
              aria-label="Select locality"
            >
              <MapPin className="h-3.5 w-3.5 text-[#19C98A]" />
              <span className="max-w-[115px] truncate">{selectedLocation?.name ?? 'Bengaluru'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#9AABBB]" />
            </button>

            {openMenu === 'location' && (
              <div className="absolute right-0 top-11 w-72 rounded-xl border border-[#20364A] bg-[#102338] p-2 shadow-2xl">
                <div className="px-3 py-2 text-xs font-medium text-[#9AABBB] border-b border-[#20364A]">
                  Active Civic Locality
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setSelectedLocationSlug(loc.slug);
                        setOpenMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#142B40] ${
                        selectedLocation?.slug === loc.slug ? 'text-[#19C98A] font-medium' : 'text-[#F4F8FC]'
                      }`}
                    >
                      <span className="truncate">
                        {loc.name}, {loc.state}
                      </span>
                      <span className="text-xs text-[#9AABBB] shrink-0 ml-2">
                        {loc.dataCoverage === 'pilot_active' ? 'Pilot' : loc.dataCoverage === 'partial' ? 'Partial' : 'Directory'}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedLocation && (
                  <div className="border-t border-[#20364A] pt-2 mt-1">
                    <Link
                      to={`/locality/${selectedLocation.slug}`}
                      className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-[#19C98A] hover:bg-[#142B40]"
                    >
                      Open {selectedLocation.name} Dashboard
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('notifications')}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#20364A] bg-[#0B1929] text-[#9AABBB] transition-colors hover:text-[#F4F8FC]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#19C98A] px-1 text-[10px] font-bold text-[#07111F] tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {openMenu === 'notifications' && (
                  <div className="absolute right-0 top-11 w-80 rounded-xl border border-[#20364A] bg-[#102338] p-2 shadow-2xl">
                    <div className="px-3 py-2 text-xs font-semibold text-[#F4F8FC] border-b border-[#20364A]">
                      Notifications ({unreadCount} unread)
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#20364A]">
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-[#9AABBB]">No notifications yet.</div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.link) navigate(n.link);
                              setOpenMenu(null);
                            }}
                            className={`block w-full px-3 py-2.5 text-left transition-colors hover:bg-[#142B40] ${
                              n.isRead ? 'opacity-70' : ''
                            }`}
                          >
                            <div className="text-xs font-semibold text-[#F4F8FC]">{n.title}</div>
                            <div className="mt-0.5 text-xs text-[#9AABBB] line-clamp-2">{n.message}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('profile')}
                  className="flex items-center gap-2 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 text-xs font-medium text-[#F4F8FC] hover:border-[#19C98A]/60 whitespace-nowrap shrink-0"
                >
                  <UserIcon className="h-3.5 w-3.5 text-[#19C98A]" />
                  <span className="max-w-[100px] truncate">{user.fullName}</span>
                </button>
                {openMenu === 'profile' && (
                  <div className="absolute right-0 top-11 w-56 rounded-xl border border-[#20364A] bg-[#102338] p-2 shadow-2xl">
                    <div className="border-b border-[#20364A] px-3 py-2">
                      <div className="truncate text-sm font-semibold text-[#F4F8FC]">{user.fullName}</div>
                      <div className="truncate text-xs text-[#9AABBB]">{user.email}</div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#F4F8FC] hover:bg-[#142B40]"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#19C98A]" />
                      <span>Citizen Dashboard</span>
                    </Link>
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#F4F8FC] hover:bg-[#142B40]"
                    >
                      <Shield className="h-4 w-4 text-[#36C5D9]" />
                      <span>Admin Console</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setOpenMenu(null);
                        navigate('/');
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#FB7185] hover:bg-[#142B40]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="whitespace-nowrap shrink-0 px-3 py-1.5 text-sm font-medium text-[#9AABBB] transition-colors hover:text-[#F4F8FC]"
            >
              Sign In
            </Link>
          )}

          <Link
            to="/report"
            className="whitespace-nowrap shrink-0 rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] transition-colors hover:bg-[#48E6B0]"
          >
            Report Issue
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#20364A] bg-[#0B1929] text-[#F4F8FC] lg:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#20364A] bg-[#0B1929] px-4 py-4 lg:hidden">
          <div className="mb-4">
            <label htmlFor="mobile-locality" className="block text-xs text-[#9AABBB] mb-1">
              Active Locality
            </label>
            <select
              id="mobile-locality"
              value={selectedLocation?.slug ?? 'bengaluru'}
              onChange={(e) => setSelectedLocationSlug(e.target.value)}
              className="w-full rounded-lg border border-[#20364A] bg-[#102338] px-3 py-2 text-sm text-[#F4F8FC]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.slug}>
                  {loc.name}, {loc.state}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { to: '/', label: 'Home' },
              { to: '/explore', label: 'Explore India' },
              { to: '/issues', label: 'Civic Issues' },
              { to: '/report', label: 'Report Issue' },
              { to: '/assistant', label: 'CivicLens AI' },
              { to: '/projects', label: 'Projects' },
              { to: '/departments', label: 'Gov Directory' },
              { to: '/knowledge', label: 'Knowledge Hub' },
              { to: '/community', label: 'Community' },
              { to: user ? '/dashboard' : '/login', label: user ? 'Dashboard' : 'Sign In' },
              { to: '/admin', label: 'Admin Console' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg border border-[#20364A] bg-[#102338] px-3 py-2.5 font-medium text-[#F4F8FC] hover:border-[#19C98A]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
