import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, BookOpen, ExternalLink, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { ASSETS, formatShortDate } from '../lib/constants';
import type { KnowledgeArticle } from '../types/civic';

export function KnowledgePage() {
  const { user, updateUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(searchParams.get('article'));
  const [langTab, setLangTab] = useState<'en' | 'kn' | 'hi'>('en');
  const [readProgress, setReadProgress] = useState(0);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getKnowledgeArticles()
      .then((res) => {
        setArticles(res);
        if (!activeSlug && res.length > 0) {
          setActiveSlug(res[0].slug);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => Array.from(new Set(articles.map((a) => a.category))), [articles]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return articles.filter((a) => {
      if (category && a.category !== category) return false;
      if (!term) return true;
      return (
        a.title.toLowerCase().includes(term) ||
        a.summary.toLowerCase().includes(term) ||
        a.contentEn.toLowerCase().includes(term)
      );
    });
  }, [articles, q, category]);

  const activeArticle = articles.find((a) => a.slug === activeSlug) || filtered[0] || null;

  const handleSelectArticle = (slug: string) => {
    setActiveSlug(slug);
    setLangTab('en');
    setReadProgress(0);
    setSearchParams({ article: slug });
    if (readerRef.current) {
      readerRef.current.scrollTop = 0;
    }
  };

  const handleBookmark = async (articleId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleBookmarkArticle(articleId);
      updateUser({ ...user, bookmarkedArticleIds: res.bookmarkedArticleIds });
    } catch {
      // ignore
    }
  };

  const handleScrollReader = () => {
    const el = readerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setReadProgress(100);
      return;
    }
    setReadProgress(Math.min(100, Math.round((el.scrollTop / max) * 100)));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#20364A] pb-6">
        <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Civic Knowledge Hub</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-[#9AABBB]">
          Authoritative citizen guides on Indian municipal governance, constitutional duties, waste rules, stormwater
          systems, and official complaint workflows — with multilingual summaries.
        </p>
      </div>

      {/* Search & Category Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AABBB]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search governance guides, RTI, SWM rules, drainage..."
            className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] py-2.5 pl-9 pr-3 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-sm text-[#F4F8FC]"
        >
          <option value="">All Topics</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Article List */}
        <aside className="space-y-3 lg:col-span-4">
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl border border-[#20364A] bg-[#102338]" />
          ) : (
            filtered.map((art) => {
              const isSelected = activeArticle?.id === art.id;
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => handleSelectArticle(art.slug)}
                  className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#19C98A] bg-[#142B40]'
                      : 'border-[#20364A] bg-[#102338] hover:border-[#2e4c66]'
                  }`}
                >
                  <div className="text-[11px] text-[#9AABBB]">
                    {art.category} · <span className="font-mono">{art.readTimeMinutes} min</span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-[#F4F8FC]">{art.title}</div>
                  <p className="mt-1 text-xs text-[#9AABBB] line-clamp-2">{art.summary}</p>
                </button>
              );
            })
          )}
        </aside>

        {/* Article Reader */}
        <section className="lg:col-span-8">
          {activeArticle ? (
            <div className="overflow-hidden rounded-2xl border border-[#20364A] bg-[#102338]">
              {/* Reading progress bar */}
              <div className="h-1 w-full bg-[#07111F]">
                <div
                  className="h-full bg-[#19C98A] transition-all duration-150"
                  style={{ width: `${Math.max(8, readProgress)}%` }}
                />
              </div>

              <div
                ref={readerRef}
                onScroll={handleScrollReader}
                className="max-h-[680px] overflow-y-auto p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9AABBB]">
                  <div>
                    <span>{activeArticle.category}</span>
                    <span className="mx-1.5">·</span>
                    <span className="text-[#48E6B0]">{activeArticle.dataOrigin}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono">Updated {formatShortDate(activeArticle.lastUpdatedAt)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBookmark(activeArticle.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      user?.bookmarkedArticleIds.includes(activeArticle.id)
                        ? 'border-[#19C98A] bg-[#19C98A]/15 text-[#48E6B0]'
                        : 'border-[#20364A] bg-[#0B1929] text-[#F4F8FC]'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>
                      {user?.bookmarkedArticleIds.includes(activeArticle.id) ? 'Bookmarked' : 'Bookmark'}
                    </span>
                  </button>
                </div>

                <h2 className="mt-3 font-display text-2xl font-bold text-[#F4F8FC] sm:text-3xl">
                  {activeArticle.title}
                </h2>

                {activeArticle.imageUrl && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-[#20364A] bg-[#0B1929]">
                    <img
                      src={activeArticle.imageUrl || ASSETS.governanceStudio}
                      alt={activeArticle.title}
                      referrerPolicy="no-referrer"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                )}

                {/* Multilingual Reader Switch */}
                <div className="mt-5 flex items-center gap-2 border-b border-[#20364A] pb-3">
                  <BookOpen className="h-4 w-4 text-[#19C98A]" />
                  <span className="text-xs text-[#9AABBB] mr-2">Language:</span>
                  {[
                    { code: 'en', label: 'English (Full Guide)' },
                    { code: 'kn', label: 'ಕನ್ನಡ (Kannada Summary)' },
                    { code: 'hi', label: 'हिन्दी (Hindi Summary)' },
                  ].map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setLangTab(t.code as 'en' | 'kn' | 'hi')}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        langTab === t.code
                          ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                          : 'bg-[#0B1929] text-[#9AABBB] hover:text-[#F4F8FC]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {langTab === 'en' ? (
                  <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#F4F8FC]/90">
                    {activeArticle.contentEn.split('\n\n').map((block, idx) => {
                      if (block.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="pt-2 font-display text-lg font-bold text-[#F4F8FC]">
                            {block.replace('### ', '')}
                          </h3>
                        );
                      }
                      return (
                        <p key={idx} className="whitespace-pre-line">
                          {block}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-[#20364A] bg-[#0B1929] p-5 text-base leading-relaxed text-[#F4F8FC]">
                    {langTab === 'kn' ? activeArticle.summaryKn : activeArticle.summaryHi}
                  </div>
                )}

                {/* References */}
                {activeArticle.references.length > 0 && (
                  <div className="mt-8 border-t border-[#20364A] pt-5">
                    <h3 className="text-xs font-semibold text-[#9AABBB]">Verified Official References</h3>
                    <div className="mt-2.5 space-y-2">
                      {activeArticle.references.map((ref) => (
                        <a
                          key={ref.url}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#36C5D9] hover:underline"
                        >
                          <span>{ref.title}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#20364A] bg-[#102338] p-10 text-center text-sm text-[#9AABBB]">
              Select an article from the library to begin reading.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
