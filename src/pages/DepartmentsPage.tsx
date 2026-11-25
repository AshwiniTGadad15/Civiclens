import { useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Search } from 'lucide-react';
import { api } from '../lib/api';
import { CIVIC_CATEGORIES, formatShortDate } from '../lib/constants';
import type { DepartmentRecord } from '../types/civic';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getDepartments()
      .then((res) => setDepartments(res))
      .finally(() => setLoading(false));
  }, []);

  const states = useMemo(() => Array.from(new Set(departments.map((d) => d.state))), [departments]);
  const types = useMemo(() => Array.from(new Set(departments.map((d) => d.departmentType))), [departments]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return departments.filter((d) => {
      if (stateFilter && d.state !== stateFilter) return false;
      if (typeFilter && d.departmentType !== typeFilter) return false;
      if (categoryFilter && !d.civicCategories.includes(categoryFilter as never)) return false;
      if (!term) return true;
      return (
        d.name.toLowerCase().includes(term) ||
        d.shortName.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term) ||
        d.city.toLowerCase().includes(term) ||
        d.state.toLowerCase().includes(term)
      );
    });
  }, [departments, q, stateFilter, typeFilter, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#20364A] pb-6">
        <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Indian Government Directory</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-[#9AABBB]">
          Search municipal corporations, water supply boards, electricity utilities, pollution control boards, and
          central grievance portals. CivicLens publishes only verified official portal links — never invented phone
          numbers.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AABBB]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search BBMP, BWSSB, MCD, BMC..."
            className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] py-2.5 pl-9 pr-3 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC]"
        >
          <option value="">All States &amp; Central</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC]"
        >
          <option value="">All Authority Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC]"
        >
          <option value="">All Civic Categories</option>
          {CIVIC_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-2 h-48 animate-pulse rounded-xl border border-[#20364A] bg-[#102338]" />
        ) : filtered.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-[#20364A] bg-[#102338] p-10 text-center text-sm text-[#9AABBB]">
            No government authorities match the selected filters.
          </div>
        ) : (
          filtered.map((dept) => (
            <article key={dept.id} className="flex flex-col justify-between rounded-2xl border border-[#20364A] bg-[#102338] p-6">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#9AABBB]">
                  <span>
                    {dept.departmentType} · {dept.state}
                  </span>
                  <span className="text-[#48E6B0]">{dept.dataOrigin}</span>
                </div>

                <h2 className="mt-2 font-display text-lg font-bold text-[#F4F8FC]">{dept.name}</h2>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#9AABBB]">
                  <Building2 className="h-3.5 w-3.5 text-[#19C98A]" />
                  <span>Jurisdiction: {dept.jurisdiction}</span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#9AABBB]">{dept.description}</p>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-[#F4F8FC]">Core Responsibilities</div>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[#9AABBB]">
                    {dept.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 text-xs text-[#9AABBB]">
                  <span className="font-medium text-[#F4F8FC]">Civic Categories:</span>{' '}
                  {dept.civicCategories.join(' · ')}
                </div>
              </div>

              <div className="mt-5 border-t border-[#20364A] pt-4 text-xs">
                <div className="text-[#9AABBB]">
                  <strong className="text-[#F4F8FC]">Published Contact Guidance:</strong> {dept.publishedContact}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={dept.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#19C98A] px-3 py-1.5 font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                    >
                      <span>Official Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={dept.complaintPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 font-medium text-[#F4F8FC] hover:border-[#36C5D9]"
                    >
                      <span>Complaint Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <span className="font-mono text-[#9AABBB]">Verified {formatShortDate(dept.lastUpdatedAt)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
