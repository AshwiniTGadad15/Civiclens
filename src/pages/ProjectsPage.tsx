import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, LayoutGrid, Map as MapIcon, Search } from 'lucide-react';
import { api } from '../lib/api';
import { ASSETS, PROJECT_STATUSES, formatShortDate, statusColorClass } from '../lib/constants';
import type { ProjectRecord } from '../types/civic';
import { CivicMap } from '../components/maps/CivicMap';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');

  useEffect(() => {
    setLoading(true);
    api
      .getProjects()
      .then((res) => setProjects(res))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (status && p.status !== status) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.city.toLowerCase().includes(term) ||
        p.locality.toLowerCase().includes(term) ||
        p.departmentName.toLowerCase().includes(term)
      );
    });
  }, [projects, q, status]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Development Project Tracker</h1>
          <p className="mt-1.5 text-sm text-[#9AABBB]">
            Public urban infrastructure works documented with responsible departments, published DPR references, and
            official government source links.
          </p>
        </div>

        <div className="flex items-center rounded-lg border border-[#20364A] bg-[#0B1929] p-1 self-start">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              viewMode === 'cards' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Card View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              viewMode === 'map' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB]'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AABBB]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects by name, city, corridor, or department..."
            className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] py-2.5 pl-9 pr-3 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatus('')}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              status === ''
                ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                : 'border border-[#20364A] bg-[#102338] text-[#9AABBB]'
            }`}
          >
            All ({projects.length})
          </button>
          {PROJECT_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                status === st
                  ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                  : 'border border-[#20364A] bg-[#102338] text-[#9AABBB]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {[1, 2].map((k) => (
            <div key={k} className="h-72 animate-pulse rounded-xl border border-[#20364A] bg-[#102338]" />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div className="mt-6">
          <CivicMap
            center={[77.5946, 12.9716]}
            zoom={5.3}
            issues={[]}
            projects={filtered}
            showProjects
            heightClass="h-[560px]"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {filtered.map((proj) => (
            <article
              key={proj.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#20364A] bg-[#102338]"
            >
              <div className="h-48 w-full bg-[#142B40]">
                <img
                  src={proj.imageUrl || ASSETS.metroCorridor}
                  alt={proj.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="text-xs text-[#9AABBB]">
                    <span>{proj.locality}, {proj.city}</span>
                    <span className="mx-1.5">·</span>
                    <span className={`font-semibold ${statusColorClass(proj.status)}`}>{proj.status}</span>
                    <span className="mx-1.5">·</span>
                    <span>{proj.dataOrigin}</span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold text-[#F4F8FC]">{proj.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#9AABBB]">{proj.description}</p>

                  <dl className="mt-4 grid gap-3 border-t border-[#20364A] pt-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-[#9AABBB]">Responsible Department</dt>
                      <dd className="mt-0.5 font-medium text-[#F4F8FC]">{proj.departmentName}</dd>
                    </div>
                    <div>
                      <dt className="text-[#9AABBB]">Published Budget Reference</dt>
                      <dd className="mt-0.5 font-medium text-[#F4F8FC]">{proj.publishedBudget}</dd>
                    </div>
                    <div>
                      <dt className="text-[#9AABBB]">Start Date</dt>
                      <dd className="mt-0.5 font-mono text-[#F4F8FC]">{formatShortDate(proj.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#9AABBB]">Expected Completion</dt>
                      <dd className="mt-0.5 text-[#F4F8FC]">{proj.expectedCompletion}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 border-t border-[#20364A] pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9AABBB]">Documented Progress</span>
                    <span className="font-mono font-semibold text-[#19C98A] tabular-nums">{proj.progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#07111F]">
                    <div className="h-full rounded-full bg-[#19C98A]" style={{ width: `${proj.progressPercent}%` }} />
                  </div>

                  {proj.updates.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[#20364A] bg-[#0B1929] p-3 text-xs text-[#9AABBB]">
                      <strong className="text-[#F4F8FC]">Latest Update ({formatShortDate(proj.updates[0].date)}):</strong>{' '}
                      {proj.updates[0].summary}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <a
                      href={proj.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#36C5D9] hover:underline"
                    >
                      <span>Official Source: {proj.sourceName}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <span className="font-mono text-[#9AABBB]">Updated {formatShortDate(proj.lastUpdatedAt)}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
