import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookmarkMinus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderGit2,
  Github,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  deleteOwnIdea,
  deleteOwnProject,
  fetchMyIdeas,
  fetchMyProjects,
  fetchSavedSihIdeas,
  unsaveSihIdea,
} from '../api';
import type {
  IdeaDomain,
  IdeaFullDetail,
  PostIdeaPrefill,
  SavedSihIdeaWithProblem,
  StudentProjectItem,
  UserProfile,
} from '../types';
import { AuthScreen } from './AuthScreen';
import { ResumeManagerCard } from './ResumeManagerCard';

interface MyProjectsTabProps {
  user: UserProfile | null;
  onAuthenticated: (user: UserProfile) => void;
  onUserUpdated: (user: UserProfile) => void;
  onNavigatePost: () => void;
  onNavigatePostProject: () => void;
  onTurnSihIdeaIntoPost: (prefill: PostIdeaPrefill) => void;
}

function mapCategoryToDomain(category: string): IdeaDomain {
  const lower = category.toLowerCase();
  if (lower.includes('green') || lower.includes('clean') || lower.includes('env') || lower.includes('agri') || lower.includes('water')) {
    return 'Environment';
  }
  if (lower.includes('health') || lower.includes('med') || lower.includes('bio')) {
    return 'Health';
  }
  if (lower.includes('ed') || lower.includes('learn') || lower.includes('student')) {
    return 'Education';
  }
  if (lower.includes('fin') || lower.includes('pay') || lower.includes('cyber')) {
    return 'FinTech';
  }
  if (lower.includes('campus') || lower.includes('auto') || lower.includes('smart')) {
    return 'Campus Tech';
  }
  return 'Civic';
}

