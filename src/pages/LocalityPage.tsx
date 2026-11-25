import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bookmark, ExternalLink, MapPin, Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { CIVIC_CATEGORIES, formatShortDate, statusColorClass } from '../lib/constants';
import type {
  CivicIssue,
  DepartmentRecord,
  DiscussionRecord,
  LocationRecord,
  ProjectRecord,
} from '../types/civic';
import { CivicMap } from '../components/maps/CivicMap';

export function LocalityPage() {
  const { slug = 'bengaluru' } = useParams();
  const { user, updateUser } = useApp();
  const navigate = useNavigate();

  const [data, setData] = useState<{
    location: LocationRecord;
    issues: CivicIssue[];
    projects: ProjectRecord[];
    departments: DepartmentRecord[];
    discussions: DiscussionRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'supported'>('newest');

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getLocalityDetail(slug)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load locality'))
      .finally(() => setLoading(false));
  }, [slug]);

  const isFollowing = Boolean(user?.followedLocations.includes(slug));

  const handleToggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleFollowLocation(slug);
      updateUser({ ...user, followedLocations: res.followedLocations });
    } catch {
      // ignore
    }
  };

  const filteredIssues = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const list = data.issues.filter((i) => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === 'supported') {
      return [...list].sort((a, b) => b.supportCount - a.supportCount);
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, search, categoryFilter, sortBy]);

  const categoryChartData = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.issues.forEach((i) => {
      const short = CIVIC_CATEGORIES.find((c) => c.name === i.category)?.shortLabel || i.category;
      counts.set(short, (counts.get(short) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="h-48 animate-pulse rounded-2xl border border-[#20364A] bg-[#102338]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F4F8FC]">Locality Not Found</h1>
        <p className="mt-2 text-sm text-[#9AABBB]">{error || 'This locality record is not yet indexed.'}</p>
        <Link
          to="/explore"
          className="mt-5 inline-block rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F]"
        >
          Back to Explore India
        </Link>
      </div>
    );
  }

  const { location, issues, projects, departments, discussions } = data;
  const verifiedCount = issues.filter((i) => i.verificationStatus === 'Verified').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb & Title Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 md:flex-row md:items-end">
        <div>
          <div className="text-xs text-[#9AABBB]">
            <span>India</span>
            <span className="mx-1.5">/</span>
            <span>{location.state}</span>
            <span className="mx-1.5">/</span>
            <span>{location.district}</span>
            {location.pinCode && (
              <>
                <span className="mx-1.5">·</span>
                <span className="font-mono">PIN {location.pinCode}</span>
              </>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-[#F4F8FC] sm:text-4xl">{location.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className={location.dataCoverage === 'pilot_active' ? 'text-[#48E6B0] font-medium' : 'text-[#F59E0B] font-medium'}>
              Data Availability:{' '}
              {location.dataCoverage === 'pilot_active'
                ? 'Active Pilot Coverage (Bengaluru)'
                : location.dataCoverage === 'partial'
                  ? 'Partial Civic Dataset (Expansion City)'
                  : 'Directory & Citizen Reporting Only'}
            </span>
            {location.wardNumber && <span className="text-[#9AABBB]">· {location.wardNumber}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleFollow}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              isFollowing
                ? 'border-[#19C98A] bg-[#19C98A]/15 text-[#48E6B0]'
                : 'border-[#20364A] bg-[#102338] text-[#F4F8FC] hover:border-[#19C98A]'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{isFollowing ? 'Following Locality' : 'Follow Locality'}</span>
          </button>
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Report Issue Here</span>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <div className="text-xs text-[#9AABBB]">Reported Issues</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#F4F8FC] tabular-nums">{issues.length}</div>
        </div>
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <div className="text-xs text-[#9AABBB]">Verified Issues</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#19C98A] tabular-nums">{verifiedCount}</div>
        </div>
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <div className="text-xs text-[#9AABBB]">Resolved Issues</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#48E6B0] tabular-nums">{resolvedCount}</div>
        </div>
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <div className="text-xs text-[#9AABBB]">Documented Projects</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#36C5D9] tabular-nums">{projects.length}</div>
        </div>
      </div>

      {/* Map + Civic Overview */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CivicMap
            center={[location.longitude, location.latitude]}
            zoom={location.level === 'locality' ? 13.5 : 11}
            issues={issues}
            projects={projects}
            heightClass="h-[360px]"
            onIssueSelect={(iss) => navigate(`/issues/${iss.id}`)}
            onProjectSelect={() => navigate('/projects')}
          />
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#20364A] bg-[#102338] p-6 lg:col-span-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Civic Overview &amp; Infrastructure</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#9AABBB]">{location.civicOverview}</p>

            <h3 className="mt-5 text-xs font-semibold text-[#F4F8FC]">Key Public Infrastructure</h3>
            <ul className="mt-2.5 space-y-2 text-xs text-[#9AABBB]">
              {location.infrastructureSummary.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#19C98A]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {categoryChartData.length > 0 && (
            <div className="mt-5 border-t border-[#20364A] pt-4">
              <div className="mb-2 text-xs font-medium text-[#9AABBB]">Reported Issues by Category</div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <XAxis dataKey="name" tick={{ fill: '#9AABBB', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9AABBB', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ background: '#0B1929', border: '1px solid #20364A', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#19C98A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Local Issues with Filters */}
      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="font-display text-2xl font-bold text-[#F4F8FC]">Local Civic Issues</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9AABBB]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter issues..."
                className="rounded-lg border border-[#20364A] bg-[#0B1929] py-2 pl-8 pr-3 text-xs text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
            >
              <option value="">All Categories</option>
              {CIVIC_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'supported')}
              className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
            >
              <option value="newest">Newest First</option>
              <option value="supported">Most Supported</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {filteredIssues.length === 0 ? (
            <div className="col-span-2 rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
              No civic reports recorded for this filter yet. Citizens can submit verified neighborhood observations via
              the Report Issue flow.
            </div>
          ) : (
            filteredIssues.map((iss) => (
              <Link
                key={iss.id}
                to={`/issues/${iss.id}`}
                className="rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
              >
                <div className="flex items-center justify-between text-xs text-[#9AABBB]">
                  <span>
                    {iss.category} · <span className={statusColorClass(iss.status)}>{iss.status}</span>
                  </span>
                  <span className="font-mono">{iss.trackingId}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-[#F4F8FC]">{iss.title}</h3>
                <p className="mt-1.5 text-xs text-[#9AABBB] line-clamp-2">{iss.description}</p>
                <div className="mt-3 text-xs text-[#9AABBB]">
                  {formatShortDate(iss.createdAt)} · {iss.verificationStatus}
                  {iss.isDemo ? ' · Demonstration Record' : ''}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Relevant Departments, Projects & Announcements */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Departments */}
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Responsible Departments</h2>
          <div className="mt-4 space-y-3">
            {departments.slice(0, 5).map((d) => (
              <div key={d.id} className="border-b border-[#20364A] pb-3 last:border-0 last:pb-0">
                <div className="text-sm font-semibold text-[#F4F8FC]">{d.shortName} — {d.departmentType}</div>
                <div className="mt-0.5 text-xs text-[#9AABBB]">{d.name}</div>
                <a
                  href={d.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-[#19C98A] hover:underline"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Local Announcements */}
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Local Civic Announcements</h2>
          <div className="mt-4 space-y-3">
            {location.announcements.length === 0 ? (
              <p className="text-xs text-[#9AABBB]">
                No official civic announcements indexed for {location.name} right now. Check the linked municipal
                portals for live circulars.
              </p>
            ) : (
              location.announcements.map((a) => (
                <div key={a.id} className="border-b border-[#20364A] pb-3 last:border-0 last:pb-0">
                  <div className="text-xs text-[#48E6B0]">
                    {a.dataOrigin} · {formatShortDate(a.date)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#F4F8FC]">{a.title}</div>
                  <a
                    href={a.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[#36C5D9] hover:underline"
                  >
                    <span>{a.sourceName}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Community Updates */}
        <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Community Discussions</h2>
            <Link to="/community" className="text-xs text-[#19C98A] hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {discussions.length === 0 ? (
              <p className="text-xs text-[#9AABBB]">No community discussions in this locality yet.</p>
            ) : (
              discussions.slice(0, 4).map((disc) => (
                <Link key={disc.id} to="/community" className="block border-b border-[#20364A] pb-3 last:border-0">
                  <div className="text-sm font-semibold text-[#F4F8FC] hover:text-[#19C98A]">{disc.title}</div>
                  <div className="mt-1 text-xs text-[#9AABBB]">
                    {disc.authorName} · {disc.comments.length} replies
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
