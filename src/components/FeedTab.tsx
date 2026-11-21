import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronRight,
  Cpu,
  ExternalLink,
  FolderGit2,
  Github,
  Globe,
  HeartPulse,
  Leaf,
  Lightbulb,
  Lock,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { fetchFeedIdeas, fetchIdeaById, fetchPublishedProjects } from '../api';
import {
  IDEA_DOMAINS,
  type IdeaDomain,
  type IdeaFeedItem,
  type IdeaFullDetail,
  type StudentProjectItem,
} from '../types';

interface FeedTabProps {
  refreshKey: number;
  onRequestPost: () => void;
  onRequestPostProject?: () => void;
}

const BRIDGEY_MASCOT_URL = '/src/assets/images/bridgey_owl_mascot_1795263067390.jpg';

function getDomainVisual(domain: IdeaDomain) {
  switch (domain) {
    case 'Environment':
      return {
        icon: Leaf,
        gradient: 'from-emerald-50 via-teal-50 to-sky-50',
        iconBg: 'bg-emerald-100 text-emerald-700',
        accent: 'text-emerald-700',
      };
    case 'Health':
      return {
        icon: HeartPulse,
        gradient: 'from-rose-50 via-sky-50 to-blue-50',
        iconBg: 'bg-rose-100 text-rose-700',
        accent: 'text-rose-700',
      };
    case 'Education':
      return {
        icon: BookOpen,
        gradient: 'from-indigo-50 via-blue-50 to-sky-50',
        iconBg: 'bg-indigo-100 text-indigo-700',
        accent: 'text-indigo-700',
      };
    case 'FinTech':
      return {
        icon: Wallet,
        gradient: 'from-amber-50 via-orange-50 to-blue-50',
        iconBg: 'bg-amber-100 text-amber-700',
        accent: 'text-amber-700',
      };
    case 'Campus Tech':
      return {
        icon: Cpu,
        gradient: 'from-blue-50 via-sky-50 to-indigo-50',
        iconBg: 'bg-blue-100 text-blue-700',
        accent: 'text-blue-700',
      };
    default:
      return {
        icon: Globe,
        gradient: 'from-sky-50 via-blue-50 to-slate-50',
        iconBg: 'bg-sky-100 text-sky-700',
        accent: 'text-sky-700',
      };
  }
}

