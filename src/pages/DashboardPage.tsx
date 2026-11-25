import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, Bot, FileText, MapPin, MessageSquare, Settings, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES, formatShortDate, statusColorClass } from '../lib/constants';
import type {
  AiConversationRecord,
  CivicIssue,
  DiscussionRecord,
  KnowledgeArticle,
  LocationRecord,
  NotificationRecord,
} from '../types/civic';

type TabKey = 'reports' | 'saved' | 'localities' | 'notifications' | 'ai' | 'community' | 'settings';

export function DashboardPage() {
  const { user, locations, updateUser, logout, markNotificationRead } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('reports');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    myReports: CivicIssue[];
    savedIssues: CivicIssue[];
    followedLocations: LocationRecord[];
    notifications: NotificationRecord[];
    aiConversations: AiConversationRecord[];
    myDiscussions: DiscussionRecord[];
    bookmarkedArticles: KnowledgeArticle[];
  } | null>(null);

  // Settings state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [homeLocationSlug, setHomeLocationSlug] = useState(user?.homeLocationSlug || 'bengaluru');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'en');
  const [privacyHideProfile, setPrivacyHideProfile] = useState(user?.privacyHideProfile || false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .getDashboard()
      .then((res) => {
        setData(res);
        setFullName(res.user.fullName);
        setHomeLocationSlug(res.user.homeLocationSlug || 'bengaluru');
        setPreferredLanguage(res.user.preferredLanguage || 'en');
        setPrivacyHideProfile(res.user.privacyHideProfile);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F4F8FC]">Citizen Dashboard</h1>
        <p className="mt-2 text-sm text-[#9AABBB]">
          Sign in to track your submitted civic issues, followed localities, notifications, and CivicLens AI history.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-[#19C98A] px-5 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-lg border border-[#20364A] bg-[#102338] px-5 py-2.5 text-xs font-semibold text-[#F4F8FC]"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        homeLocationSlug,
        preferredLanguage,
        privacyHideProfile,
      });
      updateUser(res.user);
      setSaveMessage('Profile and privacy preferences updated.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Unable to save settings.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      logout();
      navigate('/');
    } catch {
      // ignore
    }
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'reports', label: `My Reports (${data?.myReports.length ?? 0})`, icon: <FileText className="h-4 w-4" /> },
    { key: 'saved', label: `Saved (${(data?.savedIssues.length ?? 0) + (data?.bookmarkedArticles.length ?? 0)})`, icon: <Bookmark className="h-4 w-4" /> },
    { key: 'localities', label: `Localities (${data?.followedLocations.length ?? 0})`, icon: <MapPin className="h-4 w-4" /> },
    { key: 'notifications', label: `Notifications (${data?.notifications.length ?? 0})`, icon: <Bell className="h-4 w-4" /> },
    { key: 'ai', label: `AI History (${data?.aiConversations.length ?? 0})`, icon: <Bot className="h-4 w-4" /> },
    { key: 'community', label: `Community (${data?.myDiscussions.length ?? 0})`, icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'settings', label: 'Settings & Privacy', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-medium text-[#19C98A]">
            Citizen Dashboard · Role: {user.role.replace('_', ' ')}
          </div>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-[#F4F8FC]">Welcome back, {user.fullName}</h1>
          <p className="mt-1 text-sm text-[#9AABBB]">{user.email}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/report"
            className="rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
          >
            Submit New Report
          </Link>
          <Link
            to="/admin"
            className="rounded-lg border border-[#20364A] bg-[#102338] px-4 py-2 text-xs font-semibold text-[#F4F8FC] hover:border-[#36C5D9]"
          >
            Admin Console
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                : 'border border-[#20364A] bg-[#102338] text-[#9AABBB] hover:text-[#F4F8FC]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content Panel */}
      <div className="mt-6">
        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-[#20364A] bg-[#102338]" />
        ) : activeTab === 'reports' ? (
          <div className="space-y-3">
            {data?.myReports.length === 0 ? (
              <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-10 text-center">
                <p className="text-sm text-[#F4F8FC]">You have not submitted any civic reports yet.</p>
                <Link
                  to="/report"
                  className="mt-4 inline-block rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F]"
                >
                  Submit Your First Report
                </Link>
              </div>
            ) : (
              data?.myReports.map((iss) => (
                <Link
                  key={iss.id}
                  to={`/issues/${iss.id}`}
                  className="block rounded-xl border border-[#20364A] bg-[#102338] p-5 hover:border-[#19C98A]"
                >
                  <div className="flex items-center justify-between text-xs text-[#9AABBB]">
                    <span>
                      {iss.category} · <span className={statusColorClass(iss.status)}>{iss.status}</span>
                    </span>
                    <span className="font-mono text-[#48E6B0]">{iss.trackingId}</span>
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-[#F4F8FC]">{iss.title}</div>
                  <div className="mt-1 text-xs text-[#9AABBB]">
                    {iss.locality}, {iss.city} · Submitted {formatShortDate(iss.createdAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : activeTab === 'saved' ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-5">
              <h2 className="font-display text-base font-bold text-[#F4F8FC]">Saved Civic Issues</h2>
              <div className="mt-3 space-y-3">
                {data?.savedIssues.length === 0 ? (
                  <p className="text-xs text-[#9AABBB]">No saved issues yet.</p>
                ) : (
                  data?.savedIssues.map((iss) => (
                    <Link key={iss.id} to={`/issues/${iss.id}`} className="block border-b border-[#20364A] pb-3 last:border-0">
                      <div className="text-sm font-semibold text-[#F4F8FC] hover:text-[#19C98A]">{iss.title}</div>
                      <div className="text-xs text-[#9AABBB]">{iss.trackingId} · {iss.status}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-5">
              <h2 className="font-display text-base font-bold text-[#F4F8FC]">Bookmarked Knowledge Articles</h2>
              <div className="mt-3 space-y-3">
                {data?.bookmarkedArticles.length === 0 ? (
                  <p className="text-xs text-[#9AABBB]">No bookmarked articles yet.</p>
                ) : (
                  data?.bookmarkedArticles.map((a) => (
                    <Link
                      key={a.id}
                      to={`/knowledge?article=${encodeURIComponent(a.slug)}`}
                      className="block border-b border-[#20364A] pb-3 last:border-0"
                    >
                      <div className="text-sm font-semibold text-[#F4F8FC] hover:text-[#19C98A]">{a.title}</div>
                      <div className="text-xs text-[#9AABBB]">{a.category}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'localities' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.followedLocations.length === 0 ? (
              <div className="col-span-3 rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
                Follow localities from Explore India to track updates here.
              </div>
            ) : (
              data?.followedLocations.map((loc) => (
                <Link
                  key={loc.id}
                  to={`/locality/${loc.slug}`}
                  className="rounded-xl border border-[#20364A] bg-[#102338] p-5 hover:border-[#19C98A]"
                >
                  <div className="text-xs text-[#19C98A]">{loc.state}</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#F4F8FC]">{loc.name}</div>
                  <p className="mt-1.5 text-xs text-[#9AABBB] line-clamp-2">{loc.civicOverview}</p>
                </Link>
              ))
            )}
          </div>
        ) : activeTab === 'notifications' ? (
          <div className="space-y-2.5">
            {data?.notifications.length === 0 ? (
              <div className="rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
                No notifications yet.
              </div>
            ) : (
              data?.notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-[#20364A] bg-[#102338] p-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#F4F8FC]">{n.title}</div>
                    <p className="mt-0.5 text-xs text-[#9AABBB]">{n.message}</p>
                    <div className="mt-1 font-mono text-[11px] text-[#9AABBB]">{formatShortDate(n.createdAt)}</div>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs font-medium text-[#19C98A] hover:underline whitespace-nowrap"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'ai' ? (
          <div className="space-y-3">
            {data?.aiConversations.length === 0 ? (
              <div className="rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
                Your saved CivicLens AI conversations will appear here.
              </div>
            ) : (
              data?.aiConversations.map((c) => (
                <Link
                  key={c.id}
                  to="/assistant"
                  className="block rounded-xl border border-[#20364A] bg-[#102338] p-4 hover:border-[#36C5D9]"
                >
                  <div className="text-sm font-semibold text-[#F4F8FC]">{c.title}</div>
                  <div className="mt-1 text-xs text-[#9AABBB]">
                    {c.localityContext} · {c.messages.length} messages · {formatShortDate(c.updatedAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : activeTab === 'community' ? (
          <div className="space-y-3">
            {data?.myDiscussions.length === 0 ? (
              <div className="rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
                You haven&apos;t started any community discussions yet.
              </div>
            ) : (
              data?.myDiscussions.map((d) => (
                <Link
                  key={d.id}
                  to="/community"
                  className="block rounded-xl border border-[#20364A] bg-[#102338] p-4 hover:border-[#19C98A]"
                >
                  <div className="text-sm font-semibold text-[#F4F8FC]">{d.title}</div>
                  <div className="mt-1 text-xs text-[#9AABBB]">
                    {d.localityName} · {d.supportCount} supports · {d.comments.length} replies
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleSaveSettings} className="space-y-4 rounded-2xl border border-[#20364A] bg-[#102338] p-6">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Profile &amp; Privacy Controls</h2>

              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Display Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Home Locality</label>
                <select
                  value={homeLocationSlug}
                  onChange={(e) => setHomeLocationSlug(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.slug}>
                      {l.name}, {l.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Preferred AI Language</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.native})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#9AABBB]">
                <input
                  type="checkbox"
                  checked={privacyHideProfile}
                  onChange={(e) => setPrivacyHideProfile(e.target.checked)}
                  className="mt-0.5 accent-[#19C98A]"
                />
                <span>Display my future reports and community posts as &ldquo;Verified Citizen&rdquo; to protect privacy.</span>
              </label>

              {saveMessage && <p className="text-xs text-[#48E6B0]">{saveMessage}</p>}

              <button
                type="submit"
                className="rounded-lg bg-[#19C98A] px-5 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
              >
                Save Preferences
              </button>
            </form>

            <div className="rounded-2xl border border-[#FB7185]/30 bg-[#102338] p-6">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Data Deletion Control</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#9AABBB]">
                You retain full control over your personal account data. Deleting your account removes your profile,
                notifications, and saved AI conversation history from CivicLens.
              </p>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[#FB7185]/50 px-4 py-2 text-xs font-semibold text-[#FB7185] hover:bg-[#FB7185]/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete My Account</span>
                </button>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold text-[#FB7185]">Confirm permanent account deletion?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="rounded-lg bg-[#FB7185] px-4 py-2 text-xs font-semibold text-[#07111F]"
                    >
                      Yes, Delete Permanently
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[#20364A] px-4 py-2 text-xs text-[#9AABBB]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
