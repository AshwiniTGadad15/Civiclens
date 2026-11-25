import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layers, List, Map as MapIcon, MapPin, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_COLOR_MAP,
  CIVIC_CATEGORIES,
  ISSUE_STATUSES,
  formatShortDate,
  statusColorClass,
} from '../lib/constants';
import type { CivicIssue, LocationRecord, ProjectRecord } from '../types/civic';
import { CivicMap } from '../components/maps/CivicMap';

export function ExplorePage() {
  const { locations, setSelectedLocationSlug } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showProjects, setShowProjects] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeLoc, setActiveLoc] = useState<LocationRecord | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([77.5946, 12.9716]);
  const [mapZoom, setMapZoom] = useState(11);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getIssues(), api.getProjects()])
      .then(([iss, proj]) => {
        setIssues(iss);
        setProjects(proj);
      })
      .finally(() => setLoading(false));
  }, []);

  const states = useMemo(() => Array.from(new Set(locations.map((l) => l.state))), [locations]);

  const filteredLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((l) => {
      if (selectedState && l.state !== selectedState) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q) ||
        (l.pinCode && l.pinCode.includes(q))
      );
    });
  }, [locations, query, selectedState]);

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (selectedState && i.state !== selectedState) return false;
      if (selectedCategory && i.category !== selectedCategory) return false;
      if (selectedStatus && i.status !== selectedStatus) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.locality.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.pinCode && i.pinCode.includes(q))
      );
    });
  }, [issues, query, selectedState, selectedCategory, selectedStatus]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (selectedState && p.state !== selectedState) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q)
      );
    });
  }, [projects, query, selectedState]);

  const focusLocation = (loc: LocationRecord) => {
    setActiveLoc(loc);
    setSelectedLocationSlug(loc.slug);
    setMapCenter([loc.longitude, loc.latitude]);
    setMapZoom(loc.level === 'locality' ? 13.5 : 11);
  };

  const resetIndiaView = () => {
    setActiveLoc(null);
    setSelectedState('');
    setMapCenter([78.9629, 21.5937]);
    setMapZoom(4.5);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-medium text-[#19C98A]">Interactive Geospatial Explorer · OpenStreetMap &amp; MapLibre GL</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-[#F4F8FC]">Explore India Civic Map</h1>
          <p className="mt-1.5 text-sm text-[#9AABBB]">
            Navigate states, cities, and localities to inspect citizen-reported issues and documented development
            projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetIndiaView}
            className="rounded-lg border border-[#20364A] bg-[#102338] px-3 py-2 text-xs font-medium text-[#F4F8FC] hover:border-[#19C98A]"
          >
            All India View
          </button>
          <div className="flex items-center rounded-lg border border-[#20364A] bg-[#0B1929] p-1">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'map' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB] hover:text-[#F4F8FC]'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Map View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB] hover:text-[#F4F8FC]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AABBB]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locality, city, PIN code, or issue..."
            className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] py-2.5 pl-9 pr-3 text-sm text-[#F4F8FC] placeholder:text-[#9AABBB]/70 focus:border-[#19C98A] focus:outline-none"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          aria-label="Filter by State"
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
        >
          <option value="">All States</option>
          {states.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by Category"
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
        >
          <option value="">All Categories</option>
          {CIVIC_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by Status"
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Main Split Workspace */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Locations & Legend */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
            <div className="flex items-center justify-between border-b border-[#20364A] pb-3">
              <h2 className="text-sm font-semibold text-[#F4F8FC]">Locations ({filteredLocations.length})</h2>
              <button
                type="button"
                onClick={() => setShowProjects((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                  showProjects ? 'bg-[#142B40] text-[#36C5D9]' : 'text-[#9AABBB]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{showProjects ? 'Projects On' : 'Projects Off'}</span>
              </button>
            </div>

            <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    activeLoc?.id === loc.id
                      ? 'border-[#19C98A] bg-[#142B40]'
                      : 'border-[#20364A] bg-[#0B1929] hover:border-[#2e4c66]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => focusLocation(loc)}
                      className="text-left flex-1"
                    >
                      <div className="text-sm font-semibold text-[#F4F8FC]">{loc.name}</div>
                      <div className="text-xs text-[#9AABBB]">
                        {loc.district}, {loc.state} {loc.pinCode ? `· ${loc.pinCode}` : ''}
                      </div>
                    </button>
                    <Link
                      to={`/locality/${loc.slug}`}
                      className="text-xs font-medium text-[#19C98A] hover:underline whitespace-nowrap"
                    >
                      Dashboard →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Location Summary Card */}
          {activeLoc && (
            <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
              <div className="text-xs text-[#19C98A]">Selected Location Details</div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#F4F8FC]">
                {activeLoc.name}, {activeLoc.state}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#9AABBB]">{activeLoc.civicOverview}</p>
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/locality/${activeLoc.slug}`}
                  className="flex-1 rounded-lg bg-[#19C98A] px-3 py-2 text-center text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                >
                  Open Locality Dashboard
                </Link>
                <Link
                  to="/report"
                  className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs font-medium text-[#F4F8FC] hover:border-[#19C98A]"
                >
                  Report Here
                </Link>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-4">
            <h3 className="text-xs font-semibold text-[#F4F8FC]">Map Marker Legend</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#9AABBB]">
              {CIVIC_CATEGORIES.slice(0, 8).map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.markerColor }}
                  />
                  <span className="truncate">{c.shortLabel}</span>
                </div>
              ))}
              <div className="col-span-2 mt-1 flex items-center gap-2 border-t border-[#20364A] pt-2 text-[#36C5D9]">
                <span className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px] bg-[#36C5D9]" />
                <span>Diamond Marker: Documented Development Project</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Map or List View */}
        <div className="lg:col-span-8">
          {viewMode === 'map' ? (
            <div>
              <CivicMap
                center={mapCenter}
                zoom={mapZoom}
                issues={filteredIssues}
                projects={filteredProjects}
                showProjects={showProjects}
                heightClass="h-[580px]"
                onIssueSelect={(issue) => navigate(`/issues/${issue.id}`)}
                onProjectSelect={() => navigate('/projects')}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AABBB]">
                <span className="font-mono tabular-nums">
                  Showing {filteredIssues.length} civic issues &amp; {showProjects ? filteredProjects.length : 0} projects
                </span>
                <span>Click any marker to preview summary details · Geolocation requires explicit consent</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-8 text-center text-sm text-[#9AABBB]">
                  Loading civic map records...
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="rounded-xl border border-[#20364A] bg-[#102338] p-10 text-center">
                  <MapPin className="mx-auto h-7 w-7 text-[#9AABBB]" />
                  <p className="mt-3 text-sm text-[#F4F8FC]">No civic issues match the active filters.</p>
                  <Link
                    to="/report"
                    className="mt-4 inline-block rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F]"
                  >
                    Report First Issue Here
                  </Link>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.id}`}
                    className="block rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AABBB]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLOR_MAP[issue.category] || '#19C98A' }}
                        />
                        <span>{issue.category}</span>
                        <span>·</span>
                        <span className={statusColorClass(issue.status)}>{issue.status}</span>
                        {issue.isDemo && (
                          <>
                            <span>·</span>
                            <span className="text-[#36C5D9]">Demonstration Record</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono">{issue.trackingId}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-[#F4F8FC]">{issue.title}</h3>
                    <div className="mt-2 text-xs text-[#9AABBB]">
                      {issue.locality}, {issue.city}, {issue.state} · Reported {formatShortDate(issue.createdAt)} ·{' '}
                      <span className="font-mono">{issue.supportCount}</span> supports
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