export function MyProjectsTab({
  user,
  onAuthenticated,
  onUserUpdated,
  onNavigatePost,
  onNavigatePostProject,
  onTurnSihIdeaIntoPost,
}: MyProjectsTabProps) {
  const [projects, setProjects] = useState<StudentProjectItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaFullDetail[]>([]);
  const [savedSihIdeas, setSavedSihIdeas] = useState<SavedSihIdeaWithProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showResumeUploader, setShowResumeUploader] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchMyProjects(), fetchMyIdeas(), fetchSavedSihIdeas()])
      .then(([projRes, myRes, savedRes]) => {
        if (active) {
          setProjects(projRes.projects);
          setIdeas(myRes.ideas);
          setSavedSihIdeas(savedRes.savedIdeas);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load your projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.has_resume]);

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={onAuthenticated}
        contextMessage="Sign in to manage your published projects, uploaded resume, posted ideas, and saved SIH ideas."
      />
    );
  }

  async function handleDeleteIdea(ideaId: string) {
    setDeletingId(ideaId);
    try {
      const result = await deleteOwnIdea(ideaId);
      setIdeas((prev) => prev.filter((item) => item.id !== ideaId));
      setConfirmDeleteId(null);
      onUserUpdated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete idea.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteProject(projectId: string) {
    setDeletingProjectId(projectId);
    try {
      const result = await deleteOwnProject(projectId);
      setProjects((prev) => prev.filter((item) => item.id !== projectId));
      setConfirmDeleteProjectId(null);
      onUserUpdated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project.');
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleRemoveSavedSihIdea(ideaId: string) {
    try {
      await unsaveSihIdea(ideaId);
      setSavedSihIdeas((prev) => prev.filter((item) => item.id !== ideaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove saved idea.');
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            My Projects & Ideas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish built projects (requires PDF resume), review your posted ideas, and manage saved
            SIH ideas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigatePost}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Idea</span>
          </button>

          {user.has_resume ? (
            <button
              type="button"
              onClick={onNavigatePostProject}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0043A8] whitespace-nowrap"
            >
              <FolderGit2 className="h-4 w-4" />
              <span>Post Project</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Upload a PDF resume first to publish a project"
                className="inline-flex min-h-[44px] shrink-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 whitespace-nowrap"
              >
                <Lock className="h-4 w-4" />
                <span>Post Project</span>
              </button>
              <button
                type="button"
                onClick={() => setShowResumeUploader((prev) => !prev)}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0043A8] whitespace-nowrap"
              >
                <span>Upload resume now</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Resume Gate Notice or Uploader */}
      {(!user.has_resume || showResumeUploader) && (
        <ResumeManagerCard
          user={user}
          onUserUpdated={(updated) => {
            onUserUpdated(updated);
            if (updated.has_resume) {
              setShowResumeUploader(false);
            }
          }}
          compact
          highlightPrompt={!user.has_resume}
        />
      )}

      {/* Published Projects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Published Projects
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {projects.length} total
          </span>
        </div>

        {loading ? (
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {user.has_resume ? (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <span>
                  Your PDF resume is ready. Publish your first completed project with a GitHub link.
                </span>
                <button
                  type="button"
                  onClick={onNavigatePostProject}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0043A8] whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Post Project</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <span>
                  Upload a PDF resume (max 5 MB) to unlock project publishing. Ideas can still be
                  posted freely without a resume.
                </span>
                <button
                  type="button"
                  onClick={() => setShowResumeUploader(true)}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0043A8] whitespace-nowrap"
                >
                  <span>Upload resume now</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((proj) => {
              const confirmingDelete = confirmDeleteProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0052CC]">
                        {proj.domain} · {proj.difficulty}
                      </span>
                      {proj.is_published_live ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Published Live
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          Hidden until resume uploaded
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
                      {proj.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {proj.description}
                    </p>
                    <p className="mt-3 font-mono text-xs text-slate-500">
                      {proj.tech_stack.join(' · ')}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={proj.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:text-[#0052CC]"
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
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0052CC] hover:bg-blue-100"
                        >
                          <span>Demo</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {confirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProjectId(null)}
                          className="min-h-[36px] rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deletingProjectId === proj.id}
                          onClick={() => void handleDeleteProject(proj.id)}
                          className="min-h-[36px] rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingProjectId === proj.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProjectId(proj.id)}
                        aria-label={`Delete ${proj.title}`}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved SIH Ideas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Saved SIH Ideas
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {savedSihIdeas.length} saved
          </span>
        </div>

        {loading ? (
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : savedSihIdeas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No saved SIH ideas yet. Open any challenge in the{' '}
            <span className="font-medium text-slate-900">SIH Problems</span> tab to save generated
            solution ideas here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {savedSihIdeas.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                    <span className="font-mono font-semibold">{item.sih_problem_code}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{item.difficulty}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="truncate font-mono text-slate-500">
                      {item.tech_stack.join(' · ')}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveSavedSihIdea(item.id)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <BookmarkMinus className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onTurnSihIdeaIntoPost({
                        title: item.title.slice(0, 120),
                        summary: item.description.slice(0, 240),
                        problem: `Built for ${item.sih_problem_code} (${item.sih_problem_organization}): ${item.sih_problem_description}`.slice(
                          0,
                          2000
                        ),
                        domain: mapCategoryToDomain(item.sih_problem_category),
                        difficulty: item.difficulty,
                        tech_stack: item.tech_stack.slice(0, 10),
                        sourceLabel: `${item.sih_problem_code} · ${item.sih_problem_title}`,
                      })
                    }
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0052CC] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0044AD] whitespace-nowrap"
                  >
                    <span>Turn into Project Post</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ideas Posted by User */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Ideas You Posted
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {ideas.length} total
          </span>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700">
            {error}
          </div>
        ) : ideas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center">
            <p className="text-sm font-medium text-slate-800">
              You have not posted any ideas yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Share a real-world problem and suggested tech stack — posting an idea is open to
              everyone with no resume needed.
            </p>
            <button
              type="button"
              onClick={onNavigatePost}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0052CC] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0044AD]"
            >
              Post Your First Idea
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => {
              const expanded = expandedId === idea.id;
              const confirmingDelete = confirmDeleteId === idea.id;

              return (
                <div
                  key={idea.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                        <span>{idea.domain}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-500">{idea.difficulty}</span>
                      </div>
                      <h3 className="mt-1.5 font-display text-lg font-semibold text-slate-900">
                        {idea.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {idea.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : idea.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Hide details' : 'Show full details'}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          Problem it solves
                        </span>
                        <p className="mt-0.5 text-slate-800">{idea.problem}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500">Purpose</span>
                        <p className="mt-0.5 text-slate-800">{idea.purpose}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          Who will use it
                        </span>
                        <p className="mt-0.5 text-slate-800">{idea.target_users}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          Suggested tech stack
                        </span>
                        <p className="mt-0.5 font-mono text-xs text-blue-700">
                          {idea.tech_stack.join(' · ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        {confirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === idea.id}
                              onClick={() => void handleDeleteIdea(idea.id)}
                              className="min-h-[40px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {deletingId === idea.id ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(idea.id)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Idea</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
