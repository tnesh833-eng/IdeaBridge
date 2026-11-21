import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  ChevronRight,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import {
  claimAdminRole,
  fetchAdminStatus,
  fetchSihProblemDetail,
  fetchSihProblems,
  generateMoreSihIdeas,
  importSihSpreadsheet,
  saveSihIdea,
  unsaveSihIdea,
} from '../api';
import type {
  AdminStatusInfo,
  IdeaDomain,
  PostIdeaPrefill,
  SihProblemDetail,
  SihProblemListItem,
  SihUniqueIdea,
  UserProfile,
} from '../types';

interface SihProblemsTabProps {
  user: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
  onRequireAuth: () => void;
  onTurnIntoPost: (prefill: PostIdeaPrefill) => void;
  onOpenNearby?: () => void;
}

function mapCategoryToDomain(category: string): IdeaDomain {
  const lower = category.toLowerCase();
  if (lower.includes('green') || lower.includes('clean') || lower.includes('env') || lower.includes('agri') || lower.includes('water')) {
    return 'Environment';
  }
  if (lower.includes('health') || lower.includes('med') || lower.includes('bio')) {
    return 'Health';
  }
  if (lower.includes('ed') || lower.includes('learn') || lower.includes('student') || lower.includes('skill')) {
    return 'Education';
  }
  if (lower.includes('fin') || lower.includes('pay') || lower.includes('cyber') || lower.includes('bank')) {
    return 'FinTech';
  }
  if (lower.includes('campus') || lower.includes('auto') || lower.includes('smart')) {
    return 'Campus Tech';
  }
  return 'Civic';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function SihProblemsTab({
  user,
  onUserUpdated,
  onRequireAuth,
  onTurnIntoPost,
  onOpenNearby,
}: SihProblemsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [problems, setProblems] = useState<SihProblemListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // Admin spreadsheet import drawer state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatusInfo | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Problem Detail screen state
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [detailProblem, setDetailProblem] = useState<SihProblemDetail | null>(null);
  const [detailIdeas, setDetailIdeas] = useState<SihUniqueIdea[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [remainingToday, setRemainingToday] = useState<number>(3);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError(null);

    fetchSihProblems({ q: debouncedQuery, category: selectedCategory })
      .then((res) => {
        if (active) {
          setProblems(res.problems);
          setCategories(res.categories);
        }
      })
      .catch((err) => {
        if (active) {
          setListError(err instanceof Error ? err.message : 'Unable to load SIH problems.');
        }
      })
      .finally(() => {
        if (active) setListLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, selectedCategory, listRefreshKey]);

  useEffect(() => {
    if (!showAdminPanel || !user) return;
    let active = true;
    setAdminLoading(true);
    fetchAdminStatus()
      .then((status) => {
        if (active) setAdminStatus(status);
      })
      .catch(() => {
        // Ignore non-fatal status fetch error
      })
      .finally(() => {
        if (active) setAdminLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showAdminPanel, user?.id, user?.role]);

  async function openProblemDetail(problemId: string) {
    setSelectedProblemId(problemId);
    setDetailProblem(null);
    setDetailIdeas([]);
    setDetailError(null);
    setAiError(null);
    setActionNotice(null);
    setDetailLoading(true);

    try {
      const res = await fetchSihProblemDetail(problemId);
      setDetailProblem(res.problem);
      setDetailIdeas(res.ideas);
      setAiError(res.aiError);
      setRemainingToday(res.remainingToday);
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to load problem statement.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleGenerateMore() {
    if (!detailProblem) return;
    if (!user) {
      setActionNotice('Please sign in first to generate additional ideas (3 runs per day).');
      return;
    }

    setGeneratingMore(true);
    setActionNotice(null);
    setAiError(null);

    try {
      const res = await generateMoreSihIdeas(detailProblem.id);
      setDetailIdeas(res.ideas);
      setRemainingToday(res.remainingToday);
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate more ideas.');
    } finally {
      setGeneratingMore(false);
    }
  }

  async function handleToggleSaveIdea(idea: SihUniqueIdea) {
    if (!user) {
      setActionNotice('Sign in to save SIH ideas to your My Projects tab.');
      return;
    }

    setSavingIdeaId(idea.id);
    setActionNotice(null);
    try {
      if (idea.is_saved) {
        await unsaveSihIdea(idea.id);
      } else {
        await saveSihIdea(idea.id);
      }
      setDetailIdeas((prev) =>
        prev.map((item) =>
          item.id === idea.id ? { ...item, is_saved: !idea.is_saved } : item
        )
      );
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'Could not update saved state.');
    } finally {
      setSavingIdeaId(null);
    }
  }

  function handleConvertIdea(idea: SihUniqueIdea) {
    if (!detailProblem) return;
    onTurnIntoPost({
      title: idea.title.slice(0, 120),
      summary: idea.description.slice(0, 240),
      problem: `Built for ${detailProblem.problem_id} (${detailProblem.organization}): ${detailProblem.description}`.slice(
        0,
        2000
      ),
      domain: mapCategoryToDomain(detailProblem.category),
      difficulty: idea.difficulty,
      tech_stack: idea.tech_stack.slice(0, 10),
      sourceLabel: `${detailProblem.problem_id} · ${detailProblem.title}`,
    });
  }

  async function handleClaimAdmin(event: FormEvent) {
    event.preventDefault();
    setAdminError(null);
    setAdminMessage(null);
    setAdminLoading(true);
    try {
      const res = await claimAdminRole(passcodeInput);
      onUserUpdated(res.user);
      setPasscodeInput('');
      setAdminMessage('Admin access enabled. You can now import SIH spreadsheets.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Admin verification failed.');
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAdminError(null);
    setAdminMessage(null);
    setUploading(true);

    try {
      const contentBase64 = await fileToBase64(file);
      const res = await importSihSpreadsheet({
        filename: file.name,
        contentBase64,
      });
      setAdminMessage(
        `Imported ${res.inserted} new and updated ${res.updated} SIH problem statements${res.skipped > 0 ? ` (${res.skipped} skipped)` : ''}.`
      );
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Spreadsheet import failed.');
    } finally {
      setUploading(false);
    }
  }

  function downloadCsvTemplate() {
    const sample = [
      'problem_id,title,organization,category,description',
      '"SIH1701","Automated Campus Water Leak & Pipeline Telemetry","Ministry of Jal Shakti","Clean & Green Technology","Detect underground pipe leaks across campus blocks using smart flow sensors and generate maintenance alerts."',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sih_problems_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // --- Detail Screen View ---
  if (selectedProblemId) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setSelectedProblemId(null);
            setDetailProblem(null);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to SIH Problems</span>
        </button>

        {detailLoading ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-7 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 text-sm text-blue-900">
              Loading problem statement and generating Unique Ideas if this is the first visit...
            </div>
          </div>
        ) : detailError || !detailProblem ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <p className="text-sm font-medium text-red-700">
              {detailError ?? 'Unable to load problem statement.'}
            </p>
          </div>
        ) : (
          <>
            {/* Full Problem Statement */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-700">
                <span className="font-mono font-semibold">{detailProblem.problem_id}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>{detailProblem.category}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-600">{detailProblem.organization}</span>
              </div>

              <h1 className="mt-2.5 font-display text-xl leading-snug font-bold text-slate-900 sm:text-2xl">
                {detailProblem.title}
              </h1>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <h2 className="text-xs font-semibold tracking-wide text-slate-500">
                  Full Problem Statement
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-800 sm:text-base">
                  {detailProblem.description}
                </p>
              </div>
            </section>

            {/* Unique Ideas Section */}
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
                    Unique Ideas
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Generated once and saved for all students. Save an idea or turn it into a
                    marketplace project post.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={generatingMore || (Boolean(user) && remainingToday <= 0)}
                  onClick={handleGenerateMore}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap"
                >
                  <RefreshCw className={`h-4 w-4 ${generatingMore ? 'animate-spin' : ''}`} />
                  <span>
                    {generatingMore
                      ? 'Generating...'
                      : user
                        ? `Generate more ideas (${remainingToday}/3 left today)`
                        : 'Generate more ideas'}
                  </span>
                </button>
              </div>

              {actionNotice && (
                <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>{actionNotice}</span>
                  {!user && (
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="min-h-[40px] shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}

              {aiError && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>{aiError}</span>
                  <button
                    type="button"
                    onClick={() => openProblemDetail(detailProblem.id)}
                    className="min-h-[40px] shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap"
                  >
                    Retry
                  </button>
                </div>
              )}

              {detailIdeas.length === 0 && !aiError ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                  No cached ideas available yet for this problem statement.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {detailIdeas.map((idea) => (
                    <article
                      key={idea.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                          <span>{idea.difficulty}</span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="truncate font-mono text-slate-500">
                            {idea.tech_stack.join(' · ')}
                          </span>
                        </div>

                        <h3 className="mt-2 font-display text-lg leading-snug font-semibold text-slate-900">
                          {idea.title}
                        </h3>

                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {idea.description}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          disabled={savingIdeaId === idea.id}
                          onClick={() => handleToggleSaveIdea(idea)}
                          className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                            idea.is_saved
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark
                            className="h-3.5 w-3.5"
                            fill={idea.is_saved ? 'currentColor' : 'none'}
                          />
                          <span>{idea.is_saved ? 'Saved' : 'Save Idea'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConvertIdea(idea)}
                          className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
                        >
                          <span>Turn into Project Post</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    );
  }

  // --- List View ---
  const filterCategories = ['All', ...categories];

  return (
    <div className="space-y-6">
      {/* Royal-Blue SIH Hero Header */}
      <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#0052CC] via-[#0B63E5] to-[#2563EB] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Smart India Hackathon (SIH)
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-blue-100 sm:text-base">
            Explore real problem statements by category and organization. Open any challenge to view
            5 cached AI solution ideas ready to save or turn into a post.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAdminPanel((prev) => !prev);
            setAdminError(null);
            setAdminMessage(null);
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0052CC] shadow-xs transition-colors hover:bg-blue-50 whitespace-nowrap"
        >
          <FileSpreadsheet className="h-4 w-4 text-[#0052CC]" />
          <span>{showAdminPanel ? 'Close Import' : 'Admin Import'}</span>
        </button>
      </section>

      {/* Admin-Only Spreadsheet Import Panel */}
      {showAdminPanel && (
        <section className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Admin Problem Statement Import
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Upload an <span className="font-mono text-xs">.xlsx</span> or{' '}
                  <span className="font-mono text-xs">.csv</span> spreadsheet with columns:{' '}
                  <span className="font-mono text-xs text-slate-800">
                    problem_id, title, organization, category, description
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV Template</span>
            </button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            {!user ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Sign in with an admin account to upload problem statements.
                </p>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="min-h-[42px] shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            ) : user.role !== 'admin' ? (
              <form onSubmit={handleClaimAdmin} className="space-y-3">
                <p className="text-sm text-slate-700">
                  {adminStatus?.envPasscodeConfigured
                    ? 'Enter the configured admin passcode to unlock spreadsheet imports.'
                    : adminStatus?.adminClaimed
                      ? 'Enter the admin passcode to verify admin access for this account.'
                      : 'First-run admin setup: choose a passcode (8+ characters) to claim admin access for uploading SIH spreadsheets.'}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Admin passcode (min 8 characters)"
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="min-h-[44px] shrink-0 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    {adminLoading
                      ? 'Verifying...'
                      : adminStatus?.adminClaimed || adminStatus?.envPasscodeConfigured
                        ? 'Unlock Admin'
                        : 'Claim Admin Access'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Admin verified ({user.email}). New Problem IDs are added and existing IDs are
                  updated automatically.
                </p>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? 'Importing...' : 'Upload .xlsx / .csv'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            )}

            {adminMessage && (
              <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900">
                {adminMessage}
              </p>
            )}
            {adminError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {adminError}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Search + Category Filter */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Problem ID, title, or organization..."
            aria-label="Search SIH problem statements"
            className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
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

        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter SIH problems by category"
        >
          {filterCategories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Problem Cards Grid */}
      {listLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-5 w-4/5 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : listError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center text-sm text-red-700">
          {listError}
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            No matching SIH problems
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Try clearing your search or selecting another category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-9">
            {problems.map((problem) => (
              <button
                key={problem.id}
                type="button"
                onClick={() => openProblemDetail(problem.id)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052CC]"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0052CC]">
                    <span className="font-mono font-semibold">{problem.problem_id}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="truncate text-slate-600">{problem.category}</span>
                  </div>

                  <h2 className="mt-2 font-display text-lg leading-snug font-semibold text-slate-900 group-hover:text-[#0052CC]">
                    {problem.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">{problem.organization}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                  <span className="tabular-nums">
                    {problem.ideas_initialized
                      ? `${problem.ideas_count} unique ideas ready`
                      : 'Tap to generate 5 ideas'}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0052CC] whitespace-nowrap">
                    Open
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-[#EAF2FF] to-white p-5 text-center shadow-xs">
              <img
                src="/src/assets/images/bridgey_owl_mascot_1795263067390.jpg"
                alt="Bridgey mascot"
                referrerPolicy="no-referrer"
                className="mx-auto h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-xs"
              />
              <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                Hi! I&apos;m Bridgey
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Need tips for presenting your SIH solution or finding nearby campus hackathons?
              </p>
              {onOpenNearby && (
                <button
                  type="button"
                  onClick={onOpenNearby}
                  className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8]"
                >
                  Ask Bridgey at Events
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