export function FeedTab({
  refreshKey,
  onRequestPost,
  onRequestPostProject,
}: FeedTabProps) {
  const [feedMode, setFeedMode] = useState<'ideas' | 'projects'>('ideas');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [ideas, setIdeas] = useState<IdeaFeedItem[]>([]);
  const [projects, setProjects] = useState<StudentProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<IdeaFeedItem | IdeaFullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const feedSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (feedMode === 'ideas') {
      fetchFeedIdeas({ q: debouncedQuery, domain: selectedDomain })
        .then((res) => {
          if (active) {
            setIdeas(res.ideas);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err instanceof Error ? err.message : 'Unable to load ideas.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      fetchPublishedProjects({ q: debouncedQuery, domain: selectedDomain })
        .then((res) => {
          if (active) {
            setProjects(res.projects);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err instanceof Error ? err.message : 'Unable to load built projects.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [feedMode, debouncedQuery, selectedDomain, refreshKey]);

  async function openIdeaPreview(idea: IdeaFeedItem) {
    setActiveIdeaId(idea.id);
    setDetailData(idea);
    setDetailLoading(true);
    try {
      const res = await fetchIdeaById(idea.id);
      setDetailData(res.idea);
    } catch {
      // Keep base preview item if detail fetch fails
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setActiveIdeaId(null);
    setDetailData(null);
  }

  const domains = ['All', ...IDEA_DOMAINS];

  return (
    <div className="space-y-6">
      {/* Hero Banner matching IdeaBridge Design System */}
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-[#EAF2FF] via-[#F4F8FF] to-white p-5 shadow-xs sm:p-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="max-w-xl text-center md:text-left">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              IdeaBridge
              <span className="mt-1 block text-lg font-semibold text-[#0052CC] sm:text-2xl">
                A Student Project Idea Marketplace
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Discover and share impactful student project ideas, explore Smart India Hackathon
              challenges, and find nearby campus events with Bridgey.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                onClick={() =>
                  feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0043A8] whitespace-nowrap"
              >
                <span>Explore Ideas</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRequestPost}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0052CC] transition-colors hover:bg-blue-50 whitespace-nowrap"
              >
                Post an Idea
              </button>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center justify-center">
            <div className="h-36 w-36 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-md sm:h-44 sm:w-44">
              {!heroImgFailed ? (
                <img
                  src={BRIDGEY_MASCOT_URL}
                  alt="Bridgey the IdeaBridge owl mascot"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-50 font-display text-xl font-bold text-[#0052CC]">
                  Bridgey
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search + Domain Filter Controls */}
      <section ref={feedSectionRef} className="space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
              {feedMode === 'ideas' ? 'Explore Project Ideas' : 'Published Student Projects'}
            </h2>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setFeedMode('ideas')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  feedMode === 'ideas'
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Ideas</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedMode('projects')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  feedMode === 'projects'
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>Projects</span>
              </button>
            </div>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                feedMode === 'ideas'
                  ? 'Search ideas, domains, keywords...'
                  : 'Search built projects, builders, domains...'
              }
              aria-label="Search marketplace"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div
          className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter ideas by domain"
        >
          {domains.map((domain) => {
            const active = selectedDomain === domain;
            const visual = domain === 'All' ? null : getDomainVisual(domain as IdeaDomain);
            const DomainIcon = visual?.icon;
            return (
              <button
                key={domain}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedDomain(domain)}
                className={`inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap sm:text-sm ${
                  active
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-[#0052CC]'
                }`}
              >
                {DomainIcon && <DomainIcon className="h-3.5 w-3.5 shrink-0" />}
                <span>{domain}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="h-24 rounded-xl bg-slate-100" />
              <div className="mt-4 h-5 w-4/5 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      ) : feedMode === 'projects' ? (
        projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              No published projects yet
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Students who upload a PDF resume can publish completed builds here. Builders with a
              Portfolio Complete badge rank first.
            </p>
            {onRequestPostProject && (
              <button
                type="button"
                onClick={onRequestPostProject}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0043A8]"
              >
                Post a Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((proj) => {
              const visual = getDomainVisual(proj.domain);
              const DomainIcon = visual.icon;
              return (
                <article
                  key={proj.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                >
                  <div>
                    <div
                      className={`flex items-center justify-between bg-gradient-to-r ${visual.gradient} px-5 py-4`}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${visual.iconBg} shadow-xs`}
                      >
                        <DomainIcon className="h-5 w-5" />
                      </div>
                      {proj.builder_portfolio_complete && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <Award className="h-3.5 w-3.5" />
                          <span>Portfolio Complete</span>
                        </span>
                      )}
                    </div>

                    <div className="p-5 pb-3">
                      <p className={`text-xs font-semibold ${visual.accent}`}>
                        {proj.domain} · {proj.difficulty}
                      </p>
                      <h3 className="mt-1.5 font-display text-base leading-snug font-bold text-slate-900 sm:text-lg">
                        {proj.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {proj.description}
                      </p>
                      <p className="mt-3 font-mono text-xs text-slate-500">
                        {proj.tech_stack.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="mx-5 mt-2 space-y-3 border-t border-slate-100 py-3.5 text-xs text-slate-500">
                    <p className="truncate font-medium text-slate-700">
                      {proj.builder_name} · {proj.builder_college}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={proj.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800 hover:border-blue-300 hover:text-[#0052CC]"
                      >
                        <Github className="h-3.5 w-3.5" />
                        <span>GitHub</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                      {proj.demo_url && (
                        <a
                          href={proj.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-[#0052CC] hover:bg-blue-100"
                        >
                          <span>Demo</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            No matching ideas found
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Try clearing your search or selecting another domain filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => {
            const visual = getDomainVisual(idea.domain);
            const DomainIcon = visual.icon;
            return (
              <button
                key={idea.id}
                type="button"
                onClick={() => openIdeaPreview(idea)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xs transition-all hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052CC]"
              >
                <div>
                  {/* Domain Visual Strip */}
                  <div
                    className={`flex items-center justify-between bg-gradient-to-r ${visual.gradient} px-5 py-4`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${visual.iconBg} shadow-xs`}
                    >
                      <DomainIcon className="h-5 w-5" />
                    </div>
                    {!idea.is_owner && (
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-500"
                        title="Full blueprint locked"
                      >
                        <Lock className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="p-5 pb-3">
                    {/* Clean unboxed typographic metadata */}
                    <p className={`text-xs font-semibold ${visual.accent}`}>
                      {idea.domain} · {idea.difficulty}
                    </p>

                    <h3 className="mt-1.5 font-display text-base leading-snug font-bold text-slate-900 group-hover:text-[#0052CC] sm:text-lg">
                      {idea.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {idea.summary}
                    </p>
                  </div>
                </div>

                <div className="mx-5 mt-2 flex items-center justify-between border-t border-slate-100 py-3.5 text-xs text-slate-500">
                  <span className="truncate pr-2">
                    {idea.author_name} · {idea.author_college}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0052CC] whitespace-nowrap">
                    {idea.is_owner ? 'Open blueprint' : 'View idea'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Idea Preview Sheet / Modal */}
      {activeIdeaId && detailData && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="idea-modal-title"
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const visual = getDomainVisual(detailData.domain);
              const DomainIcon = visual.icon;
              return (
                <div
                  className={`relative flex items-center justify-between bg-gradient-to-r ${visual.gradient} px-6 py-5`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${visual.iconBg} shadow-xs`}
                    >
                      <DomainIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${visual.accent}`}>
                        {detailData.domain} · {detailData.difficulty}
                      </p>
                      <p className="text-xs text-slate-600">
                        By {detailData.author_name} ({detailData.author_college})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close preview"
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-white/85 text-slate-600 hover:bg-white hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              );
            })()}

            <div className="p-6 sm:p-7">
              <h2
                id="idea-modal-title"
                className="font-display text-xl font-bold text-slate-900 sm:text-2xl"
              >
                {detailData.title}
              </h2>

              <div className="mt-4">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  About the Idea
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 sm:text-base">
                  {detailData.summary}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                {detailLoading ? (
                  <p className="text-sm text-slate-500">Checking blueprint visibility...</p>
                ) : !detailData.locked && 'problem' in detailData ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                        Problem it solves
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">
                        {detailData.problem}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                        Purpose
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">
                        {detailData.purpose}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                        Who will use it
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">
                        {detailData.target_users}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                        Suggested tech stack
                      </h3>
                      <p className="mt-1 font-mono text-sm text-[#0052CC]">
                        {detailData.tech_stack.join(' · ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0052CC] text-white">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                      Full Idea Details Are Locked
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      Problem breakdown, purpose, target users, and suggested tech stack stay
                      protected until paid marketplace unlocks are enabled in the next stage.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
