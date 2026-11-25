import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, CheckCircle2, Clock, Info, MapPin, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { formatShortDate, statusColorClass } from '../lib/constants';
import type { CivicIssue } from '../types/civic';
import { CivicMap } from '../components/maps/CivicMap';

export function IssueDetailPage() {
  const { id = '' } = useParams();
  const { user, updateUser } = useApp();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<CivicIssue | null>(null);
  const [related, setRelated] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getIssueDetail(id)
      .then((res) => {
        setIssue(res.issue);
        setRelated(res.related);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Issue not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSupport = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!issue) return;
    try {
      const res = await api.toggleSupportIssue(issue.id);
      setIssue({
        ...issue,
        supportCount: res.supportCount,
        supportedByUserIds: res.supported
          ? [...issue.supportedByUserIds, user.id]
          : issue.supportedByUserIds.filter((uid) => uid !== user.id),
      });
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!issue) return;
    try {
      const res = await api.toggleSaveIssue(issue.id);
      updateUser({ ...user, savedIssueIds: res.savedIssueIds });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-2xl border border-[#20364A] bg-[#102338]" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F4F8FC]">Civic Issue Not Found</h1>
        <p className="mt-2 text-sm text-[#9AABBB]">{error}</p>
        <Link to="/issues" className="mt-5 inline-block text-sm font-semibold text-[#19C98A]">
          ← Return to Civic Issues
        </Link>
      </div>
    );
  }

  const isSupported = Boolean(user && issue.supportedByUserIds.includes(user.id));
  const isSaved = Boolean(user && user.savedIssueIds.includes(issue.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/issues" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9AABBB] hover:text-[#F4F8FC]">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Civic Issues</span>
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-12">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AABBB]">
              <div>
                <span>{issue.category}</span>
                <span className="mx-1.5">·</span>
                <span className={`font-semibold ${statusColorClass(issue.status)}`}>{issue.status}</span>
                <span className="mx-1.5">·</span>
                <span>{issue.dataOrigin}</span>
                {issue.isDemo && (
                  <>
                    <span className="mx-1.5">·</span>
                    <span className="text-[#36C5D9]">Demonstration Record</span>
                  </>
                )}
              </div>
              <span className="font-mono font-semibold text-[#F4F8FC]">{issue.trackingId}</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-[#F4F8FC] sm:text-3xl">{issue.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#9AABBB]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#19C98A]" />
                {issue.locality}, {issue.city}, {issue.state} {issue.pinCode ? `(${issue.pinCode})` : ''}
              </span>
              <span>Observed: {formatShortDate(issue.observedDate)}</span>
              <span>Severity: {issue.severity}</span>
              <span>Verification: {issue.verificationStatus}</span>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-[#F4F8FC]/90">{issue.description}</p>

            {issue.additionalNotes && (
              <div className="mt-4 rounded-lg border border-[#20364A] bg-[#0B1929] p-3.5 text-xs text-[#9AABBB]">
                <strong className="text-[#F4F8FC]">Additional Citizen Context:</strong> {issue.additionalNotes}
              </div>
            )}

            {/* Evidence Gallery */}
            {issue.media.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold text-[#F4F8FC]">Uploaded Photographic Evidence</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {issue.media.map((m) => (
                    <figure key={m.id} className="overflow-hidden rounded-xl border border-[#20364A] bg-[#0B1929]">
                      <img
                        src={m.url}
                        alt={m.caption || issue.title}
                        referrerPolicy="no-referrer"
                        className="h-48 w-full object-cover"
                      />
                      {m.caption && <figcaption className="p-2.5 text-xs text-[#9AABBB]">{m.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#20364A] pt-5">
              <button
                type="button"
                onClick={handleSupport}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  isSupported
                    ? 'border-[#19C98A] bg-[#19C98A]/15 text-[#48E6B0]'
                    : 'border-[#20364A] bg-[#0B1929] text-[#F4F8FC] hover:border-[#19C98A]'
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>Support Issue</span>
                <span className="font-mono tabular-nums">({issue.supportCount})</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  isSaved
                    ? 'border-[#36C5D9] bg-[#36C5D9]/15 text-[#36C5D9]'
                    : 'border-[#20364A] bg-[#0B1929] text-[#F4F8FC] hover:border-[#36C5D9]'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{isSaved ? 'Saved to Dashboard' : 'Save Issue'}</span>
              </button>

              <Link
                to={`/assistant?q=${encodeURIComponent(`How should citizens handle "${issue.title}" in ${issue.locality}, ${issue.city}?`)}`}
                className="rounded-lg border border-[#20364A] bg-[#0B1929] px-4 py-2 text-xs font-medium text-[#36C5D9] hover:border-[#36C5D9]"
              >
                Ask CivicLens AI About This
              </Link>
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-6">
            <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Status &amp; Verification Timeline</h2>
            <p className="mt-1 text-xs text-[#9AABBB]">
              CivicLens tracks community verification and status notes transparently. An official government ticket is
              only confirmed when an authorized portal reference is recorded.
            </p>

            <div className="mt-5 space-y-4">
              {issue.updates.length === 0 ? (
                <div className="text-xs text-[#9AABBB]">Initial submission logged on {formatShortDate(issue.createdAt)}.</div>
              ) : (
                issue.updates.map((u) => (
                  <div key={u.id} className="flex gap-3 border-b border-[#20364A] pb-4 last:border-0 last:pb-0">
                    <div className="mt-0.5 shrink-0 text-[#19C98A]">
                      {u.status === 'Verified' || u.status === 'Resolved' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4 text-[#36C5D9]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-[#9AABBB]">
                        <span className={`font-semibold ${statusColorClass(u.status)}`}>{u.status}</span>
                        <span className="mx-1.5">·</span>
                        <span>{u.updatedByName}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{formatShortDate(u.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#F4F8FC]/90">{u.note}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6 lg:col-span-4">
          <CivicMap
            center={[issue.longitude, issue.latitude]}
            zoom={14}
            issues={[issue]}
            showProjects={false}
            heightClass="h-60"
          />

          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
            <h3 className="text-sm font-semibold text-[#F4F8FC]">Likely Responsible Authority</h3>
            <p className="mt-1.5 text-sm text-[#48E6B0]">
              {issue.responsibleDepartmentName || 'Local Municipal Corporation / Urban Local Body'}
            </p>
            {issue.officialReference && (
              <div className="mt-2 font-mono text-xs text-[#F4F8FC]">
                Official Reference: {issue.officialReference}
              </div>
            )}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#20364A] bg-[#0B1929] p-3 text-xs text-[#9AABBB]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#36C5D9]" />
              <span>
                Reporting on CivicLens creates a public tracking record, not an automatic filing with government
                servers. Visit the Government Directory to file an official municipal docket.
              </span>
            </div>
            <Link
              to="/departments"
              className="mt-3 inline-block text-xs font-semibold text-[#19C98A] hover:underline"
            >
              Open Government Directory →
            </Link>
          </div>

          {related.length > 0 && (
            <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
              <h3 className="text-sm font-semibold text-[#F4F8FC]">Related Nearby Issues</h3>
              <div className="mt-3 space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/issues/${r.id}`}
                    className="block border-b border-[#20364A] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="text-xs font-medium text-[#F4F8FC] hover:text-[#19C98A]">{r.title}</div>
                    <div className="mt-1 text-[11px] text-[#9AABBB]">
                      {r.locality} · {r.status}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
