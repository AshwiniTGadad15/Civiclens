import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';
import { CATEGORY_COLOR_MAP, CIVIC_CATEGORIES, ISSUE_STATUSES, formatShortDate, statusColorClass } from '../lib/constants';
import type { CivicIssue } from '../types/civic';

export function IssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [showDemo, setShowDemo] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getIssues({ includeDemo: showDemo })
      .then((res) => setIssues(res))
      .finally(() => setLoading(false));
  }, [showDemo]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return issues.filter((i) => {
      if (category && i.category !== category) return false;
      if (status && i.status !== status) return false;
      if (!term) return true;
      return (
        i.title.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        i.trackingId.toLowerCase().includes(term) ||
        i.locality.toLowerCase().includes(term) ||
        i.city.toLowerCase().includes(term)
      );
    });
  }, [issues, q, category, status]);

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const next = new URLSearchParams(searchParams);
    if (val) next.set('category', val);
    else next.delete('category');
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Civic Issues Tracker</h1>
          <p className="mt-1.5 text-sm text-[#9AABBB]">
            Inspect reported civic problems, track verification milestones, or search by unique Tracking ID.
          </p>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#19C98A] px-4 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Report Civic Problem</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AABBB]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Tracking ID (e.g. CL-BLR-DEMO-001), locality, or keyword..."
            className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] py-2.5 pl-9 pr-3 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC] md:col-span-3"
        >
          <option value="">All Categories</option>
          {CIVIC_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC] md:col-span-2"
        >
          <option value="">All Statuses</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#9AABBB] md:col-span-2">
          <input
            type="checkbox"
            checked={showDemo}
            onChange={(e) => setShowDemo(e.target.checked)}
            className="accent-[#19C98A]"
          />
          <span>Show Demo Data</span>
        </label>
      </div>

      {/* Results */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-28 animate-pulse rounded-xl border border-[#20364A] bg-[#102338]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-10 text-center">
            <p className="text-sm text-[#F4F8FC]">No civic issues found for this filter.</p>
            <p className="mt-1 text-xs text-[#9AABBB]">
              Try clearing your filters or submit a new geo-tagged report for your locality.
            </p>
          </div>
        ) : (
          filtered.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues/${issue.id}`}
              className="block rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AABBB]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR_MAP[issue.category] || '#19C98A' }}
                  />
                  <span>{issue.category}</span>
                  <span>·</span>
                  <span className={`font-medium ${statusColorClass(issue.status)}`}>{issue.status}</span>
                  <span>·</span>
                  <span>{issue.dataOrigin}</span>
                  {issue.isDemo && (
                    <>
                      <span>·</span>
                      <span className="text-[#36C5D9]">Demonstration Data</span>
                    </>
                  )}
                </div>
                <span className="font-mono text-[#F4F8FC]">{issue.trackingId}</span>
              </div>

              <h2 className="mt-2 font-display text-lg font-bold text-[#F4F8FC]">{issue.title}</h2>
              <p className="mt-1 text-sm text-[#9AABBB] line-clamp-2">{issue.description}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#20364A] pt-3 text-xs text-[#9AABBB]">
                <div>
                  {issue.locality}, {issue.city}, {issue.state} · Observed {formatShortDate(issue.observedDate)}
                </div>
                <div className="flex items-center gap-4 font-mono tabular-nums">
                  <span>Severity: {issue.severity}</span>
                  <span className="inline-flex items-center gap-1 text-[#F4F8FC]">
                    <ThumbsUp className="h-3.5 w-3.5 text-[#19C98A]" />
                    {issue.supportCount}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
