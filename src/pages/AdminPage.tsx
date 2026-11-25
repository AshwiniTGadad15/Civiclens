import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  BookOpen,
  Building2,
  CheckSquare,
  FileWarning,
  FolderKanban,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageSquare,
  ScrollText,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { ISSUE_STATUSES, PROJECT_STATUSES, formatShortDate, statusColorClass } from '../lib/constants';
import type {
  AuditLogRecord,
  CivicIssue,
  DepartmentRecord,
  DiscussionRecord,
  IssueStatus,
  KnowledgeArticle,
  LocationRecord,
  PlatformStats,
  ProjectRecord,
  PublicUser,
} from '../types/civic';

type AdminSection =
  | 'overview'
  | 'verification'
  | 'users'
  | 'community'
  | 'projects'
  | 'departments'
  | 'knowledge'
  | 'locations'
  | 'audit';

export function AdminPage() {
  const { user, setSession, refreshStats } = useApp();

  const [bootstrap, setBootstrap] = useState<{
    envPasscodeConfigured: boolean;
    adminClaimed: boolean;
    canBootstrapClaim: boolean;
    isCurrentUserAdmin: boolean;
  } | null>(null);
  const [passcode, setPasscode] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);

  const [section, setSection] = useState<AdminSection>('overview');
  const [overview, setOverview] = useState<{
    stats: PlatformStats;
    users: PublicUser[];
    issues: CivicIssue[];
    discussions: DiscussionRecord[];
    departments: DepartmentRecord[];
    projects: ProjectRecord[];
    locations: LocationRecord[];
    articles: KnowledgeArticle[];
    auditLogs: AuditLogRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Issue moderation form state
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [modStatus, setModStatus] = useState<IssueStatus>('Verified');
  const [modVerify, setModVerify] = useState<'Unverified' | 'Under Review' | 'Verified' | 'Rejected'>('Verified');
  const [modNote, setModNote] = useState('');
  const [modRef, setModRef] = useState('');

  // Quick publish forms
  const [projName, setProjName] = useState('');
  const [projCity, setProjCity] = useState('Bengaluru');
  const [projDept, setProjDept] = useState('Bruhat Bengaluru Mahanagara Palike (BBMP)');
  const [projBudget, setProjBudget] = useState('Verify on official municipal tender portal');
  const [projSourceUrl, setProjSourceUrl] = useState('https://bbmp.gov.in');
  const [projStatus, setProjStatus] = useState('Planned');
  const [projDesc, setProjDesc] = useState('');

  const [artTitle, setArtTitle] = useState('');
  const [artCat, setArtCat] = useState('Understanding Indian municipal governance');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artSourceUrl, setArtSourceUrl] = useState('https://mohua.gov.in');

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const bs = await api.getAdminBootstrapStatus();
      setBootstrap(bs);
      if (bs.isCurrentUserAdmin) {
        const data = await api.getAdminOverview();
        setOverview(data);
        if (!selectedIssue && data.issues.length > 0) {
          setSelectedIssue(data.issues[0]);
          setModStatus(data.issues[0].status);
          setModVerify(data.issues[0].verificationStatus);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError(null);
    try {
      const res = await api.claimAdmin(passcode);
      setSession(res.token, res.user);
      setPasscode('');
      await loadAdmin();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Unable to verify administrator access.');
    }
  };

  const handleModerateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setActionMsg(null);
    try {
      await api.moderateIssue(selectedIssue.id, {
        status: modStatus,
        verificationStatus: modVerify,
        note: modNote.trim() || `Status updated to ${modStatus} (${modVerify}) by CivicLens moderator.`,
        officialReference: modRef.trim() || undefined,
      });
      setModNote('');
      setActionMsg(`Updated ${selectedIssue.trackingId} to ${modStatus}.`);
      await loadAdmin();
      await refreshStats();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminProject({
        name: projName,
        description: projDesc,
        category: 'Public Infrastructure',
        locationSlug: 'bengaluru',
        state: 'Karnataka',
        city: projCity,
        locality: projCity,
        latitude: 12.9716,
        longitude: 77.5946,
        departmentName: projDept,
        publishedBudget: projBudget,
        startDate: new Date().toISOString().slice(0, 10),
        expectedCompletion: 'Per official published schedule',
        status: projStatus,
        progressPercent: projStatus === 'Completed' ? 100 : 15,
        sourceName: 'Official Portal',
        sourceUrl: projSourceUrl,
      });
      setProjName('');
      setProjDesc('');
      setActionMsg('Development project published and logged.');
      await loadAdmin();
      await refreshStats();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to publish project.');
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminArticle({
        title: artTitle,
        category: artCat,
        summary: artSummary,
        contentEn: artContent,
        sourceTitle: 'Official Government Portal',
        sourceUrl: artSourceUrl,
      });
      setArtTitle('');
      setArtSummary('');
      setArtContent('');
      setActionMsg('Knowledge Hub article published and logged.');
      await loadAdmin();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to publish article.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-2xl border border-[#20364A] bg-[#102338]" />
      </div>
    );
  }

  // Protected Server-Side Access Gate
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-[#19C98A]" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#F4F8FC]">Protected Administration Console</h1>
        <p className="mt-2 text-sm text-[#9AABBB]">
          Administrative privileges are enforced strictly on the server. Sign in with an authorized account first.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg bg-[#19C98A] px-5 py-2.5 text-xs font-semibold text-[#07111F]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!bootstrap?.isCurrentUserAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-7">
          <div className="flex items-center gap-2 text-xs font-medium text-[#36C5D9]">
            <Lock className="h-4 w-4" />
            <span>Server-Verified Role-Based Authorization</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-[#F4F8FC]">
            {bootstrap?.canBootstrapClaim ? 'First-Run Super Administrator Setup' : 'Administrator Verification'}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#9AABBB]">
            {bootstrap?.canBootstrapClaim
              ? 'No administrator has been configured yet. Choose a strong passcode (min 8 characters) to claim the Super Administrator role for your signed-in account. Once claimed, this bootstrap flow locks automatically.'
              : 'Enter the server-configured administrator passcode to unlock moderation and publishing permissions.'}
          </p>

          <form onSubmit={handleClaimAdmin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs text-[#9AABBB] mb-1">
                {bootstrap?.canBootstrapClaim ? 'Set Super Administrator Passcode' : 'Administrator Passcode'}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              />
            </div>
            {claimError && <p className="text-xs text-[#FB7185]">{claimError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#19C98A] py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
            >
              {bootstrap?.canBootstrapClaim ? 'Claim Super Administrator Role' : 'Verify & Unlock Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems: { key: AdminSection; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview & Analytics', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'verification', label: 'Issue Verification', icon: <CheckSquare className="h-4 w-4" /> },
    { key: 'community', label: 'Community Moderation', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'projects', label: 'Projects', icon: <FolderKanban className="h-4 w-4" /> },
    { key: 'departments', label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
    { key: 'knowledge', label: 'Knowledge Hub', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'locations', label: 'Locations', icon: <MapPin className="h-4 w-4" /> },
    { key: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" /> },
    { key: 'audit', label: 'Audit Logs', icon: <ScrollText className="h-4 w-4" /> },
  ];

  const statusChart = ISSUE_STATUSES.map((st) => ({
    status: st.replace('Forwarded to Authority', 'Forwarded'),
    count: (overview?.issues ?? []).filter((i) => i.status === st).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Admin Sidebar */}
        <aside className="rounded-2xl border border-[#20364A] bg-[#0B1929] p-4 lg:col-span-3 h-fit">
          <div className="border-b border-[#20364A] pb-3 px-2">
            <div className="text-xs font-medium text-[#19C98A]">CivicLens Admin</div>
            <div className="mt-0.5 text-sm font-bold text-[#F4F8FC]">{user.fullName}</div>
            <div className="text-[11px] text-[#9AABBB] capitalize">{user.role.replace('_', ' ')}</div>
          </div>

          <nav className="mt-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  section === item.key
                    ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                    : 'text-[#9AABBB] hover:bg-[#102338] hover:text-[#F4F8FC]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="space-y-6 lg:col-span-9">
          {actionMsg && (
            <div className="rounded-xl border border-[#19C98A]/40 bg-[#19C98A]/10 px-4 py-3 text-xs text-[#48E6B0]">
              {actionMsg}
            </div>
          )}

          {section === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
                  <div className="text-xs text-[#9AABBB]">Total Issues</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#F4F8FC] tabular-nums">
                    {overview.stats.totalReports}
                  </div>
                </div>
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
                  <div className="text-xs text-[#9AABBB]">Verified</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#19C98A] tabular-nums">
                    {overview.stats.verifiedIssues}
                  </div>
                </div>
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
                  <div className="text-xs text-[#9AABBB]">Registered Users</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#36C5D9] tabular-nums">
                    {overview.users.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
                  <div className="text-xs text-[#9AABBB]">Audit Entries</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#F4F8FC] tabular-nums">
                    {overview.auditLogs.length}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F8FC]">
                  <Activity className="h-4 w-4 text-[#19C98A]" />
                  <span>Civic Issues by Workflow Stage</span>
                </div>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChart}>
                      <XAxis dataKey="status" tick={{ fill: '#9AABBB', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#9AABBB', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#0B1929', border: '1px solid #20364A', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#19C98A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {section === 'verification' && overview && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-2.5 lg:col-span-6">
                <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Civic Reports Queue</h2>
                {overview.issues.map((iss) => (
                  <button
                    key={iss.id}
                    type="button"
                    onClick={() => {
                      setSelectedIssue(iss);
                      setModStatus(iss.status);
                      setModVerify(iss.verificationStatus);
                      setModRef(iss.officialReference || '');
                    }}
                    className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedIssue?.id === iss.id
                        ? 'border-[#19C98A] bg-[#142B40]'
                        : 'border-[#20364A] bg-[#102338]'
                    }`}
                  >
                    <div className="flex justify-between text-xs text-[#9AABBB]">
                      <span className={statusColorClass(iss.status)}>{iss.status}</span>
                      <span className="font-mono">{iss.trackingId}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#F4F8FC]">{iss.title}</div>
                    <div className="mt-1 text-xs text-[#9AABBB]">
                      {iss.locality}, {iss.city} · {iss.verificationStatus}
                    </div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-6">
                {selectedIssue && (
                  <form
                    onSubmit={handleModerateIssue}
                    className="rounded-2xl border border-[#20364A] bg-[#102338] p-6 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-xs text-[#19C98A]">
                      <FileWarning className="h-4 w-4" />
                      <span className="font-mono">{selectedIssue.trackingId}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#F4F8FC]">{selectedIssue.title}</h3>
                    <p className="text-xs leading-relaxed text-[#9AABBB]">{selectedIssue.description}</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-[#9AABBB] mb-1">Workflow Status</label>
                        <select
                          value={modStatus}
                          onChange={(e) => setModStatus(e.target.value as IssueStatus)}
                          className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                        >
                          {ISSUE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#9AABBB] mb-1">Verification Status</label>
                        <select
                          value={modVerify}
                          onChange={(e) => setModVerify(e.target.value as typeof modVerify)}
                          className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                        >
                          <option value="Unverified">Unverified</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Verified">Verified</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9AABBB] mb-1">Official Authority Docket Reference (Optional)</label>
                      <input
                        type="text"
                        value={modRef}
                        onChange={(e) => setModRef(e.target.value)}
                        placeholder="Only enter if confirmed by citizen/official portal"
                        className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#9AABBB] mb-1">Moderation Note (Shown in Public Timeline)</label>
                      <textarea
                        rows={3}
                        required
                        value={modNote}
                        onChange={(e) => setModNote(e.target.value)}
                        placeholder="Explain verification outcome or status change..."
                        className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#19C98A] py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                    >
                      Save Verification Update
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {section === 'community' && overview && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Community Discussions Moderation</h2>
              {overview.discussions.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#20364A] bg-[#102338] p-4">
                  <div>
                    <div className="text-sm font-semibold text-[#F4F8FC]">{d.title}</div>
                    <div className="mt-1 text-xs text-[#9AABBB]">
                      {d.authorName} · {d.localityName} · Status: {d.moderationStatus} · Flags: {d.flaggedCount}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['approved', 'flagged', 'removed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={async () => {
                          await api.moderateDiscussion(d.id, st);
                          setActionMsg(`Discussion set to ${st}.`);
                          await loadAdmin();
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                          d.moderationStatus === st
                            ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                            : 'border border-[#20364A] bg-[#0B1929] text-[#9AABBB]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === 'projects' && overview && (
            <div className="space-y-6">
              <form onSubmit={handleCreateProject} className="rounded-2xl border border-[#20364A] bg-[#102338] p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Publish Documented Development Project</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="Official Project Name"
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  />
                  <input
                    type="text"
                    required
                    value={projCity}
                    onChange={(e) => setProjCity(e.target.value)}
                    placeholder="City"
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  />
                  <input
                    type="text"
                    required
                    value={projDept}
                    onChange={(e) => setProjDept(e.target.value)}
                    placeholder="Responsible Department"
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  />
                  <select
                    value={projStatus}
                    onChange={(e) => setProjStatus(e.target.value)}
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={projBudget}
                    onChange={(e) => setProjBudget(e.target.value)}
                    placeholder="Published Budget Reference"
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  />
                  <input
                    type="url"
                    required
                    value={projSourceUrl}
                    onChange={(e) => setProjSourceUrl(e.target.value)}
                    placeholder="Official Source URL (https://...)"
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Project scope and official summary..."
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#19C98A] px-5 py-2 text-xs font-semibold text-[#07111F]"
                >
                  Publish Project
                </button>
              </form>

              <div className="space-y-2.5">
                {overview.projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[#20364A] bg-[#102338] p-4 text-xs">
                    <div className="font-semibold text-[#F4F8FC]">{p.name}</div>
                    <div className="mt-1 text-[#9AABBB]">
                      {p.city} · {p.status} · {p.departmentName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'knowledge' && overview && (
            <form onSubmit={handleCreateArticle} className="rounded-2xl border border-[#20364A] bg-[#102338] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Publish Civic Knowledge Hub Article</h2>
              <input
                type="text"
                required
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                placeholder="Article Title"
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={artCat}
                  onChange={(e) => setArtCat(e.target.value)}
                  placeholder="Category"
                  className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                />
                <input
                  type="url"
                  required
                  value={artSourceUrl}
                  onChange={(e) => setArtSourceUrl(e.target.value)}
                  placeholder="Authoritative Reference URL (https://...)"
                  className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
                />
              </div>
              <input
                type="text"
                required
                value={artSummary}
                onChange={(e) => setArtSummary(e.target.value)}
                placeholder="Short summary..."
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
              />
              <textarea
                rows={5}
                required
                value={artContent}
                onChange={(e) => setArtContent(e.target.value)}
                placeholder="Full verified civic guide content..."
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#19C98A] px-5 py-2 text-xs font-semibold text-[#07111F]"
              >
                Publish Article
              </button>
            </form>
          )}

          {section === 'departments' && overview && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">
                Indexed Government Departments ({overview.departments.length})
              </h2>
              {overview.departments.map((d) => (
                <div key={d.id} className="rounded-xl border border-[#20364A] bg-[#102338] p-4 text-xs">
                  <div className="font-semibold text-[#F4F8FC]">{d.name}</div>
                  <div className="mt-1 text-[#9AABBB]">
                    {d.departmentType} · {d.state} · {d.officialWebsite}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === 'locations' && overview && (
            <div className="space-y-2.5">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">
                Indexed Indian Localities ({overview.locations.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.locations.map((l) => (
                  <div key={l.id} className="rounded-xl border border-[#20364A] bg-[#102338] p-4 text-xs">
                    <div className="font-semibold text-[#F4F8FC]">{l.name}, {l.state}</div>
                    <div className="mt-1 text-[#9AABBB]">
                      Coverage: {l.dataCoverage} · PIN {l.pinCode || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'users' && overview && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">User Accounts &amp; Role Management</h2>
              {overview.users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#20364A] bg-[#102338] p-4 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#F4F8FC]">{u.fullName}</div>
                    <div className="text-[#9AABBB]">{u.email}</div>
                  </div>
                  <select
                    value={u.role}
                    disabled={user.role !== 'super_admin'}
                    onChange={async (e) => {
                      await api.updateUserRole(u.id, e.target.value);
                      setActionMsg(`Updated role for ${u.email}.`);
                      await loadAdmin();
                    }}
                    className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 text-xs text-[#F4F8FC]"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="moderator">Moderator</option>
                    <option value="content_admin">Content Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {section === 'audit' && overview && (
            <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-5">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Immutable Platform Audit Logs</h2>
              <div className="mt-4 divide-y divide-[#20364A] text-xs">
                {overview.auditLogs.map((log) => (
                  <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <span className="font-mono font-semibold text-[#48E6B0]">{log.action}</span>
                      <span className="mx-2 text-[#9AABBB]">·</span>
                      <span className="text-[#F4F8FC]">{log.details}</span>
                      <div className="mt-0.5 text-[#9AABBB]">Actor: {log.actorEmail} · Entity: {log.entityType}</div>
                    </div>
                    <span className="font-mono text-[#9AABBB]">{formatShortDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
