import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Building2,
  Compass,
  ExternalLink,
  MapPin,
  MessageSquare,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { ASSETS, CIVIC_CATEGORIES, SAMPLE_AI_QUESTIONS, formatShortDate, statusColorClass } from '../lib/constants';
import type { DiscussionRecord, KnowledgeArticle, ProjectRecord } from '../types/civic';
import { SmartCityCanvas } from '../components/three/SmartCityCanvas';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { CategoryIcon } from '../components/ui/CategoryIcon';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Discover',
    desc: 'Search any Indian state, city, ward, or PIN code to inspect local civic issues, infrastructure projects, and coverage.',
  },
  {
    step: '02',
    title: 'Understand',
    desc: 'Use CivicLens AI and the Knowledge Hub to learn which municipal or utility department holds legal jurisdiction.',
  },
  {
    step: '03',
    title: 'Report',
    desc: 'Submit geo-tagged civic problems with photographic evidence and receive a unique CivicLens tracking ID.',
  },
  {
    step: '04',
    title: 'Track',
    desc: 'Follow verification stages, status history timelines, and linked public development works transparently.',
  },
  {
    step: '05',
    title: 'Improve',
    desc: 'Collaborate constructively with neighbors and use verified department portals to drive civic accountability.',
  },
];

export function HomePage() {
  const { stats, locations, selectedLocation, setSelectedLocationSlug } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [activeState, setActiveState] = useState<string>('Karnataka');
  const [aiPreviewInput, setAiPreviewInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getProjects().catch(() => []),
      api.getDiscussions({ sort: 'trending' }).catch(() => []),
      api.getKnowledgeArticles().catch(() => []),
    ]).then(([p, d, a]) => {
      setProjects(p.slice(0, 3));
      setDiscussions(d.slice(0, 3));
      setArticles(a.slice(0, 3));
    });
  }, []);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return locations
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.state.toLowerCase().includes(q) ||
          (l.pinCode && l.pinCode.includes(q))
      )
      .slice(0, 6);
  }, [locations, searchQuery]);

  const statesList = useMemo(() => {
    return Array.from(new Set(locations.map((l) => l.state)));
  }, [locations]);

  const locationsInState = useMemo(() => {
    return locations.filter((l) => l.state === activeState);
  }, [locations, activeState]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMatches.length > 0) {
      setSelectedLocationSlug(searchMatches[0].slug);
      navigate(`/locality/${searchMatches[0].slug}`);
    } else if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/locality/${selectedLocation?.slug ?? 'bengaluru'}`);
    }
  };

  const handleAskPreview = (questionText: string) => {
    const q = questionText.trim();
    if (!q) {
      navigate('/assistant');
      return;
    }
    navigate(`/assistant?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="bg-[#07111F] text-[#F4F8FC]">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#20364A]">
        {/* Ambient radial emerald glow behind hero */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 72% 35%, rgba(25,201,138,0.12), transparent 65%), radial-gradient(ellipse 50% 45% at 15% 80%, rgba(54,197,217,0.08), transparent 60%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-stretch gap-10 lg:grid-cols-12">
            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col justify-center lg:col-span-6"
            >
              <div className="text-xs font-medium text-[#19C98A] tracking-wide">
                Bengaluru Pilot Active · Architecture Built for All India
              </div>

              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#F4F8FC] sm:text-5xl lg:text-[3.4rem]">
                Understand Your City. Shape Its Future.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#9AABBB] sm:text-lg">
                Discover what&apos;s happening around you. Explore local civic problems, understand public
                infrastructure, access official government directories, and become part of the change.
              </p>

              {/* Location Search Bar */}
              <form onSubmit={handleHeroSearch} className="relative mt-8 max-w-xl">
                <div className="flex items-center rounded-xl border border-[#20364A] bg-[#0B1929] p-1.5 shadow-xl focus-within:border-[#19C98A]">
                  <Search className="ml-3 h-4 w-4 shrink-0 text-[#9AABBB]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search State, District, City, Locality, or PIN code (e.g. Indiranagar, 560038)"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[#F4F8FC] placeholder:text-[#9AABBB]/75 focus:outline-none"
                    aria-label="Search Indian locality, city, or PIN code"
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap shrink-0 rounded-lg bg-[#19C98A] px-4 py-2.5 text-xs font-semibold text-[#07111F] transition-colors hover:bg-[#48E6B0]"
                  >
                    Explore Your Locality
                  </button>
                </div>

                {searchMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-[#20364A] bg-[#102338] p-1.5 shadow-2xl">
                    {searchMatches.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocationSlug(loc.slug);
                          navigate(`/locality/${loc.slug}`);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[#142B40]"
                      >
                        <span className="font-medium text-[#F4F8FC]">
                          {loc.name}, {loc.city}
                        </span>
                        <span className="font-mono text-xs text-[#9AABBB]">
                          {loc.state} {loc.pinCode ? `· ${loc.pinCode}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {/* Secondary Navigation Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#20364A] bg-[#102338] px-4 py-2.5 text-xs font-semibold text-[#F4F8FC] transition-colors hover:border-[#19C98A]"
                >
                  <Compass className="h-4 w-4 text-[#19C98A]" />
                  <span>Explore Civic Map</span>
                </Link>
                <Link
                  to="/assistant"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#20364A] bg-[#0B1929] px-4 py-2.5 text-xs font-semibold text-[#F4F8FC] transition-colors hover:border-[#36C5D9]"
                >
                  <Bot className="h-4 w-4 text-[#36C5D9]" />
                  <span>Ask CivicLens AI</span>
                </Link>
              </div>
            </motion.div>

            {/* Right Interactive 3D Smart City + Bengaluru Aerial Composite */}
            <div className="flex flex-col gap-4 lg:col-span-6">
              <div className="relative h-[340px] sm:h-[400px] lg:h-full lg:min-h-[420px] overflow-hidden rounded-2xl border border-[#20364A] bg-[#0B1929]">
                <SmartCityCanvas className="h-full w-full" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/70 to-transparent p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-[#48E6B0]">
                        3D Urban Intelligence Model · Bengaluru Pilot
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#F4F8FC]">
                        Real-time civic layers across wards, transit corridors, and public infrastructure
                      </div>
                    </div>
                    <Link
                      to="/explore"
                      className="pointer-events-auto whitespace-nowrap shrink-0 text-xs font-semibold text-[#19C98A] hover:text-[#48E6B0]"
                    >
                      Open Live Map →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE DATABASE CIVIC STATISTICS STRIP */}
          <div className="mt-12 rounded-2xl border border-[#20364A] bg-[#0B1929] p-6">
            <div className="flex flex-col justify-between gap-2 border-b border-[#20364A] pb-4 sm:flex-row sm:items-center">
              <h2 className="text-sm font-semibold text-[#F4F8FC]">CivicLens Platform Activity</h2>
              <p className="text-xs text-[#9AABBB]">
                Live database counts · Includes{' '}
                <span className="font-mono text-[#F4F8FC]">{stats?.demoReports ?? 6}</span> clearly labeled
                demonstration pilot records and{' '}
                <span className="font-mono text-[#48E6B0]">{stats?.liveCitizenReports ?? 0}</span> citizen submissions
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-6 lg:grid-cols-4">
              <div>
                <div className="text-xs text-[#9AABBB]">Total Civic Reports</div>
                <div className="mt-1.5 text-3xl font-bold text-[#F4F8FC]">
                  <AnimatedCounter value={stats?.totalReports ?? 0} />
                </div>
                <div className="mt-1 text-xs text-[#9AABBB]">
                  {stats?.demoReports ?? 0} demonstration · {stats?.liveCitizenReports ?? 0} citizen-submitted
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9AABBB]">Verified Issues</div>
                <div className="mt-1.5 text-3xl font-bold text-[#19C98A]">
                  <AnimatedCounter value={stats?.verifiedIssues ?? 0} />
                </div>
                <div className="mt-1 text-xs text-[#9AABBB]">Reviewed against ward jurisdiction</div>
              </div>
              <div>
                <div className="text-xs text-[#9AABBB]">Resolved Issues</div>
                <div className="mt-1.5 text-3xl font-bold text-[#48E6B0]">
                  <AnimatedCounter value={stats?.resolvedIssues ?? 0} />
                </div>
                <div className="mt-1 text-xs text-[#9AABBB]">Tracked with citizen updates</div>
              </div>
              <div>
                <div className="text-xs text-[#9AABBB]">Active Development Projects</div>
                <div className="mt-1.5 text-3xl font-bold text-[#36C5D9]">
                  <AnimatedCounter value={stats?.activeProjects ?? 0} />
                </div>
                <div className="mt-1 text-xs text-[#9AABBB]">Linked to official DPR portals</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE INDIA INTERACTIVE GEOGRAPHY SECTION */}
      <section className="border-b border-[#20364A] bg-[#0B1929]/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-medium text-[#19C98A]">National Architecture · Pilot in Karnataka</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F8FC]">
                Explore India by State, City &amp; Locality
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#9AABBB]">
                Browse municipal corporations, wards, and localities with transparent coverage indicators.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#19C98A] hover:text-[#48E6B0] whitespace-nowrap"
            >
              <span>Launch Interactive India Map</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* State filter buttons */}
          <div className="mt-7 flex flex-wrap gap-2">
            {statesList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setActiveState(st)}
                className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeState === st
                    ? 'bg-[#19C98A] text-[#07111F] font-semibold'
                    : 'border border-[#20364A] bg-[#102338] text-[#9AABBB] hover:text-[#F4F8FC]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {locationsInState.map((loc) => (
                <Link
                  key={loc.id}
                  to={`/locality/${loc.slug}`}
                  onClick={() => setSelectedLocationSlug(loc.slug)}
                  className="group rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
                >
                  <div className="flex items-center justify-between text-xs text-[#9AABBB]">
                    <span>
                      {loc.district} · {loc.level === 'locality' ? 'Locality' : 'Metropolitan City'}
                    </span>
                    <span className={loc.dataCoverage === 'pilot_active' ? 'text-[#48E6B0]' : 'text-[#36C5D9]'}>
                      {loc.dataCoverage === 'pilot_active'
                        ? 'Pilot Active'
                        : loc.dataCoverage === 'partial'
                          ? 'Partial Data'
                          : 'Directory Only'}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-[#F4F8FC] group-hover:text-[#19C98A] transition-colors">
                    {loc.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#9AABBB] line-clamp-2">{loc.civicOverview}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#9AABBB]">
                    <span className="font-mono">{loc.pinCode ? `PIN ${loc.pinCode}` : loc.state}</span>
                    <span className="font-medium text-[#19C98A]">Open Dashboard →</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#20364A] bg-[#102338] lg:col-span-5">
              <img
                src={ASSETS.heroAerial}
                alt="Aerial twilight view of Bengaluru urban skyline and metro transit corridor"
                referrerPolicy="no-referrer"
                className="h-full min-h-[280px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="text-xs font-medium text-[#48E6B0]">Bengaluru, Karnataka · Flagship Pilot</div>
                <h3 className="mt-1.5 font-display text-xl font-bold text-[#F4F8FC]">
                  243 Wards · Multi-Agency Civic Mapping
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#F4F8FC]/85">
                  Combining BBMP ward governance, BWSSB water networks, BESCOM electricity jurisdictions, and BMRCL
                  metro corridors into one transparent map.
                </p>
                <Link
                  to="/locality/bengaluru"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Inspect Bengaluru Intelligence</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 CIVIC CATEGORIES */}
      <section className="border-b border-[#20364A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#F4F8FC]">
              Ten Core Civic Problem Domains
            </h2>
            <p className="mt-2 text-sm text-[#9AABBB]">
              Select any urban infrastructure domain to inspect reported issues, responsible authorities, and citizen
              guidance.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CIVIC_CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={`/issues?category=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col justify-between rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: cat.markerColor }}>
                      <CategoryIcon iconKey={cat.iconKey} className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#9AABBB] transition-transform group-hover:translate-x-0.5 group-hover:text-[#19C98A]" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[#F4F8FC]">{cat.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#9AABBB]">{cat.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW CIVICLENS WORKS (5 STEPS) */}
      <section className="border-b border-[#20364A] bg-[#0B1929]/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#F4F8FC]">How CivicLens Works</h2>
          <p className="mt-2 text-sm text-[#9AABBB]">
            From local awareness to verifiable public accountability in five transparent stages.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-5">
            {WORKFLOW_STEPS.map((item) => (
              <div key={item.step} className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
                <div className="font-mono text-xs font-semibold text-[#19C98A]">{item.step}</div>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F4F8FC]">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9AABBB]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI ASSISTANT INTRODUCTION */}
      <section className="border-b border-[#20364A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="text-xs font-medium text-[#36C5D9]">
                Multilingual Civic Assistant · English, ಕನ್ನಡ, हिन्दी, தமிழ், తెలుగు &amp; more
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F4F8FC] sm:text-4xl">
                Meet Your Intelligent Civic Assistant.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[#9AABBB]">
                Get simple, understandable explanations about the civic problems affecting your community — complete
                with likely causes, responsible government departments, next steps, and verified official portal links.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskPreview(aiPreviewInput);
                }}
                className="mt-6 flex items-center gap-2 rounded-xl border border-[#20364A] bg-[#0B1929] p-1.5 focus-within:border-[#36C5D9]"
              >
                <input
                  type="text"
                  value={aiPreviewInput}
                  onChange={(e) => setAiPreviewInput(e.target.value)}
                  placeholder="Ask CivicLens AI anything about your city..."
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-[#F4F8FC] placeholder:text-[#9AABBB]/75 focus:outline-none"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 rounded-lg bg-[#19C98A] px-4 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
                >
                  Ask CivicLens AI
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-[#20364A] bg-[#102338] p-6 lg:col-span-6">
              <div className="text-xs font-medium text-[#9AABBB]">Try an example civic question</div>
              <div className="mt-4 divide-y divide-[#20364A]">
                {SAMPLE_AI_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAskPreview(q)}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm text-[#F4F8FC] transition-colors hover:text-[#19C98A]"
                  >
                    <span>{q}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#9AABBB]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED DEVELOPMENT PROJECTS */}
      <section className="border-b border-[#20364A] bg-[#0B1929]/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#F4F8FC]">
                Documented Public Infrastructure Projects
              </h2>
              <p className="mt-2 text-sm text-[#9AABBB]">
                Track ongoing urban transit, water, stormwater, and lake rejuvenation projects with official portal
                sources.
              </p>
            </div>
            <Link to="/projects" className="text-sm font-semibold text-[#19C98A] hover:text-[#48E6B0]">
              View All Projects →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#20364A] bg-[#102338]"
              >
                <div className="relative h-44 w-full bg-[#142B40]">
                  <img
                    src={proj.imageUrl || ASSETS.metroCorridor}
                    alt={proj.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="text-xs text-[#9AABBB]">
                      <span>{proj.city}</span>
                      <span className="mx-1.5">·</span>
                      <span className={statusColorClass(proj.status)}>{proj.status}</span>
                      <span className="mx-1.5">·</span>
                      <span>{proj.dataOrigin}</span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold leading-snug text-[#F4F8FC]">{proj.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#9AABBB] line-clamp-3">{proj.description}</p>
                  </div>

                  <div className="mt-4 border-t border-[#20364A] pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9AABBB] truncate pr-2">{proj.departmentName}</span>
                      <span className="font-mono font-semibold text-[#19C98A] tabular-nums">
                        {proj.progressPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#07111F]">
                      <div
                        className="h-full rounded-full bg-[#19C98A]"
                        style={{ width: `${proj.progressPercent}%` }}
                      />
                    </div>
                    <a
                      href={proj.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#36C5D9] hover:underline"
                    >
                      <span>Source: {proj.sourceName}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY & KNOWLEDGE HUB */}
      <section className="border-b border-[#20364A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Community */}
            <div className="lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-[#F4F8FC]">Civic Community Pulse</h2>
                <Link to="/community" className="text-xs font-semibold text-[#19C98A] hover:text-[#48E6B0]">
                  All Discussions →
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {discussions.map((d) => (
                  <Link
                    key={d.id}
                    to="/community"
                    className="block rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
                  >
                    <div className="text-xs text-[#9AABBB]">
                      <span>{d.localityName}, {d.city}</span>
                      <span className="mx-1.5">·</span>
                      <span>{d.category}</span>
                      {d.isDemo && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[#36C5D9]">Demonstration Record</span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-[#F4F8FC]">{d.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9AABBB] line-clamp-2">{d.body}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-[#9AABBB] font-mono tabular-nums">
                      <span>{d.supportCount} supports</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {d.comments.length} replies
                      </span>
                      <span>{formatShortDate(d.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Knowledge Hub */}
            <div className="lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-[#F4F8FC]">Civic Knowledge Hub</h2>
                <Link to="/knowledge" className="text-xs font-semibold text-[#19C98A] hover:text-[#48E6B0]">
                  Explore Library →
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {articles.map((art) => (
                  <Link
                    key={art.id}
                    to={`/knowledge?article=${encodeURIComponent(art.slug)}`}
                    className="block rounded-xl border border-[#20364A] bg-[#102338] p-5 transition-colors hover:border-[#19C98A]"
                  >
                    <div className="text-xs text-[#9AABBB]">
                      <span>{art.category}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-mono">{art.readTimeMinutes} min read</span>
                      <span className="mx-1.5">·</span>
                      <span>EN / KN / HI</span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-[#F4F8FC]">{art.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9AABBB] line-clamp-2">{art.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#19C98A]">
            <Building2 className="h-4 w-4" />
            <span>CivicLens — See Your City. Understand Your Community.</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-[#F4F8FC] sm:text-5xl">
            Your City. Your Voice. Your Responsibility.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#9AABBB]">
            Start exploring civic conditions in Bengaluru and across India, check government directories, or submit a
            documented issue in your neighborhood.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/explore"
              className="rounded-lg bg-[#19C98A] px-6 py-3 text-sm font-semibold text-[#07111F] transition-colors hover:bg-[#48E6B0]"
            >
              Start Exploring CivicLens
            </Link>
            <Link
              to="/report"
              className="rounded-lg border border-[#20364A] bg-[#102338] px-6 py-3 text-sm font-semibold text-[#F4F8FC] transition-colors hover:border-[#19C98A]"
            >
              Report a Civic Problem
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
