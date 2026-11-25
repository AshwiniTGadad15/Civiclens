import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flag, MessageSquare, Plus, ShieldCheck, ThumbsUp, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { CIVIC_CATEGORIES, formatShortDate } from '../lib/constants';
import type { CivicCategory, DiscussionRecord } from '../types/civic';

export function CommunityPage() {
  const { user, locations, selectedLocation } = useApp();
  const navigate = useNavigate();

  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'latest' | 'trending'>('trending');
  const [category, setCategory] = useState('');
  const [localityFilter, setLocalityFilter] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [flagMessage, setFlagMessage] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState<CivicCategory>('Roads and Infrastructure');
  const [newLocationSlug, setNewLocationSlug] = useState(selectedLocation?.slug || 'indiranagar-bengaluru');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadDiscussions = () => {
    setLoading(true);
    api
      .getDiscussions({ sort, category: category || undefined, locality: localityFilter || undefined })
      .then((res) => setDiscussions(res))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDiscussions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, category, localityFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setCreateError(null);
    const loc = locations.find((l) => l.slug === newLocationSlug) || locations[0];
    try {
      const created = await api.createDiscussion({
        title: newTitle.trim(),
        body: newBody.trim(),
        category: newCategory,
        locationSlug: loc?.slug || 'bengaluru',
        localityName: loc?.name || 'Bengaluru',
        city: loc?.city || 'Bengaluru',
      });
      setDiscussions((prev) => [created, ...prev]);
      setNewTitle('');
      setNewBody('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to post discussion');
    }
  };

  const handleSupport = async (discId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleSupportDiscussion(discId);
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discId
            ? {
                ...d,
                supportCount: res.supportCount,
                supportedByUserIds: res.supported
                  ? [...d.supportedByUserIds, user.id]
                  : d.supportedByUserIds.filter((uid) => uid !== user.id),
              }
            : d
        )
      );
    } catch {
      // ignore
    }
  };

  const handleComment = async (discId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (commentDraft.trim().length < 3) return;
    try {
      const added = await api.addComment(discId, commentDraft.trim());
      setDiscussions((prev) =>
        prev.map((d) => (d.id === discId ? { ...d, comments: [...d.comments, added] } : d))
      );
      setCommentDraft('');
    } catch {
      // ignore
    }
  };

  const handleFlag = async (discId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.flagDiscussion(discId);
      setFlagMessage('Discussion flagged for community moderator review.');
      setTimeout(() => setFlagMessage(null), 3500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Civic Community</h1>
          <p className="mt-1.5 text-sm text-[#9AABBB]">
            Constructive, neighborhood-level civic discussions, ward updates, and collaborative problem solving.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (user ? setShowCreate(true) : navigate('/login'))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#19C98A] px-4 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Start Discussion</span>
        </button>
      </div>

      {flagMessage && (
        <div className="mt-4 rounded-xl border border-[#36C5D9]/40 bg-[#36C5D9]/10 px-4 py-3 text-xs text-[#36C5D9]">
          {flagMessage}
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-[#20364A] bg-[#0B1929] p-1">
          <button
            type="button"
            onClick={() => setSort('trending')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              sort === 'trending' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB]'
            }`}
          >
            Trending
          </button>
          <button
            type="button"
            onClick={() => setSort('latest')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              sort === 'latest' ? 'bg-[#19C98A] text-[#07111F] font-semibold' : 'text-[#9AABBB]'
            }`}
          >
            Latest
          </button>
        </div>

        <select
          value={localityFilter}
          onChange={(e) => setLocalityFilter(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
        >
          <option value="">All Localities</option>
          {locations.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}, {l.state}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
        >
          <option value="">All Civic Categories</option>
          {CIVIC_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content + Guidelines */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl border border-[#20364A] bg-[#102338]" />
          ) : discussions.length === 0 ? (
            <div className="rounded-xl border border-[#20364A] bg-[#102338] p-10 text-center text-sm text-[#9AABBB]">
              No discussions match this filter yet. Start a constructive thread for your neighborhood.
            </div>
          ) : (
            discussions.map((disc) => {
              const isExpanded = expandedId === disc.id;
              const isSupported = Boolean(user && disc.supportedByUserIds.includes(user.id));
              return (
                <article key={disc.id} className="rounded-2xl border border-[#20364A] bg-[#102338] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AABBB]">
                    <div>
                      <Link to={`/locality/${disc.locationSlug}`} className="text-[#19C98A] hover:underline">
                        {disc.localityName}, {disc.city}
                      </Link>
                      <span className="mx-1.5">·</span>
                      <span>{disc.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>{disc.authorName}</span>
                      {disc.isDemo && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[#36C5D9]">Demonstration Record</span>
                        </>
                      )}
                    </div>
                    <span className="font-mono">{formatShortDate(disc.createdAt)}</span>
                  </div>

                  <h2 className="mt-2 font-display text-lg font-bold text-[#F4F8FC]">{disc.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#F4F8FC]/90">{disc.body}</p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#20364A] pt-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSupport(disc.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          isSupported
                            ? 'border-[#19C98A] bg-[#19C98A]/15 text-[#48E6B0]'
                            : 'border-[#20364A] bg-[#0B1929] text-[#F4F8FC]'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums">{disc.supportCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : disc.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 text-xs font-medium text-[#F4F8FC] hover:border-[#19C98A]"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#36C5D9]" />
                        <span className="font-mono tabular-nums">{disc.comments.length} Replies</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFlag(disc.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#9AABBB] hover:text-[#FB7185]"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span>Report</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-[#20364A] pt-4">
                      {disc.comments.map((c) => (
                        <div key={c.id} className="rounded-lg border border-[#20364A] bg-[#0B1929] p-3 text-xs">
                          <div className="flex justify-between text-[#9AABBB]">
                            <span className="font-semibold text-[#F4F8FC]">{c.authorName}</span>
                            <span className="font-mono">{formatShortDate(c.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 text-[#F4F8FC]/90">{c.body}</p>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder={user ? 'Add a constructive comment...' : 'Sign in to join this discussion'}
                          className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleComment(disc.id)}
                          className="rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] whitespace-nowrap"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Community Guidelines */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F8FC]">
              <ShieldCheck className="h-4 w-4 text-[#19C98A]" />
              <span>Civic Community Guidelines</span>
            </div>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-[#9AABBB]">
              <li>Keep discussions focused on verifiable civic infrastructure, ward services, and constructive solutions.</li>
              <li>Do not share personal phone numbers, residential door numbers, or private citizen identities.</li>
              <li>Avoid unverified rumors, partisan hate speech, or abusive language.</li>
              <li>Flag spam or misleading posts so CivicLens moderators can review and log actions transparently.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Create Discussion Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#20364A] bg-[#102338] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#20364A] pb-3">
              <h2 className="font-display text-lg font-bold text-[#F4F8FC]">Start a Civic Discussion</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[#9AABBB] hover:text-[#F4F8FC]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Topic Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Safe pedestrian crossings near school zone"
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[#9AABBB] mb-1">Locality</label>
                  <select
                    value={newLocationSlug}
                    onChange={(e) => setNewLocationSlug(e.target.value)}
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
                  <label className="block text-xs text-[#9AABBB] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CivicCategory)}
                    className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                  >
                    {CIVIC_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Details *</label>
                <textarea
                  rows={4}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Share context, observations, and constructive questions for neighbors..."
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>

              {createError && <p className="text-xs text-[#FB7185]">{createError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-[#20364A] bg-[#0B1929] px-4 py-2 text-xs text-[#9AABBB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#19C98A] px-5 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                >
                  Publish Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
